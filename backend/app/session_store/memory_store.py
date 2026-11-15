"""In-memory conversation sessions with trimmed history; a session is readable only by the student who created it."""

import threading
import uuid
from dataclasses import dataclass, field

from backend.app.config.settings import settings


@dataclass
class Session:
    session_id: str
    student_id: str
    turns: list[dict[str, str]] = field(default_factory=list)


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


def append(session: Session, role: str, content: str) -> None:
    with _lock:
        session.turns.append({"role": role, "content": content[:1000]})
        session.turns = session.turns[-settings.session_history_turns * 2:]
