"""Retrieval request and evidence package models (additive to Evidence in agent_result.py, which stays unchanged)."""

from typing import Literal

from pydantic import BaseModel, Field

from backend.app.schemas.agent_result import Evidence
from backend.app.schemas.response import Citation


class AccessScope(BaseModel):
    """Built by code from the JWT-derived ToolContext; only public data is indexed today."""
    student_id: str
    access_levels: list[Literal["public"]] = Field(default_factory=lambda: ["public"])


class RetrievalRequest(BaseModel):
    query: str
    domains: list[str] = Field(min_length=1, max_length=4)
    scope: AccessScope
    academic_year: str | None = None                         # caller override; otherwise parsed or the current year
    categories: list[str] = Field(default_factory=list)
    chunk_types: list[str] = Field(default_factory=lambda: ["chunk", "record"])
    numeric_filters: dict[str, dict[str, float]] = Field(default_factory=dict)  # e.g. {"hourly_pay_usd": {"$gte": 20}}
    strategy: Literal["hybrid", "hybrid_outline"] | None = None
    alpha: float | None = Field(default=None, ge=0, le=1)
    top_n: int = Field(default=5, ge=1, le=10)


class EvidenceItem(BaseModel):
    id: str
    doc_id: str
    namespace: str
    chunk_type: str
    record_slug: str = ""
    title: str = ""
    section_path: str = ""
    text: str
    hybrid_score: float = 0.0
    dense_score: float = 0.0  # cosine(query, item); alpha-independent confidence used for sufficiency
    rerank_score: float = 0.0
    source_name: str = "unknown"
    source_url: str = ""
    also_in: list[str] = Field(default_factory=list)
    authority: str = "unknown"
    academic_year: str = "unknown"
    verified_date: str = "unknown"
    access_level: str = "unknown"
    chunk_hash: str = ""
    flags: list[str] = Field(default_factory=list)  # stale | wrong_year | instruction_like | expanded

    def to_evidence(self) -> Evidence:
        return Evidence(doc_id=self.doc_id, text=self.text, score=self.rerank_score,
                        citation=Citation(source_name=self.source_name, url=self.source_url, verified_date=self.verified_date))


class EvidencePackage(BaseModel):
    backend: str
    query_hash: str
    route: Literal["structured", "hybrid", "none"]
    strategy: str
    alpha: float | None = None
    academic_year: str = ""
    filters_applied: dict = Field(default_factory=dict)
    items: list[EvidenceItem] = Field(default_factory=list)
    sufficient: bool = False
    reason: str = ""
    freshness_notes: list[str] = Field(default_factory=list)
    flags: list[str] = Field(default_factory=list)
    timings_ms: dict[str, int] = Field(default_factory=dict)
    cache_hit: bool = False
