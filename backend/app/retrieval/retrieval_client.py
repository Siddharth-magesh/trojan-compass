"""Retrieval seam used by the knowledge tool: Retriever protocol, a no-evidence stub, and the stub|pinecone|auto switch."""

import logging
from functools import lru_cache
from typing import Any, Protocol

from backend.app.config.settings import settings
from backend.app.retrieval.query_parser import parse
from backend.app.schemas.agent_result import Evidence
from backend.app.schemas.retrieval import EvidencePackage, RetrievalRequest

log = logging.getLogger(__name__)


class Retriever(Protocol):
    backend: str

    def search(self, query: str, domain: str, filters: dict[str, Any], top_k: int) -> list[Evidence]: ...

    def retrieve(self, request: RetrievalRequest) -> EvidencePackage: ...


class StubRetriever:
    """Used when the index is not reachable from this machine: returns no evidence, never fabricated text."""
    backend = "stub"

    def __init__(self, reason: str) -> None:
        self.reason = reason

    def search(self, query: str, domain: str, filters: dict[str, Any], top_k: int) -> list[Evidence]:
        return []

    def retrieve(self, request: RetrievalRequest) -> EvidencePackage:
        return EvidencePackage(backend=self.backend, query_hash=parse(request.query).query_hash, route="none",
                               strategy="none", sufficient=False, reason=f"guide search unavailable: {self.reason}")


@lru_cache(maxsize=1)
def get_retriever() -> Retriever:
    if settings.retrieval_backend == "stub":
        return StubRetriever("RETRIEVAL_BACKEND=stub")
    from backend.app.retrieval.runtime import readiness

    ready, reason = readiness()
    if ready:
        try:
            from backend.app.retrieval.pipeline import PineconeRetriever

            return PineconeRetriever()
        except Exception as exc:  # network or SDK failure at startup: degrade, never crash the API
            reason = f"pinecone unavailable ({type(exc).__name__})"
    log.warning("retrieval running as stub: %s", reason)
    return StubRetriever(reason)


def retrieval_status() -> dict[str, str]:
    retriever = get_retriever()
    return {"backend": retriever.backend, "reason": getattr(retriever, "reason", "ready")}
