"""Permission-scoped TTL cache for evidence packages on the shared state backend (memory or Redis). Keys carry the access
scope and the data version, so a data update invalidates entries; they never include raw student data."""

import hashlib
import json

from backend.app.config.settings import settings
from backend.app.data_store.loader import get_store
from backend.app.observability import metrics
from backend.app.schemas.retrieval import EvidencePackage, RetrievalRequest
from backend.app.shared_state.kv_store import get_kv


def key(normalized_query: str, year: str, request: RetrievalRequest, strategy: str) -> str:
    """Access scope is part of the key, so a future private scope can never be served a public-scope entry or vice versa."""
    raw = json.dumps([normalized_query, request.scope.access_levels, year, sorted(request.domains), strategy,
                      request.alpha, sorted(request.categories), sorted(request.chunk_types), request.numeric_filters,
                      request.top_n, settings.retrieval_reranker, get_store().version], sort_keys=True)
    return "retrieval:" + hashlib.sha256(raw.encode("utf-8")).hexdigest()


def get(cache_key: str) -> EvidencePackage | None:
    metrics.count("retrieval_queries")
    data = get_kv().get_json(cache_key)
    if data is None:
        return None
    metrics.count("retrieval_cache_hits")
    return EvidencePackage.model_validate({**data, "cache_hit": True})


def put(cache_key: str, package: EvidencePackage) -> None:
    if not package.items and package.reason.startswith("retrieval temporarily"):
        return  # never cache an outage
    get_kv().set_json(cache_key, package.model_dump(mode="json"), settings.retrieval_cache_ttl_s)
