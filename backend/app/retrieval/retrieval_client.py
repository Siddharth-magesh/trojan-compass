"""Retrieval seam: a Protocol the knowledge tool calls, backed by the teammates' Pinecone query helper or a no-evidence stub.

This module only wraps local_database/scripts/query_store.hybrid_query; it does no embedding, indexing or ingestion itself.
"""

import logging
from functools import lru_cache
from typing import Any, Protocol

from backend.app.config.settings import settings
from backend.app.data_store import loader  # noqa: F401  (adds local_database/scripts to sys.path)
from backend.app.schemas.agent_result import Evidence
from backend.app.schemas.response import Citation

log = logging.getLogger(__name__)


class Retriever(Protocol):
    def search(self, query: str, domain: str, filters: dict[str, Any], top_k: int) -> list[Evidence]: ...


class StubRetriever:
    """Used until the index is reachable from this machine: returns no evidence, never fabricated text."""

    def search(self, query: str, domain: str, filters: dict[str, Any], top_k: int) -> list[Evidence]:
        return []


class PineconeRetriever:
    """Thin adapter over query_store.hybrid_query; the public/year filter is applied inside that helper."""

    def __init__(self) -> None:
        from embedding_runtime import Encoder, prepare_model
        from ingestion_models import processed_root, read_json
        from pinecone_store import connect
        from query_store import hybrid_query
        from sparse_encoder import Bm25

        manifest = read_json(processed_root / "manifest.json")
        self._bm25 = Bm25.model_validate(read_json(processed_root / "bm25_params.json"))
        if manifest["bm25_hash"] != self._bm25.fingerprint():
            raise ValueError("BM25 state differs from the last verified upload")
        self._index, _ = connect(manifest["index_name"])
        self._encoder = Encoder(prepare_model())
        self._query = hybrid_query

    def search(self, query: str, domain: str, filters: dict[str, Any], top_k: int) -> list[Evidence]:
        matches = self._query(self._index, self._encoder, self._bm25, query, domain, settings.academic_year, top_k=top_k)
        out = []
        for m in matches:
            meta = m.get("metadata") or {}
            if meta.get("access_level") != "public":
                continue  # defense in depth: the helper already filters, we re-check before returning text
            date = str(meta.get("verified_date_num", ""))
            out.append(Evidence(doc_id=str(meta.get("doc_id", m["id"])), text=str(meta.get("text", ""))[:600],
                                score=float(m.get("score", 0.0)),
                                citation=Citation(source_name=str(meta.get("source_name", "unknown")),
                                                  url=str(meta.get("source_url", "")),
                                                  verified_date=f"{date[:4]}-{date[4:6]}-{date[6:]}" if len(date) == 8 else "unknown")))
        return out


@lru_cache(maxsize=1)
def get_retriever() -> Retriever:
    if settings.retrieval_backend == "pinecone":
        try:
            return PineconeRetriever()
        except Exception as exc:  # missing key, processed/ files or packages: degrade to no evidence
            log.warning("retrieval unavailable, using stub: %s", type(exc).__name__)
    return StubRetriever()
