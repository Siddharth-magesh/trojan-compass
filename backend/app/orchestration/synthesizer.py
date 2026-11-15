"""Synthesizer: one LLM call writes prose over verified facts; output schema check, one format retry, then a code-built answer."""

import json
import re
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field

from backend.app.llm_gateway import mock_llm
from backend.app.llm_gateway.budget import BudgetExceeded, RequestBudget
from backend.app.llm_gateway.gateway import LLMFormatError, LLMUnavailable, call_json
from backend.app.schemas.response import StructuredResponse

PROMPT = (Path(__file__).resolve().parents[1] / "agents/prompts/synthesizer.md").read_text(encoding="utf-8")
NUMBER = re.compile(r"\d+(?:\.\d+)?")


class SynthDraft(BaseModel):
    answer: str = Field(min_length=1, max_length=2500)
    answered: bool = True  # False when the retrieved facts do not answer the question


def _payload(message: str, verified: dict[str, Any]) -> dict[str, Any]:
    return {"question": message, "facts": verified["facts"][:25], "unknowns": verified["unknowns"][:10],
            "domain_status": {k: v["status"] for k, v in verified["partial_status"]["agents"].items()},
            "cards_shown": [c.get("title") or c.get("name") or c.get("course_id") for c in verified["cards"]]}


def _grounded(answer: str, payload: dict[str, Any]) -> bool:
    """Every number in the prose must already appear in the question, facts or unknowns (cheap hallucination check)."""
    allowed = set(NUMBER.findall(json.dumps(payload)))
    return set(NUMBER.findall(answer)) <= allowed and "http" not in answer


def code_answer(verified: dict[str, Any]) -> str:
    """Deterministic answer used when the LLM is unavailable or its output fails the checks."""
    lines = ["Here is what I found in USC's verified data:"]
    lines += [f"- {f.split('] ', 1)[-1]}" for f in verified["facts"][:8]]
    if verified["unknowns"]:
        lines.append("Not known or not collected yet:")
        lines += [f"- {u.split('] ', 1)[-1]}" for u in verified["unknowns"][:5]]
    return "\n".join(lines)[:2500]


@mock_llm.register("synthesizer")
def _mock(messages: list[dict[str, Any]], tools: list[dict[str, Any]] | None) -> dict[str, Any]:
    first_input = next(m["content"] for m in messages if m["role"] == "user" and m["content"].startswith("Input: "))
    payload = json.loads(first_input.split("Input: ", 1)[1])
    facts = [f.split("] ", 1)[-1] for f in payload["facts"][:4]]
    return {"content": json.dumps({"answer": "Here is a summary of what I found. " + " ".join(facts)}), "tool_calls": []}


def synthesize(request_id: str, message: str, verified: dict[str, Any], budget: RequestBudget) -> StructuredResponse:
    payload = _payload(message, verified)
    messages = [{"role": "system", "content": PROMPT}, {"role": "user", "content": f"Input: {json.dumps(payload)}"}]
    answer, answered = None, True
    for attempt in range(2):  # first try + one formatting retry
        try:
            draft = call_json("synthesizer", messages, SynthDraft, budget, temperature=0.3)
        except (LLMFormatError, LLMUnavailable, BudgetExceeded):
            if attempt == 0:
                continue
            break
        if _grounded(draft.answer, payload):
            answer, answered = draft.answer, draft.answered
            break
        messages = messages + [{"role": "user", "content": "Use only numbers present in the facts and no URLs. Reply with the JSON object only."}]
    citations, partial = verified["citations"], verified["partial_status"]
    if not answered:
        # Keep only citations that back a card; passages that did not answer the question must not look like support.
        card_urls = {c["source"]["url"] for c in verified["cards"] if "source" in c} | \
                    {i["source"]["url"] for c in verified["cards"] for i in c.get("items", [])}
        citations = [c for c in citations if c["url"] in card_urls]
        partial = {**partial, "overall": "partial"}
    return StructuredResponse(request_id=request_id, response_type="answer", answer=answer or code_answer(verified),
                              cards=verified["cards"], citations=citations,
                              freshness_notes=verified["freshness_notes"], partial_status=partial)
