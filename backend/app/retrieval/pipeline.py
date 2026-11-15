"""Retrieval pipeline (diagram section A, simplified): parse -> filters -> route -> engines -> fusion -> validate -> package.

Deterministic code only: zero LLM calls. One local query embedding and one Pinecone query per populated namespace.
"""

import time
from typing import Any

from backend.app.config.settings import settings
from backend.app.data_store.loader import get_store
from backend.app.observability.request_log import log_retrieval
from backend.app.retrieval import evidence, fusion, hybrid_engine, query_parser, router, structured_lookup, validation
from backend.app.retrieval.filters import build_filter
from backend.app.retrieval.runtime import get_runtime
from backend.app.schemas.agent_result import Evidence
from backend.app.schemas.retrieval import AccessScope, EvidencePackage, RetrievalRequest


def _ms(start: float) -> int:
    return round((time.perf_counter() - start) * 1000)


class PineconeRetriever:
    backend = "pinecone"

    def __init__(self) -> None:
        self.runtime = get_runtime()
        self.store = get_store()

    def retrieve(self, request: RetrievalRequest) -> EvidencePackage:
        start = time.perf_counter()
        timings: dict[str, int] = {}
        parsed = query_parser.parse(request.query, request.academic_year)
        year = parsed.academic_year
        route = router.choose(parsed, request, self.store)
        empty = [d for d in request.domains if not self.runtime.namespaces.get(d)]
        live = [d for d in request.domains if d not in empty]
        items, route_used, filters_applied = [], "none", {}

        # Exact ids and numeric comparisons: answer from local verified JSON (current year only), hybrid on a miss.
        if route.kind == "structured" and year == settings.academic_year:
            t = time.perf_counter()
            items = structured_lookup.lookup(parsed, route, request.domains, self.store, self.runtime, year)
            timings["structured"] = _ms(t)
            route_used = "structured" if items else route_used
        if not items and live:
            route_used = "hybrid"
            t = time.perf_counter()
            dense, sparse = hybrid_engine.encode_query(self.runtime, parsed.text)
            timings["encode"] = _ms(t)
            filters = {ns: build_filter(request, request.scope, year, self.runtime.manifest["bm25_hash"]) for ns in live}
            filters_applied = _summarize(filters[live[0]])
            t = time.perf_counter()
            candidates = hybrid_engine.search(self.runtime, dense, sparse, live, filters, route.alpha,
                                              settings.retrieval_candidates)
            timings["pinecone"] = _ms(t)
            items = fusion.expand(fusion.rerank(fusion.dedupe(candidates), year)[: request.top_n], self.runtime)

        items, flags, notes = validation.validate(items, year)
        sufficient, reason = evidence.decide(items, empty, year)
        timings["total"] = _ms(start)
        package = EvidencePackage(backend=self.backend, query_hash=parsed.query_hash, route=route_used,
                                  strategy=request.strategy or settings.retrieval_strategy, alpha=route.alpha,
                                  academic_year=year, filters_applied=filters_applied, items=items, sufficient=sufficient,
                                  reason=reason, freshness_notes=notes, flags=flags, timings_ms=timings)
        log_retrieval(package, request.domains)
        return package

    def search(self, query: str, domain: str, filters: dict[str, Any], top_k: int) -> list[Evidence]:
        """Original interface, kept for compatibility: usable items only, as plain Evidence."""
        package = self.retrieve(RetrievalRequest(query=query, domains=[domain], scope=AccessScope(student_id="system"),
                                                 top_n=top_k))
        return [i.to_evidence() for i in package.items if not set(i.flags) & evidence.BLOCKING_FLAGS]


def _summarize(flt: dict[str, Any]) -> dict[str, Any]:
    """Filter summary for the package and logs (no bm25 hash noise, no student data)."""
    out = {}
    for clause in flt.get("$and", []):
        for key, value in clause.items():
            if key != "bm25_hash":
                out[key] = value
    return out
