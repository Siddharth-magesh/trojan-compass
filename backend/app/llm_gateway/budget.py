"""Per-request and per-process LLM call caps, a per-student daily token budget and a usage log; exceeding a cap makes
callers return the safe fallback."""

import threading
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from backend.app.config.settings import settings
from backend.app.observability import metrics
from backend.app.shared_state.kv_store import get_kv


class BudgetExceeded(RuntimeError):
    """Raised before a call that would exceed the request or process cap."""


_process_lock = threading.Lock()
_process_calls = 0


@dataclass
class RequestBudget:
    max_calls: int = settings.max_llm_calls_per_request
    calls: int = 0
    usage: list[dict[str, Any]] = field(default_factory=list)  # one entry per call: task, model, tokens, latency, cached
    student_id: str | None = None  # set by the API so live tokens count against that student's daily budget
    _lock: threading.Lock = field(default_factory=threading.Lock, repr=False)

    def charge(self) -> None:
        """Count one billable/mock call against both caps; cache hits are never charged."""
        global _process_calls
        with self._lock, _process_lock:
            if self.calls >= self.max_calls:
                raise BudgetExceeded(f"request cap of {self.max_calls} LLM calls reached")
            if _process_calls >= settings.max_llm_calls_per_process:
                raise BudgetExceeded(f"process cap of {settings.max_llm_calls_per_process} LLM calls reached")
            if self.student_id and settings.daily_token_budget and self.tokens_today() >= settings.daily_token_budget:
                metrics.count("quota_exceeded")
                raise BudgetExceeded("daily LLM token budget reached for this student")
            self.calls += 1
            _process_calls += 1

    def record(self, entry: dict[str, Any]) -> None:
        with self._lock:
            self.usage.append(entry)
        tokens = entry.get("prompt_tokens", 0) + entry.get("completion_tokens", 0)
        if entry.get("cached"):
            metrics.count("llm_cache_hits")
        elif entry.get("ok") and entry.get("model") != "mock":
            metrics.count("llm_calls_live")
            metrics.count("llm_tokens", tokens)
            if self.student_id and tokens:
                get_kv().incr(_token_key(self.student_id), tokens, 26 * 3600)

    def tokens_today(self) -> int:
        return get_kv().get_int(_token_key(self.student_id)) if self.student_id else 0

    @property
    def remaining(self) -> int:
        return self.max_calls - self.calls


def _token_key(student_id: str | None) -> str:
    return f"quota:tokens:{student_id}:{datetime.now(timezone.utc).strftime('%Y-%m-%d')}"
