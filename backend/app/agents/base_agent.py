"""Shared domain-agent loop: one LLM tool-selection round (max 3 tool calls), deterministic keyword fallback, typed result."""

import json
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from backend.app.config.settings import settings
from backend.app.llm_gateway import mock_llm
from backend.app.llm_gateway.budget import RequestBudget
from backend.app.llm_gateway.gateway import complete
from backend.app.schemas.agent_result import AgentResult, AgentTask, Fact
from backend.app.tools.tool_registry import ToolContext, ToolOutput, run_tool, schemas_for

PROMPTS = Path(__file__).resolve().parent / "prompts"
PlannedCall = tuple[str, dict[str, Any]]


@dataclass
class AgentSpec:
    name: str
    categories: list[str]                                         # data this agent depends on
    heuristic: Callable[[str, dict[str, Any]], list[PlannedCall]]  # keyword routing: mock mode + no-LLM fallback

    @property
    def prompt(self) -> str:
        return (PROMPTS / f"{self.name}.md").read_text(encoding="utf-8")


def define_agent(spec: AgentSpec) -> AgentSpec:
    """Registers the agent's mock handler so LLM_MODE=mock exercises the same tool path as live mode."""
    @mock_llm.register(f"agent_{spec.name}")
    def _mock(messages: list[dict[str, Any]], tools: list[dict[str, Any]] | None) -> dict[str, Any]:
        calls = spec.heuristic(mock_llm.last_user_text(messages), {})
        return {"content": None, "tool_calls": [{"id": f"m{i}", "name": n, "arguments": a} for i, (n, a) in enumerate(calls)]}
    return spec


def _messages(spec: AgentSpec, task: AgentTask) -> list[dict[str, Any]]:
    return [{"role": "system", "content": spec.prompt},
            {"role": "user", "content": f"Student context: {json.dumps(task.student_ctx)}\nStudent message: {task.sub_query}"}]


def _execute(spec: AgentSpec, calls: list[PlannedCall], ctx: ToolContext, result: AgentResult) -> None:
    for name, args in calls[: settings.max_tool_calls_per_agent]:
        record, output = run_tool(name, args, ctx)
        result.tool_calls.append(record)
        _absorb(result, output)


def _absorb(result: AgentResult, output: ToolOutput) -> None:
    result.tool_outputs.append(output.model_dump(mode="json"))
    citations = output.fact_citations + [None] * (len(output.facts) - len(output.fact_citations))
    result.facts.extend(Fact(text=f, citation=c) for f, c in zip(output.facts, citations))
    result.records.extend(output.records)
    result.citations.extend(output.citations)
    result.unknowns.extend(output.unknowns)


def _status(result: AgentResult) -> str:
    statuses = {o["status"] for o in result.tool_outputs}
    if not statuses or statuses <= {"error"}:
        return "failed"
    return "ok" if statuses == {"ok"} and not result.unknowns else "partial"


def run_agent(spec: AgentSpec, task: AgentTask, ctx: ToolContext, budget: RequestBudget, use_llm: bool = True) -> AgentResult:
    """use_llm=False (or all source data empty) skips the LLM and uses keyword routing; costs zero LLM calls."""
    result = AgentResult(agent=spec.name, status="ok")
    has_data = any(ctx.store.available(c) for c in spec.categories)
    if use_llm and has_data:
        reply = complete(f"agent_{spec.name}", _messages(spec, task), budget, tools=schemas_for(spec.name))
        calls = [(c.name, c.arguments) for c in reply.tool_calls]
        if not calls:  # the model answered in prose; ground the answer in tools instead
            calls = spec.heuristic(task.sub_query, task.student_ctx)
    else:
        calls = spec.heuristic(task.sub_query, task.student_ctx)
    _execute(spec, calls, ctx, result)
    result.status = _status(result)
    if not has_data:
        result.status = "partial"
    return result
