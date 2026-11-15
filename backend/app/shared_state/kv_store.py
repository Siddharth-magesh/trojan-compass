"""Shared key-value state for sessions, rate limits, quotas, caches and counters: in-process memory by default, Redis when
STATE_BACKEND=redis so several API workers or hosts share one view (C4 autoscaling). Falls back to memory if Redis is down."""

import json
import logging
import threading
import time
from collections import OrderedDict
from functools import lru_cache
from typing import Any, Protocol

from backend.app.config.settings import settings

log = logging.getLogger(__name__)


class KVStore(Protocol):
    name: str

    def get_json(self, key: str) -> Any | None: ...
    def set_json(self, key: str, value: Any, ttl_s: int) -> None: ...
    def incr(self, key: str, amount: int, ttl_s: int) -> int: ...
    def get_int(self, key: str) -> int: ...
    def ping(self) -> bool: ...


class MemoryKV:
    """Thread-safe dict with per-key expiry and a size bound (oldest entries evicted first)."""

    name = "memory"

    def __init__(self, max_entries: int) -> None:
        self._data: OrderedDict[str, tuple[float, Any]] = OrderedDict()
        self._max = max_entries
        self._lock = threading.Lock()

    def _live(self, key: str) -> Any | None:
        entry = self._data.get(key)
        if entry is None:
            return None
        if entry[0] < time.monotonic():
            del self._data[key]
            return None
        return entry[1]

    def _put(self, key: str, value: Any, ttl_s: int) -> None:
        self._data[key] = (time.monotonic() + ttl_s, value)
        self._data.move_to_end(key)
        while len(self._data) > self._max:
            self._data.popitem(last=False)

    def get_json(self, key: str) -> Any | None:
        with self._lock:
            value = self._live(key)
        return None if value is None else json.loads(value)

    def set_json(self, key: str, value: Any, ttl_s: int) -> None:
        payload = json.dumps(value, ensure_ascii=False)  # stored serialized so callers never share mutable objects
        with self._lock:
            self._put(key, payload, ttl_s)

    def incr(self, key: str, amount: int, ttl_s: int) -> int:
        with self._lock:
            current = self._live(key)
            if current is None:
                self._put(key, amount, ttl_s)  # the window starts with the first hit, like Redis INCR + EXPIRE NX
                return amount
            expiry = self._data[key][0]
            self._data[key] = (expiry, current + amount)
            return current + amount

    def get_int(self, key: str) -> int:
        with self._lock:
            return int(self._live(key) or 0)

    def ping(self) -> bool:
        return True


class RedisKV:
    """Same contract on Redis; keys are prefixed so one Redis can serve several deployments. Fails open: if Redis drops
    mid-request, reads miss and writes are skipped (logged), so a state outage degrades limits/caches, not answers."""

    name = "redis"

    def __init__(self, url: str, prefix: str) -> None:
        import redis  # optional dependency, imported only when STATE_BACKEND=redis

        self._r = redis.Redis.from_url(url, socket_timeout=settings.state_timeout_s,
                                       socket_connect_timeout=settings.state_timeout_s, decode_responses=True)
        self._p = prefix
        self._last_warning = 0.0

    def _failed(self, op: str, exc: Exception) -> None:
        if time.monotonic() - self._last_warning > 30:  # at most one warning per 30 s
            self._last_warning = time.monotonic()
            log.warning("redis %s failed (%s); failing open", op, type(exc).__name__)

    def get_json(self, key: str) -> Any | None:
        try:
            raw = self._r.get(self._p + key)
        except Exception as exc:
            self._failed("get", exc)
            return None
        return None if raw is None else json.loads(raw)

    def set_json(self, key: str, value: Any, ttl_s: int) -> None:
        try:
            self._r.set(self._p + key, json.dumps(value, ensure_ascii=False), ex=ttl_s)
        except Exception as exc:
            self._failed("set", exc)

    def incr(self, key: str, amount: int, ttl_s: int) -> int:
        try:
            pipe = self._r.pipeline()
            pipe.incrby(self._p + key, amount)
            pipe.expire(self._p + key, ttl_s, nx=True)  # set the window only on the first hit (Redis 7+)
            return int(pipe.execute()[0])
        except Exception as exc:
            self._failed("incr", exc)
            return 0

    def get_int(self, key: str) -> int:
        try:
            return int(self._r.get(self._p + key) or 0)
        except Exception as exc:
            self._failed("get", exc)
            return 0

    def ping(self) -> bool:
        try:
            return bool(self._r.ping())
        except Exception:
            return False


_status: dict[str, str] = {}


@lru_cache(maxsize=1)
def get_kv() -> KVStore:
    if settings.state_backend == "redis":
        try:
            store = RedisKV(settings.redis_url.get_secret_value(), settings.state_key_prefix)
            if store.ping():
                _status.update(backend="redis", reason="connected")
                return store
            _status.update(reason="redis did not answer PING")
        except Exception as exc:  # missing package or bad URL: keep serving from memory
            _status.update(reason=f"redis unavailable ({type(exc).__name__})")
        log.warning("STATE_BACKEND=redis but %s; using in-process memory (state is per worker)", _status["reason"])
    _status.setdefault("reason", "default")
    _status["backend"] = "memory"
    return MemoryKV(settings.state_memory_max_entries)


def kv_status() -> dict[str, Any]:
    store = get_kv()
    return {"backend": store.name, "requested": settings.state_backend, "reason": _status.get("reason", ""),
            "reachable": store.ping(), "shared_across_workers": store.name == "redis"}
