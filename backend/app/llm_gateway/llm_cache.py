"""LLM response cache keyed by a hash of (model, messages, tools, options). Backend: local disk (default, replayable dev
cache) or the shared state backend with a TTL. Scope: shared (default) or student, which also keys on the student id and
the data version so personalized answers are never shared and a data update invalidates every cached answer."""

import hashlib
import json
from typing import Any

from backend.app.config.settings import settings
from backend.app.data_store.loader import get_store
from backend.app.shared_state.kv_store import get_kv


def cache_key(model: str, messages: list[dict[str, Any]], tools: list[dict[str, Any]] | None, options: dict[str, Any],
              student_id: str | None = None) -> str:
    body: dict[str, Any] = {"model": model, "messages": messages, "tools": tools, "options": options}
    if settings.llm_cache_scope == "student":
        body["scope"] = {"student": student_id or "", "data_version": get_store().version}
    payload = json.dumps(body, sort_keys=True, ensure_ascii=False)  # default scope keeps the original key format
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def get(key: str) -> dict[str, Any] | None:
    if settings.llm_cache_backend == "shared":
        return get_kv().get_json(f"llm:{key}")
    path = settings.llm_cache_dir / f"{key}.json"
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None


def put(key: str, value: dict[str, Any]) -> None:
    if settings.llm_cache_backend == "shared":
        get_kv().set_json(f"llm:{key}", value, settings.llm_cache_ttl_hours * 3600)
        return
    settings.llm_cache_dir.mkdir(parents=True, exist_ok=True)
    (settings.llm_cache_dir / f"{key}.json").write_text(json.dumps(value, ensure_ascii=False), encoding="utf-8")
