"""Disk cache for LLM responses keyed by a hash of (model, messages, tools, options), so repeated runs cost nothing."""

import hashlib
import json
from typing import Any

from backend.app.config.settings import settings


def cache_key(model: str, messages: list[dict[str, Any]], tools: list[dict[str, Any]] | None, options: dict[str, Any]) -> str:
    payload = json.dumps({"model": model, "messages": messages, "tools": tools, "options": options},
                         sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def get(key: str) -> dict[str, Any] | None:
    path = settings.llm_cache_dir / f"{key}.json"
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None


def put(key: str, value: dict[str, Any]) -> None:
    settings.llm_cache_dir.mkdir(parents=True, exist_ok=True)
    (settings.llm_cache_dir / f"{key}.json").write_text(json.dumps(value, ensure_ascii=False), encoding="utf-8")
