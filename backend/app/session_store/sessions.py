"""Conversation sessions on the shared state backend (memory or Redis) with trimmed history and a TTL; a session is
readable only by the student who created it, so any API worker can serve any turn."""

import uuid
from dataclasses import asdict, dataclass, field
from typing import Any

from backend.app.config.settings import settings
from backend.app.shared_state.kv_store import get_kv

MAX_STORED_TURNS = 40  # what the UI can reload; the planner only sees the last few


@dataclass
class Session:
    session_id: str
    student_id: str
    turns: list[dict[str, Any]] = field(default_factory=list)


def _key(session_id: str) -> str:
    return f"session:{session_id}"


def _ttl() -> int:
    return settings.session_ttl_hours * 3600


def _load(session_id: str | None) -> Session | None:
    data = get_kv().get_json(_key(session_id)) if session_id else None
    return Session(**data) if data else None


def _save(session: Session) -> None:
    get_kv().set_json(_key(session.session_id), asdict(session), _ttl())


def get_or_create(session_id: str | None, student_id: str) -> Session:
    session = _load(session_id)
    if session is None or session.student_id != student_id:  # never continue another student's session
        session = Session(session_id=uuid.uuid4().hex, student_id=student_id)
        _save(session)
    return session


def get_owned(session_id: str, student_id: str) -> Session | None:
    session = _load(session_id)
    return session if session and session.student_id == student_id else None


def append(session: Session, role: str, content: str, final: dict[str, Any] | None = None) -> None:
    """Stores the full final payload for the UI; history() gives the planner text only."""
    session.turns.append({"role": role, "content": content[:4000], **({"final": final} if final else {})})
    session.turns = session.turns[-MAX_STORED_TURNS:]
    _save(session)


def history(session: Session) -> list[dict[str, str]]:
    """Trimmed role/content pairs sent to the planner (no cards, citations or long answers)."""
    return [{"role": t["role"], "content": t["content"][:500]} for t in session.turns[-settings.session_history_turns * 2:]]
