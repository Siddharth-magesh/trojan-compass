"""Circuit breaker shared by retrieval (Pinecone) and the LLM gateway (one per provider): opens after N consecutive
failures, rejects calls for a cool-down period, then lets one call probe."""

import threading
import time


class CircuitBreaker:
    def __init__(self, name: str, failures: int, open_seconds: float) -> None:
        self.name, self.failures, self.open_seconds = name, failures, open_seconds
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

    def snapshot(self) -> dict[str, object]:
        with self._lock:
            return {"name": self.name, "open": self._count >= self.failures and
                    time.monotonic() - self._opened_at < self.open_seconds, "consecutive_failures": self._count}


_registry: dict[str, CircuitBreaker] = {}
_registry_lock = threading.Lock()


def breaker(name: str, failures: int, open_seconds: float) -> CircuitBreaker:
    """One breaker per name per process, so the gateway and /api/metrics see the same instance."""
    with _registry_lock:
        if name not in _registry:
            _registry[name] = CircuitBreaker(name, failures, open_seconds)
        return _registry[name]


def all_breakers() -> list[dict[str, object]]:
    with _registry_lock:
        return [b.snapshot() for b in _registry.values()]
