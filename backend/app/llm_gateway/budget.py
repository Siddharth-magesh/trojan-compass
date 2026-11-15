"""Per-request and per-process LLM call caps plus a usage log; exceeding a cap makes callers return the safe fallback."""

import threading
from dataclasses import dataclass, field
from typing import Any

from backend.app.config.settings import settings


class BudgetExceeded(RuntimeError):
    """Raised before a call that would exceed the request or process cap."""


_process_lock = threading.Lock()
_process_calls = 0


@dataclass
class RequestBudget:
    max_calls: int = settings.max_llm_calls_per_request
    calls: int = 0
    usage: list[dict[str, Any]] = field(default_factory=list)  # one entry per call: task, model, tokens, latency, cached
    _lock: threading.Lock = field(default_factory=threading.Lock, repr=False)

    def charge(self) -> None:
        """Count one billable/mock call against both caps; cache hits are never charged."""
        global _process_calls
        with self._lock, _process_lock:
            if self.calls >= self.max_calls:
                raise BudgetExceeded(f"request cap of {self.max_calls} LLM calls reached")
            if _process_calls >= settings.max_llm_calls_per_process:
                raise BudgetExceeded(f"process cap of {settings.max_llm_calls_per_process} LLM calls reached")
            self.calls += 1
            _process_calls += 1

    def record(self, entry: dict[str, Any]) -> None:
        with self._lock:
            self.usage.append(entry)

    @property
    def remaining(self) -> int:
        return self.max_calls - self.calls
