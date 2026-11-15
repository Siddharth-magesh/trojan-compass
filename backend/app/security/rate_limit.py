"""Per-student request limits on the shared state backend: a per-minute rate limit and a per-UTC-day request quota
(both enforced in code before any graph or LLM work; HTTP 429 with a clear message)."""

import time
from datetime import datetime, timezone

from fastapi import HTTPException

from backend.app.config.settings import settings
from backend.app.observability import metrics
from backend.app.shared_state.kv_store import get_kv


def enforce(student_id: str) -> None:
    kv = get_kv()
    minute = int(time.time() // 60)
    if kv.incr(f"rl:minute:{student_id}:{minute}", 1, 70) > settings.rate_limit_per_minute:
        metrics.count("rate_limited")
        raise HTTPException(status_code=429, detail="rate limit exceeded, try again in a minute")
    if settings.daily_request_quota:
        day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        if kv.incr(f"quota:requests:{student_id}:{day}", 1, 26 * 3600) > settings.daily_request_quota:
            metrics.count("quota_exceeded")
            raise HTTPException(status_code=429, detail="daily question limit reached, it resets at midnight UTC")
