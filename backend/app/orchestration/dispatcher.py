"""Task dispatcher: fans the plan out to domain agents in parallel and runs each with one retry and a no-LLM fallback."""

import time
from typing import Any

from langchain_core.runnables import RunnableConfig
from langgraph.types import Send

from backend.app.agents import academic_agent, career_agent, housing_agent, student_services_agent
from backend.app.agents.base_agent import run_agent
from backend.app.llm_gateway.budget import BudgetExceeded, RequestBudget
from backend.app.schemas.agent_result import AgentResult, AgentTask
from backend.app.schemas.state import GraphState
from backend.app.tools.tool_registry import ToolContext

AGENTS = {s.name: s for s in (academic_agent.SPEC, housing_agent.SPEC, career_agent.SPEC, student_services_agent.SPEC)}


def fan_out(state: GraphState) -> list[Send]:
    plan = state["plan"]
    return [Send("agent", {"task": AgentTask(agent=t.agent, sub_query=t.sub_query, student_id=state["student_id"],
                                             student_ctx=state.get("student_ctx", {}))})
            for t in plan.tasks]


def agent_node(payload: dict[str, Any], config: RunnableConfig) -> dict[str, Any]:
    task: AgentTask = payload["task"]
    cfg = config["configurable"]
    budget: RequestBudget = cfg["budget"]
    spec = AGENTS[task.agent]
    start = time.perf_counter()
    errors = []
    result: AgentResult | None = None
    for attempt in (1, 2):  # first try + one retry
        ctx = ToolContext(agent=task.agent, student_id=task.student_id, profile=cfg["profile"], store=cfg["store"])
        try:
            result = run_agent(spec, task, ctx, budget)
            result.attempts = attempt
            break
        except BudgetExceeded as exc:
            errors.append(str(exc))
            break  # retrying cannot help once the cap is reached
        except Exception as exc:
            errors.append(type(exc).__name__)
    if result is None:
        # LLM unavailable twice: route with keywords instead, and say so in the partial status.
        ctx = ToolContext(agent=task.agent, student_id=task.student_id, profile=cfg["profile"], store=cfg["store"])
        result = run_agent(spec, task, ctx, budget, use_llm=False)
        result.status = "partial" if result.status != "failed" else "failed"
        result.error = f"agent LLM unavailable ({'; '.join(errors)}); used keyword routing"
        result.attempts = 2
    event = {"node": f"agent:{task.agent}", "status": result.status, "ms": round((time.perf_counter() - start) * 1000),
             "tool_calls": [c.name for c in result.tool_calls]}
    return {"agent_results": [result], "events": [event]}
