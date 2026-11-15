"""Deterministic canned LLM outputs for LLM_MODE=mock, routed by task name and keywords in the last user message."""

import json
import re
from collections.abc import Callable
from typing import Any

MockHandler = Callable[[list[dict[str, Any]], list[dict[str, Any]] | None], dict[str, Any]]
_HANDLERS: dict[str, MockHandler] = {}

DOMAIN_KEYWORDS = {
    "academic": r"\b(course|class|classes|prereq\w*|schedule|register|registration|units?|csci|ee \d|csci \d)\b",
    "housing": r"\b(housing|rent|apartment|room|roommate|lease|live near)\b",
    "career": r"\b(jobs?|work|internship|research|lab|career|part[- ]time|employment)\b",
    "student_services": r"\b(services?|checklist|insurance|health|uscard|id card|tuition|pay|bill|onboard\w*|arriv\w*|ssn|immuniz\w*)\b",
}


def register(task: str) -> Callable[[MockHandler], MockHandler]:
    def wrap(fn: MockHandler) -> MockHandler:
        _HANDLERS[task] = fn
        return fn
    return wrap


def last_user_text(messages: list[dict[str, Any]]) -> str:
    text = next((m["content"] for m in reversed(messages) if m["role"] == "user" and isinstance(m.get("content"), str)), "")
    return text.rsplit("Student message:", 1)[-1].strip()


def respond(task: str, messages: list[dict[str, Any]], tools: list[dict[str, Any]] | None) -> dict[str, Any]:
    """Return an OpenAI-style message dict: {"content": str | None, "tool_calls": [{"id","name","arguments"}]}."""
    handler = _HANDLERS.get(task)
    if handler is None:
        return {"content": json.dumps({"error": f"no mock for task {task}"}), "tool_calls": []}
    return handler(messages, tools)


@register("supervisor")
def _supervisor(messages: list[dict[str, Any]], tools: list[dict[str, Any]] | None) -> dict[str, Any]:
    text = last_user_text(messages).lower()
    agents = [name for name, pattern in DOMAIN_KEYWORDS.items() if re.search(pattern, text)]
    if not agents or len(text.split()) < 4:
        plan = {"clarify": True, "question": "What would you like help with first?", "tasks": [],
                "options": ["Courses and registration", "Housing", "Jobs and research", "USC services and onboarding"]}
    else:
        plan = {"clarify": False, "tasks": [{"agent": a, "sub_query": text[:300]} for a in agents]}
    return {"content": json.dumps(plan), "tool_calls": []}
