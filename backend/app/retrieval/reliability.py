"""Reliability for Pinecone calls: per-call timeout, one bounded retry with jitter, and a simple circuit breaker."""

import random
import threading
import time
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from typing import TypeVar

from backend.app.config.settings import settings

T = TypeVar("T")
_POOL = ThreadPoolExecutor(max_workers=8, thread_name_prefix="retrieval")


class RetrievalUnavailable(RuntimeError):
    """Pinecone failed twice or the circuit is open; the pipeline returns an insufficient package instead of raising."""


class CircuitBreaker:
    """Opens after N consecutive failures and rejects calls for a cool-down period, then lets one call probe."""

    def __init__(self, failures: int, open_seconds: float) -> None:
        self.failures, self.open_seconds = failures, open_seconds
        self._count, self._opened_at = 0, 0.0
        self._lock = threading.Lock()

    def allow(self) -> bool:
        with self._lock:
            return self._count < self.failures or time.monotonic() - self._opened_at >= self.open_seconds

    def record(self, ok: bool) -> None:
        with self._lock:
            if ok:
                self._count = 0
            else:
                self._count += 1
                if self._count >= self.failures:
                    self._opened_at = time.monotonic()

    @property
    def is_open(self) -> bool:
        return not self.allow()


BREAKER = CircuitBreaker(settings.retrieval_breaker_failures, settings.retrieval_breaker_open_s)


def call(fn: Callable[[], T], timeout_s: float | None = None) -> T:
    """Run fn with a timeout; retry once after 100-300 ms jitter; count the outcome in the shared breaker."""
    if not BREAKER.allow():
        raise RetrievalUnavailable("circuit open after repeated Pinecone failures")
    timeout_s = timeout_s or settings.retrieval_timeout_s
    last: Exception | None = None
    for attempt in range(2):
        future = _POOL.submit(fn)
        try:
            result = future.result(timeout=timeout_s)
            BREAKER.record(True)
            return result
        except Exception as exc:  # timeout or SDK error
            last = exc
            if attempt == 0:
                time.sleep(random.uniform(0.1, 0.3))
    BREAKER.record(False)
    raise RetrievalUnavailable(f"pinecone call failed twice ({type(last).__name__})")
