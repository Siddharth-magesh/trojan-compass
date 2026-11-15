"""LangGraph state shared by all nodes; list fields use add-reducers so parallel agents can write safely."""

import operator
from typing import Annotated, Any, TypedDict

from backend.app.schemas.agent_result import AgentResult
from backend.app.schemas.plan import Plan
from backend.app.schemas.response import StructuredResponse


class GraphState(TypedDict, total=False):
    request_id: str
    session_id: str
    student_id: str
    student_ctx: dict[str, Any]
    message: str
    history: list[dict[str, str]]
    guard_ok: bool
    guard_reason: str
    plan: Plan | None
    plan_error: str
    agent_results: Annotated[list[AgentResult], operator.add]
    aggregate: dict[str, Any]
    verification: dict[str, Any]
    response: StructuredResponse | None
    events: Annotated[list[dict[str, Any]], operator.add]
