"""Pinecone metadata filters built in code from the access scope, year and agent options (never from model output)."""

from typing import Any

from backend.app.data_store import loader  # noqa: F401  (adds local_database/scripts to sys.path)
from backend.app.schemas.retrieval import AccessScope, RetrievalRequest
from query_store import public_filter  # noqa: E402

NUMERIC_OPS = {"$lt", "$lte", "$gt", "$gte", "$eq"}


def build_filter(request: RetrievalRequest, scope: AccessScope, academic_year: str, bm25_hash: str,
                 chunk_types: list[str] | None = None, doc_ids: list[str] | None = None) -> dict[str, Any]:
    """public_filter() = public access + dataset + year + BM25 version; we only ever add narrowing clauses."""
    if scope.access_levels != ["public"]:
        raise ValueError("only public data is indexed; private scopes are not supported")
    flt = public_filter(academic_year, bm25_hash)
    clauses: list[dict[str, Any]] = flt["$and"]
    clauses.append({"chunk_type": {"$in": chunk_types or request.chunk_types}})
    if request.categories:
        clauses.append({"category": {"$in": request.categories}})
    if doc_ids:
        clauses.append({"doc_id": {"$in": doc_ids}})
    for field_name, ops in request.numeric_filters.items():
        safe = {op: float(v) for op, v in ops.items() if op in NUMERIC_OPS and isinstance(v, (int, float))}
        if safe:
            clauses.append({field_name: safe})
    return flt
