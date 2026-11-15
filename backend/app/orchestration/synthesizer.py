"""Synthesizer: one LLM call writes short Markdown over verified, numbered facts ([n] citations) plus follow-ups.

Code numbers the sources, checks every number and marker in the prose, and falls back to a code-built answer.
"""

import json
import re
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field

from backend.app.config.settings import settings
from backend.app.llm_gateway import mock_llm
from backend.app.llm_gateway.budget import BudgetExceeded, RequestBudget
from backend.app.llm_gateway.gateway import LLMFormatError, LLMUnavailable, call_json
from backend.app.schemas.response import StructuredResponse

PROMPT = (Path(__file__).resolve().parents[1] / "agents/prompts/synthesizer.md").read_text(encoding="utf-8")
NUMBER = re.compile(r"\d+(?:\.\d+)?")
MARKER = re.compile(r"\[(\d{1,3})\](?!\()")
TAGGED = re.compile(r"^\[(\d{1,3})\] (.*)$", re.S)
MIN_CITE_OVERLAP = 0.3
DOMAIN_TITLES = {"academic": "Courses", "housing": "Housing", "career": "Jobs and research",
                 "student_services": "USC services and onboarding"}
DEFAULT_FOLLOW_UPS = {"academic": "Show the weekly schedule for these sections",
                      "housing": "What should I budget for rent and utilities?",
                      "career": "How many hours can I work on campus as an F-1 student?",
                      "student_services": "Give me a pre-semester checklist"}


class SynthDraft(BaseModel):
    answer: str = Field(min_length=1, max_length=3000)
    answered: bool = True  # False when the facts do not answer the question
    follow_ups: list[str] = Field(default_factory=list, max_length=5)


def number_sources(verified: dict[str, Any]) -> list[dict[str, Any]]:
    """Ordered, deduplicated sources: card sources first (so card badges read [1], [2]...), then fact sources.
    Only URLs that survived verification are numbered; position + 1 is the citation id the UI shows."""
    known = {c["url"]: c for c in verified["citations"]}
    order: dict[str, dict[str, Any]] = {}
    for card in verified["cards"]:
        for source in [card.get("source")] + [i.get("source") for i in card.get("items", [])]:
            if source and source["url"] in known:
                order.setdefault(source["url"], known[source["url"]])
    for fact in verified["facts"]:
        if fact.get("url") in known:
            order.setdefault(fact["url"], known[fact["url"]])
    for url, c in known.items():
        order.setdefault(url, c)
    return list(order.values())


def _payload(message: str, verified: dict[str, Any], sources: list[dict[str, Any]]) -> dict[str, Any]:
    ids = {c["url"]: i + 1 for i, c in enumerate(sources)}
    facts: dict[str, list[str]] = {}
    for fact in verified["facts"][:30]:
        tag = f"[{ids[fact['url']]}] " if fact.get("url") in ids else ""
        facts.setdefault(fact["agent"], []).append(tag + fact["text"])
    unknowns: dict[str, list[str]] = {}
    for item in verified["unknowns"][:12]:
        agent, _, text = item.partition("] ")
        unknowns.setdefault(agent.strip("["), []).append(text)
    return {"question": message, "facts_by_domain": facts, "unknowns_by_domain": unknowns,
            "domain_status": {k: v["status"] for k, v in verified["partial_status"]["agents"].items()},
            "sources": [{"id": i + 1, "source": c["source_name"], "title": c.get("title", "")} for i, c in enumerate(sources)]}


def _grounded(answer: str, payload: dict[str, Any]) -> bool:
    """Every number in the prose (including [n] markers) must already appear in the payload; no raw URLs."""
    allowed = set(NUMBER.findall(json.dumps(payload)))
    return set(NUMBER.findall(answer)) <= allowed and "http" not in answer


def clean_markers(answer: str, valid_ids: set[int]) -> str:
    return MARKER.sub(lambda m: m.group(0) if int(m.group(1)) in valid_ids else "", answer)


def _words(text: str) -> set[str]:
    return {w for w in re.findall(r"[a-z0-9]+", text.lower()) if len(w) > 3 or any(c.isdigit() for c in w)}


def ensure_citations(answer: str, payload: dict[str, Any]) -> str:
    """Safety net when the model omits markers: a bullet without [n] gets the source of the verified fact it overlaps
    most with (word overlap). Below the overlap threshold the bullet stays uncited rather than mis-cited."""
    tagged = [(int(m.group(1)), _words(m.group(2))) for facts in payload["facts_by_domain"].values()
              for f in facts if (m := TAGGED.match(f))]
    if not tagged:
        return answer
    lines = []
    for line in answer.split("\n"):
        if line.lstrip().startswith(("- ", "* ")) and not MARKER.search(line):
            words = _words(line)
            score, source = max(((len(words & fw) / max(1, len(words)), sid) for sid, fw in tagged), default=(0, 0))
            if score >= MIN_CITE_OVERLAP:
                line = f"{line.rstrip()} [{source}]"
        lines.append(line)
    return "\n".join(lines)


def _cite_at_end(fact: str) -> str:
    """'[2] CSCI 104 ...' -> 'CSCI 104 ... [2]' so code-built bullets read like the LLM's."""
    match = TAGGED.match(fact)
    return f"{match.group(2)} [{match.group(1)}]" if match else fact


def code_answer(payload: dict[str, Any]) -> str:
    """Deterministic Markdown answer used when the LLM is unavailable or its output fails the checks."""
    lines = ["Here is what I found in USC's verified sources."]
    for agent, facts in payload["facts_by_domain"].items():
        lines += ["", f"### {DOMAIN_TITLES.get(agent, agent)}"] + [f"- {_cite_at_end(f)}" for f in facts[:5]]
    gaps = [u for items in payload["unknowns_by_domain"].values() for u in items]
    if gaps:
        lines += ["", "**Not known or not collected yet:**"] + [f"- {u}" for u in gaps[:5]]
    return "\n".join(lines)[:3000]


def _follow_ups(draft: SynthDraft | None, domains: list[str]) -> list[str]:
    suggested = [f.strip() for f in (draft.follow_ups if draft else []) if f.strip() and "http" not in f and len(f) <= 90]
    return (suggested or [DEFAULT_FOLLOW_UPS[d] for d in domains if d in DEFAULT_FOLLOW_UPS])[:3]


@mock_llm.register("synthesizer")
def _mock(messages: list[dict[str, Any]], tools: list[dict[str, Any]] | None) -> dict[str, Any]:
    first_input = next(m["content"] for m in messages if m["role"] == "user" and m["content"].startswith("Input: "))
    payload = json.loads(first_input.split("Input: ", 1)[1])
    lines = ["Here is a summary of what I found."]
    for agent, facts in payload["facts_by_domain"].items():
        lines += ["", f"### {DOMAIN_TITLES.get(agent, agent)}", f"- {_cite_at_end(facts[0])}"]
    return {"content": json.dumps({"answer": "\n".join(lines), "answered": True,
                                   "follow_ups": ["Give me a pre-semester checklist"]}), "tool_calls": []}


def synthesize(request_id: str, message: str, verified: dict[str, Any], budget: RequestBudget) -> StructuredResponse:
    sources = number_sources(verified)
    payload = _payload(message, verified, sources)
    messages = [{"role": "system", "content": PROMPT}, {"role": "user", "content": f"Input: {json.dumps(payload)}"}]
    draft: SynthDraft | None = None
    for attempt in range(2):  # first try + one formatting retry
        try:
            candidate = call_json("synthesizer", messages, SynthDraft, budget, temperature=0.3,
                                  max_tokens=settings.llm_synth_max_tokens)
        except (LLMFormatError, LLMUnavailable, BudgetExceeded):
            if attempt == 0:
                continue
            break
        if _grounded(candidate.answer, payload):
            draft = candidate
            break
        messages = messages + [{"role": "user", "content": "Use only numbers present in the facts and no URLs. Reply with the JSON object only."}]
    valid_ids = set(range(1, len(sources) + 1))
    # "answered" = at least part of the question is answered. An answer that cites real sources is answered even if
    # the model flagged it false because one domain (e.g. housing) had no data.
    cites = draft is not None and any(int(m.group(1)) in valid_ids for m in MARKER.finditer(draft.answer))
    answered = (draft.answered or cites) if draft else True
    answer = clean_markers(ensure_citations(draft.answer, payload) if draft else code_answer(payload), valid_ids)
    partial = verified["partial_status"]
    if not answered:
        # Keep only sources that back a card; passages that did not answer must not look like support.
        card_urls = {c["source"]["url"] for c in verified["cards"] if "source" in c} | \
                    {i["source"]["url"] for c in verified["cards"] for i in c.get("items", [])}
        sources = [c for c in sources if c["url"] in card_urls]
        answer = MARKER.sub("", answer)
        partial = {**partial, "overall": "partial"}
    return StructuredResponse(request_id=request_id, response_type="answer", answer=answer.strip(),
                              cards=verified["cards"], citations=sources, freshness_notes=verified["freshness_notes"],
                              partial_status=partial, follow_ups=_follow_ups(draft, list(payload["facts_by_domain"])))
