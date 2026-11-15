"""LangGraph wiring: supervisor -> parallel agents -> aggregate -> verify -> synthesize, with clarification and fallback exits."""

import re
import time
from functools import lru_cache
from typing import Any

from langchain_core.runnables import RunnableConfig
from langgraph.graph import END, START, StateGraph

from backend.app.llm_gateway import mock_llm
from backend.app.orchestration import aggregator, verifier
from backend.app.orchestration.dispatcher import agent_node, fan_out
from backend.app.orchestration.fallback import clarification_response, fallback_response
from backend.app.orchestration.progress import emit
from backend.app.orchestration.supervisor import plan_request
from backend.app.orchestration.synthesizer import synthesize
from backend.app.schemas.plan import Plan, SubTask
from backend.app.schemas.state import GraphState
from backend.app.security.input_guard import check_input
from backend.app.security.output_guard import check_output


def _ms(start: float) -> int:
    return round((time.perf_counter() - start) * 1000)


def _event(node: str, start: float, **extra: Any) -> list[dict[str, Any]]:
    return [{"node": node, "ms": _ms(start), **extra}]


def keyword_plan(message: str) -> Plan | None:
    """Deterministic routing used only when the planner LLM fails; None means we cannot route safely."""
    text = message.lower()
    agents = [a for a, pattern in mock_llm.DOMAIN_KEYWORDS.items() if re.search(pattern, text)]
    return Plan(tasks=[SubTask(agent=a, sub_query=message[:300]) for a in agents]) if agents else None


def supervisor_node(state: GraphState, config: RunnableConfig) -> dict[str, Any]:
    start = time.perf_counter()
    emit("supervisor", "started")
    try:
        plan = plan_request(state["message"], state.get("history", []), state.get("student_ctx", {}),
                            config["configurable"]["budget"])
        emit("supervisor", "done", _ms(start))
        return {"plan": plan, "events": _event("supervisor", start, clarify=plan.clarify, agents=[t.agent for t in plan.tasks])}
    except Exception as exc:
        plan = keyword_plan(state["message"])
        emit("supervisor", "done" if plan else "failed", _ms(start))
        return {"plan": plan, "plan_error": type(exc).__name__,
                "events": _event("supervisor", start, error=type(exc).__name__, keyword_routing=plan is not None)}


def route_after_plan(state: GraphState) -> Any:
    plan = state.get("plan")
    if plan is None:
        return "fallback"
    if plan.clarify:
        return "clarify"
    return fan_out(state)


def aggregate_node(state: GraphState, config: RunnableConfig) -> dict[str, Any]:
    start = time.perf_counter()
    emit("verifier", "started")
    agg = aggregator.aggregate(state.get("agent_results", []))
    if state.get("plan_error"):
        agg["partial_status"]["overall"] = "partial"
    return {"aggregate": agg, "events": _event("aggregate", start, cards=len(agg["cards"]))}


def verify_node(state: GraphState, config: RunnableConfig) -> dict[str, Any]:
    start = time.perf_counter()
    result = verifier.verify(state["aggregate"], config["configurable"]["store"])
    emit("verifier", "done", _ms(start))
    return {"verification": result, "events": _event("verify", start, issues=len(result["issues"]))}


def synthesize_node(state: GraphState, config: RunnableConfig) -> dict[str, Any]:
    start = time.perf_counter()
    emit("synthesizer", "started")
    response = synthesize(state["request_id"], state["message"], state["verification"], config["configurable"]["budget"])
    emit("synthesizer", "done", _ms(start))
    return {"response": response, "events": _event("synthesize", start)}


def clarify_node(state: GraphState) -> dict[str, Any]:
    plan = state["plan"]
    return {"response": clarification_response(state["request_id"], plan.question or "", plan.options),
            "events": [{"node": "clarify", "ms": 0}]}


def fallback_node(state: GraphState) -> dict[str, Any]:
    blocked = state.get("guard_ok") is False
    reason = state.get("guard_reason") if blocked else (state.get("plan_error") or "could not plan the request")
    code = "guard_blocked" if blocked else "upstream_failed"
    return {"response": fallback_response(state["request_id"], reason or "blocked", code),
            "events": [{"node": "fallback", "ms": 0}]}


def input_guard_node(state: GraphState) -> dict[str, Any]:
    emit("input_guard", "started")
    result = check_input(state["message"])
    emit("input_guard", "done" if result.ok else "failed", 0)
    event = {"node": "input_guard", "ms": 0, "guard_events": [] if result.ok else [f"input_blocked:{result.reason}"]}
    if not result.ok:
        return {"guard_ok": False, "guard_reason": result.reason, "events": [event]}
    return {"guard_ok": True, "message": result.sanitized, "events": [event]}


def output_guard_node(state: GraphState, config: RunnableConfig) -> dict[str, Any]:
    start = time.perf_counter()
    emit("output_guard", "started")
    response, events = check_output(state["response"], config["configurable"]["store"])
    emit("output_guard", "done", _ms(start))
    return {"response": response, "events": [{"node": "output_guard", "ms": 0, "guard_events": events}]}


@lru_cache(maxsize=1)
def build_graph() -> Any:
    g = StateGraph(GraphState)
    for name, fn in [("input_guard", input_guard_node), ("supervisor", supervisor_node), ("agent", agent_node),
                     ("aggregate", aggregate_node), ("verify", verify_node), ("synthesize", synthesize_node),
                     ("clarify", clarify_node), ("fallback", fallback_node), ("output_guard", output_guard_node)]:
        g.add_node(name, fn)
    g.add_edge(START, "input_guard")
    g.add_conditional_edges("input_guard", lambda s: "supervisor" if s.get("guard_ok") else "fallback",
                            ["supervisor", "fallback"])
    g.add_conditional_edges("supervisor", route_after_plan, ["agent", "clarify", "fallback"])
    g.add_edge("agent", "aggregate")
    g.add_edge("aggregate", "verify")
    g.add_edge("verify", "synthesize")
    for name in ("synthesize", "clarify", "fallback"):
        g.add_edge(name, "output_guard")
    g.add_edge("output_guard", END)
    return g.compile()
