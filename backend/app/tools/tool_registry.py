"""Typed tool registry with per-agent allow-lists; every LLM-supplied argument is validated before a tool runs."""

import importlib
import json
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any

from pydantic import BaseModel, ValidationError

from backend.app.data_store.loader import DataStore
from backend.app.schemas.agent_result import RecordRef, ToolCallRecord
from backend.app.schemas.response import Citation


@dataclass
class ToolContext:
    """Built by code for each agent run; student identity comes from the JWT, never from LLM arguments."""
    agent: str
    student_id: str
    profile: dict[str, Any]
    store: DataStore


class ToolOutput(BaseModel):
    tool: str
    status: str = "ok"  # ok | no_data | not_found | error
    facts: list[str] = []
    fact_citations: list[Citation | None] = []  # parallel to facts; filled by add_fact()
    cards: list[dict[str, Any]] = []
    checklist: list[dict[str, Any]] = []
    records: list[RecordRef] = []
    citations: list[Citation] = []
    unknowns: list[str] = []

    def add_fact(self, text: str, citation: Citation | None = None) -> None:
        self.facts.append(text)
        self.fact_citations.append(citation)


@dataclass
class ToolSpec:
    name: str
    description: str
    input_model: type[BaseModel]
    fn: Callable[[Any, ToolContext], ToolOutput]
    domains: set[str] = field(default_factory=set)


TOOLS: dict[str, ToolSpec] = {}

ALLOW_LISTS: dict[str, list[str]] = {
    "academic": ["get_courses", "search_courses", "find_sections", "check_schedule_conflicts", "get_my_profile",
                 "knowledge_retrieval"],
    "housing": ["search_housing", "monthly_cost", "get_my_profile", "knowledge_retrieval"],
    "career": ["search_opportunities", "search_research_labs", "list_career_resources", "get_my_profile",
               "knowledge_retrieval"],
    "student_services": ["list_services", "list_guides", "knowledge_retrieval"],
}

_TOOL_MODULES = ["academic_tools", "housing_tools", "career_tools", "services_tools", "profile_tools", "knowledge_tool"]


def tool(name: str, description: str, input_model: type[BaseModel]):
    def wrap(fn: Callable[[Any, ToolContext], ToolOutput]):
        TOOLS[name] = ToolSpec(name, description, input_model, fn)
        return fn
    return wrap


def ensure_loaded() -> None:
    for module in _TOOL_MODULES:
        importlib.import_module(f"backend.app.tools.{module}")


def _clean_schema(schema: dict[str, Any]) -> dict[str, Any]:
    """Drop pydantic 'title' keys; some OpenAI-compatible providers reject unknown schema keywords."""
    if isinstance(schema, dict):
        return {k: _clean_schema(v) for k, v in schema.items() if k != "title"}
    if isinstance(schema, list):
        return [_clean_schema(v) for v in schema]
    return schema


def schemas_for(agent: str) -> list[dict[str, Any]]:
    ensure_loaded()
    return [{"type": "function", "function": {"name": s.name, "description": s.description,
                                              "parameters": _clean_schema(s.input_model.model_json_schema())}}
            for s in (TOOLS[n] for n in ALLOW_LISTS[agent])]


def run_tool(name: str, raw_arguments: str | dict[str, Any], ctx: ToolContext) -> tuple[ToolCallRecord, ToolOutput]:
    """Allow-list check, schema validation, then execution. Failures become error outputs, never exceptions."""
    ensure_loaded()
    if name not in ALLOW_LISTS.get(ctx.agent, []) or name not in TOOLS:
        return (ToolCallRecord(name=name, ok=False, error="tool not allowed for this agent"),
                ToolOutput(tool=name, status="error", unknowns=[f"tool {name} is not allowed"]))
    spec = TOOLS[name]
    try:
        args = json.loads(raw_arguments) if isinstance(raw_arguments, str) else raw_arguments
        parsed = spec.input_model.model_validate(args or {})
    except (json.JSONDecodeError, ValidationError) as exc:
        return (ToolCallRecord(name=name, ok=False, error=f"invalid arguments: {type(exc).__name__}"),
                ToolOutput(tool=name, status="error", unknowns=["tool arguments were invalid"]))
    try:
        output = spec.fn(parsed, ctx)
    except Exception as exc:  # a broken tool must not crash the agent
        return (ToolCallRecord(name=name, arguments=parsed.model_dump(), ok=False, error=type(exc).__name__),
                ToolOutput(tool=name, status="error", unknowns=[f"{name} failed"]))
    return (ToolCallRecord(name=name, arguments=parsed.model_dump(), ok=output.status != "error",
                           result_count=len(output.records)), output)
