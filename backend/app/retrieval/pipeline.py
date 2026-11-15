"""Retrieval pipeline (diagram section A, simplified): parse -> cache -> filters -> route -> engines -> fusion -> validate -> package.

Deterministic code only: zero LLM calls. One local query embedding and one Pinecone query per populated namespace
(two with hybrid_outline). Pinecone failures degrade to an insufficient package; they never raise to the agent.
"""

import time
from typing import Any

from backend.app.config.settings import settings
from backend.app.data_store.loader import get_store
from backend.app.observability.request_log import log_retrieval
from backend.app.retrieval import (cache, evidence, fusion, hybrid_engine, query_parser, reliability, router,
                                   structured_lookup, validation)
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

    def retrieve(self, request: RetrievalRequest, use_cache: bool = True) -> EvidencePackage:
        start = time.perf_counter()
        parsed = query_parser.parse(request.query, request.academic_year)
        year = parsed.academic_year
        strategy = request.strategy or settings.retrieval_strategy
        cache_key = cache.key(parsed.normalized, year, request, strategy)
        if use_cache and (hit := cache.get(cache_key)):
            hit.timings_ms = {"total": _ms(start)}
            log_retrieval(hit, request.domains)
            return hit

        timings: dict[str, int] = {}
        route = router.choose(parsed, request, self.store)
        empty = [d for d in request.domains if not self.runtime.namespaces.get(d)]
        live = [d for d in request.domains if d not in empty]
        items, route_used, filters_applied, pkg_flags = [], "none", {}, []

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
            bm25_hash = self.runtime.manifest["bm25_hash"]

            def filter_for(ns: str, chunk_types: list[str] | None, doc_ids: list[str] | None) -> dict:
                return build_filter(request, request.scope, year, bm25_hash, chunk_types, doc_ids)

            filters_applied = _summarize(filter_for(live[0], None, None))
            t = time.perf_counter()
            try:
                candidates = hybrid_engine.search(self.runtime, dense, sparse, live, filter_for, route.alpha,
                                                  settings.retrieval_candidates, strategy)
            except reliability.RetrievalUnavailable as exc:
                candidates = []
                pkg_flags.append(f"pinecone_unavailable:{exc}")
            timings["pinecone"] = _ms(t)
            items = self._rank(fusion.dedupe(candidates), parsed.text, year, request.top_n, pkg_flags)

        items, flags, notes = validation.validate(items, year)
        sufficient, reason = evidence.decide(items, empty, year)
        if any(f.startswith("pinecone_unavailable") for f in pkg_flags):
            reason = "retrieval temporarily unavailable; try again shortly"
        timings["total"] = _ms(start)
        package = EvidencePackage(backend=self.backend, query_hash=parsed.query_hash, route=route_used, strategy=strategy,
                                  alpha=route.alpha, academic_year=year, filters_applied=filters_applied, items=items,
                                  sufficient=sufficient, reason=reason, freshness_notes=notes, flags=pkg_flags + flags,
                                  timings_ms=timings)
        cache.put(cache_key, package)
        log_retrieval(package, request.domains)
        return package

    def _rank(self, candidates: list, query: str, year: str, top_n: int, flags: list[str]) -> list:
        if settings.retrieval_reranker == "none":
            ranked = sorted(candidates, key=lambda i: (-i.hybrid_score, i.id))
            for item in ranked:
                item.rerank_score = round(item.hybrid_score, 4)
        else:
            ranked = fusion.rerank(candidates, year)
        if settings.retrieval_reranker == "pinecone" and ranked:
            try:
                ranked = fusion.rerank_hosted(ranked, query, top_n)
            except Exception as exc:  # quota, rate limit or network: keep the heuristic order
                flags.append(f"hosted_rerank_failed:{type(exc).__name__}")
        return fusion.expand(ranked[:top_n], self.runtime)

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
