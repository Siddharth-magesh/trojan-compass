"""In-memory sliding-window rate limit per student (default 20 requests per minute)."""

import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException

from backend.app.config.settings import settings

_hits: dict[str, deque[float]] = defaultdict(deque)
_lock = threading.Lock()


def enforce(student_id: str) -> None:
    now = time.monotonic()
    with _lock:
        window = _hits[student_id]
        while window and now - window[0] > 60:
            window.popleft()
        if len(window) >= settings.rate_limit_per_minute:
            raise HTTPException(status_code=429, detail="rate limit exceeded, try again in a minute")
        window.append(now)
