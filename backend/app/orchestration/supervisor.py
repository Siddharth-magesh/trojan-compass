"""Supervisor/planner: one LLM call that turns the student's message into a Plan or a clarification question."""

import json
from pathlib import Path
from typing import Any

from backend.app.llm_gateway.budget import RequestBudget
from backend.app.llm_gateway.gateway import LLMFormatError, call_json
from backend.app.schemas.plan import Plan

PROMPT = (Path(__file__).resolve().parents[1] / "agents/prompts/supervisor.md").read_text(encoding="utf-8")


def build_messages(message: str, history: list[dict[str, str]], student_ctx: dict[str, Any]) -> list[dict[str, Any]]:
    context = {"student": student_ctx, "recent_turns": history[-4:]}
    return [{"role": "system", "content": PROMPT},
            {"role": "user", "content": f"Context: {json.dumps(context, ensure_ascii=False)}\n\nStudent message: {message}"}]


def plan_request(message: str, history: list[dict[str, str]], student_ctx: dict[str, Any], budget: RequestBudget) -> Plan:
    """Returns a validated Plan; one retry on malformed output, then LLMFormatError propagates to the fallback path."""
    messages = build_messages(message, history, student_ctx)
    try:
        return call_json("supervisor", messages, Plan, budget)
    except LLMFormatError:
        retry = messages + [{"role": "user", "content": "Your last reply was not valid JSON for the schema. Reply with the JSON object only."}]
        return call_json("supervisor", retry, Plan, budget)
