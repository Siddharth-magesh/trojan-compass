"""Permission-scoped in-memory TTL cache for evidence packages (no Redis); keys never include raw student data."""

import json
import threading
import time

from backend.app.config.settings import settings
from backend.app.schemas.retrieval import EvidencePackage, RetrievalRequest

MAX_ENTRIES = 256
_store: dict[str, tuple[float, EvidencePackage]] = {}
_lock = threading.Lock()


def key(normalized_query: str, year: str, request: RetrievalRequest, strategy: str) -> str:
    """Access scope is part of the key, so a future private scope can never be served a public-scope entry or vice versa."""
    return json.dumps([normalized_query, request.scope.access_levels, year, sorted(request.domains), strategy,
                       request.alpha, sorted(request.categories), sorted(request.chunk_types), request.numeric_filters,
                       request.top_n, settings.retrieval_reranker], sort_keys=True)


def get(cache_key: str) -> EvidencePackage | None:
    with _lock:
        entry = _store.get(cache_key)
        if entry is None or entry[0] < time.monotonic():
            _store.pop(cache_key, None)
            return None
        return entry[1].model_copy(deep=True, update={"cache_hit": True})


def put(cache_key: str, package: EvidencePackage) -> None:
    if not package.items and package.reason.startswith("retrieval temporarily"):
        return  # never cache an outage
    with _lock:
        if len(_store) >= MAX_ENTRIES:
            _store.pop(next(iter(_store)))  # oldest insertion first
        _store[cache_key] = (time.monotonic() + settings.retrieval_cache_ttl_s, package.model_copy(deep=True))
