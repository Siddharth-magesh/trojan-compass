"""One JSON log line per request: node timings, LLM calls and tokens, tool calls and guard events (no message text, no keys)."""

import json
import logging
import sys
from typing import Any

from backend.app.llm_gateway.budget import RequestBudget

_log = logging.getLogger("trojan_compass.requests")
if not _log.handlers:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter("%(message)s"))
    _log.addHandler(handler)
    _log.setLevel(logging.INFO)
    _log.propagate = False


def log_request(request_id: str, student_id: str, events: list[dict[str, Any]], budget: RequestBudget,
                response_type: str, overall: str, total_ms: int) -> None:
    usage = budget.usage
    _log.info(json.dumps({
        "request_id": request_id,
        "student_id": student_id,
        "response_type": response_type,
        "partial_status": overall,
        "total_ms": total_ms,
        "nodes": [{k: e[k] for k in ("node", "ms", "status") if k in e} for e in events],
        "tool_calls": [t for e in events for t in e.get("tool_calls", [])],
        "guard_events": [g for e in events for g in e.get("guard_events", [])],
        "llm": {"calls": budget.calls, "cached_hits": sum(1 for u in usage if u.get("cached")),
                "prompt_tokens": sum(u.get("prompt_tokens", 0) for u in usage),
                "completion_tokens": sum(u.get("completion_tokens", 0) for u in usage),
                "models": sorted({u.get("model", "") for u in usage}),
                "errors": [u["error"] for u in usage if u.get("error")]},
    }))
