"""HTTP API: mock login, SSE chat stream (one status event per node, then the final response), sessions, profile, health."""

import json
import time
import uuid
from collections.abc import Iterator
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from backend.app.config.settings import settings
from backend.app.data_store.loader import get_store
from backend.app.llm_gateway.budget import RequestBudget
from backend.app.observability.request_log import log_request
from backend.app.orchestration.fallback import fallback_response
from backend.app.orchestration.graph import build_graph
from backend.app.schemas.api import ChatRequest, LoginRequest, LoginResponse, SessionTurn, SessionView
from backend.app.security import rate_limit
from backend.app.security.auth import current_student, issue_token
from backend.app.session_store import memory_store
from backend.app.tools.profile_tools import get_profile, profile_summary

router = APIRouter(prefix="/api")


def _sse(event: str, data: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest) -> LoginResponse:
    return LoginResponse(access_token=issue_token(body.student_id), student_id=body.student_id)


@router.post("/chat_stream")
def chat_stream(body: ChatRequest, student_id: str = Depends(current_student)) -> StreamingResponse:
    rate_limit.enforce(student_id)
    session = memory_store.get_or_create(body.session_id, student_id)
    profile = get_profile(student_id)  # identity comes from the verified token only
    request_id = uuid.uuid4().hex
    state = {"request_id": request_id, "session_id": session.session_id, "student_id": student_id,
             "student_ctx": profile_summary(profile), "message": body.message, "history": list(session.turns)}
    budget = RequestBudget()
    config = {"configurable": {"budget": budget, "store": get_store(), "profile": profile}}

    def stream() -> Iterator[str]:
        start = time.perf_counter()
        events: list[dict[str, Any]] = []
        response = None
        yield _sse("session", {"session_id": session.session_id, "request_id": request_id})
        try:
            for update in build_graph().stream(state, config=config, stream_mode="updates"):
                for node, output in update.items():
                    for event in (output or {}).get("events", []):
                        events.append(event)
                        yield _sse("status", {k: v for k, v in event.items() if k in ("node", "status", "ms")})
                    if output and output.get("response") is not None:
                        response = output["response"]
        except Exception as exc:  # never leak a stack trace to the client
            events.append({"node": "graph", "ms": 0, "status": f"error:{type(exc).__name__}"})
        response = response or fallback_response(request_id, "internal error")
        memory_store.append(session, "user", body.message)
        memory_store.append(session, "assistant", response.answer)
        log_request(request_id, student_id, events, budget, response.response_type, response.partial_status.overall,
                    round((time.perf_counter() - start) * 1000))
        yield _sse("final", response.model_dump(mode="json"))

    return StreamingResponse(stream(), media_type="text/event-stream", headers={"Cache-Control": "no-cache"})


@router.get("/session/{session_id}", response_model=SessionView)
def get_session(session_id: str, student_id: str = Depends(current_student)) -> SessionView:
    session = memory_store.get_owned(session_id, student_id)
    if session is None:
        raise HTTPException(status_code=404, detail="session not found")
    return SessionView(session_id=session.session_id, turns=[SessionTurn(**t) for t in session.turns])


@router.get("/student_profile")
def student_profile(student_id: str = Depends(current_student)) -> dict[str, Any]:
    profile = get_profile(student_id)  # own profile only: the id comes from the token, there is no id parameter
    if not profile:
        raise HTTPException(status_code=404, detail="profile not found")
    return profile


@router.get("/health")
def health() -> dict[str, Any]:
    store = get_store()
    return {"status": "ok", "llm_mode": settings.llm_mode,
            "records": {c: len(v) for c, v in store.by_id.items()}, "documents": len(store.documents)}
