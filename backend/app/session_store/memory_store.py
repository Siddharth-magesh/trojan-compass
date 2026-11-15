"""In-memory conversation sessions with trimmed history; a session is readable only by the student who created it."""

import threading
import uuid
from dataclasses import dataclass, field
from typing import Any

from backend.app.config.settings import settings


@dataclass
class Session:
    session_id: str
    student_id: str
    turns: list[dict[str, Any]] = field(default_factory=list)


MAX_STORED_TURNS = 40  # what the UI can reload; the planner only sees the last few
_sessions: dict[str, Session] = {}
_lock = threading.Lock()


def get_or_create(session_id: str | None, student_id: str) -> Session:
    with _lock:
        session = _sessions.get(session_id or "")
        if session is None or session.student_id != student_id:
            session = Session(session_id=uuid.uuid4().hex, student_id=student_id)
            _sessions[session.session_id] = session
        return session


def get_owned(session_id: str, student_id: str) -> Session | None:
    session = _sessions.get(session_id)
    return session if session and session.student_id == student_id else None


def append(session: Session, role: str, content: str, final: dict[str, Any] | None = None) -> None:
    """Stores the full final payload for the UI; history() gives the planner text only."""
    with _lock:
        session.turns.append({"role": role, "content": content[:4000], **({"final": final} if final else {})})
        session.turns = session.turns[-MAX_STORED_TURNS:]


def history(session: Session) -> list[dict[str, str]]:
    """Trimmed role/content pairs sent to the planner (no cards, citations or long answers)."""
    return [{"role": t["role"], "content": t["content"][:500]} for t in session.turns[-settings.session_history_turns * 2:]]
