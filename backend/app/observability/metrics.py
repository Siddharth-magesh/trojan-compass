"""Aggregate service metrics for /api/metrics: counters live in the shared state backend (global across workers when Redis
is used); latency percentiles are per worker. Never stores message text or student identifiers."""

import threading
from collections import deque
from datetime import datetime, timezone
from typing import Any

from backend.app.shared_state.kv_store import get_kv

COUNTER_TTL_S = 8 * 24 * 3600
COUNTERS = ("requests", "rate_limited", "quota_exceeded", "llm_calls_live", "llm_cache_hits", "llm_tokens",
            "llm_breaker_skips", "retrieval_queries", "retrieval_cache_hits")
_latencies: deque[int] = deque(maxlen=1000)
_lock = threading.Lock()


def _day() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def count(name: str, amount: int = 1, label: str = "") -> None:
    """Daily counter, e.g. count("requests", label="answer"); failures to reach the backend never break a request."""
    try:
        get_kv().incr(f"metrics:{_day()}:{name}{':' + label if label else ''}", amount, COUNTER_TTL_S)
    except Exception:
        pass


def observe_latency(ms: int) -> None:
    with _lock:
        _latencies.append(ms)


def _percentile(values: list[int], q: float) -> int | None:
    if not values:
        return None
    values = sorted(values)
    return values[min(len(values) - 1, int(round(q * (len(values) - 1))))]


def snapshot() -> dict[str, Any]:
    kv, day = get_kv(), _day()
    counters = {name: kv.get_int(f"metrics:{day}:{name}") for name in COUNTERS}
    by_type = {t: kv.get_int(f"metrics:{day}:requests:{t}") for t in ("answer", "clarification", "fallback")}
    with _lock:
        recent = list(_latencies)
    llm_total = counters["llm_calls_live"] + counters["llm_cache_hits"]
    ret_total = counters["retrieval_queries"]
    return {
        "day_utc": day,
        "counters": counters,
        "requests_by_type": by_type,
        "llm_cache_hit_rate": round(counters["llm_cache_hits"] / llm_total, 3) if llm_total else None,
        "retrieval_cache_hit_rate": round(counters["retrieval_cache_hits"] / ret_total, 3) if ret_total else None,
        "latency_ms_this_worker": {"n": len(recent), "p50": _percentile(recent, 0.5), "p95": _percentile(recent, 0.95)},
    }
