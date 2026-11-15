"""Domain agent input/output models and retrieval evidence shared by agents, tools and the aggregator."""

from typing import Any, Literal

from pydantic import BaseModel, Field

from backend.app.schemas.plan import AgentName
from backend.app.schemas.response import Citation


class AgentTask(BaseModel):
    agent: AgentName
    sub_query: str
    student_id: str  # injected from the JWT by code, never taken from LLM output
    student_ctx: dict[str, Any] = Field(default_factory=dict)


class RecordRef(BaseModel):
    category: str
    record_id: str


class Fact(BaseModel):
    text: str
    record: RecordRef | None = None
    citation: Citation | None = None  # the source this fact came from, so the answer can cite it as [n]


class ToolCallRecord(BaseModel):
    name: str
    arguments: dict[str, Any] = Field(default_factory=dict)
    ok: bool
    error: str | None = None
    result_count: int = 0


class Evidence(BaseModel):
    doc_id: str
    text: str
    score: float
    citation: Citation


class AgentResult(BaseModel):
    agent: AgentName
    status: Literal["ok", "partial", "failed", "skipped"]
    facts: list[Fact] = Field(default_factory=list)
    records: list[RecordRef] = Field(default_factory=list)
    citations: list[Citation] = Field(default_factory=list)
    unknowns: list[str] = Field(default_factory=list)
    tool_calls: list[ToolCallRecord] = Field(default_factory=list)
    tool_outputs: list[dict[str, Any]] = Field(default_factory=list)  # compact tool results the aggregator turns into cards
    error: str | None = None
    attempts: int = 1
