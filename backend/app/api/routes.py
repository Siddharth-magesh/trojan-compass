"""HTTP API for the frontend (frontend/): login, SSE chat (status, answer_delta, clarification, final, error), sessions,
profile, health, readiness and metrics. Payload shapes follow frontend/src/lib/api_types.ts (see api/presenter.py)."""

import hmac
import json
import re
import time
import uuid
from collections.abc import Iterator
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.responses import StreamingResponse

from backend.app.api.presenter import final_payload, student_payload
from backend.app.config.settings import settings
from backend.app.data_store.loader import get_store
from backend.app.llm_gateway.budget import RequestBudget
from backend.app.observability import metrics
from backend.app.observability.request_log import log_request
from backend.app.orchestration.fallback import fallback_response
from backend.app.orchestration.graph import build_graph
from backend.app.resilience.circuit_breaker import all_breakers
from backend.app.retrieval.retrieval_client import retrieval_status
from backend.app.schemas.api import ChatRequest, LoginRequest, LoginResponse, SessionMessage, SessionView
from backend.app.security import rate_limit
from backend.app.security.auth import current_student, issue_token
from backend.app.session_store import sessions
from backend.app.shared_state.kv_store import kv_status
from backend.app.tools.profile_tools import get_profile, profile_summary

router = APIRouter(prefix="/api")
DELTA_WORDS = 4
DELTA_PAUSE_S = 0.015


def _sse(event: str, data: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest) -> LoginResponse:
    token = issue_token(body.student_id)
    return LoginResponse(access_token=token, student=student_payload(get_profile(body.student_id)))


def _deltas(answer: str) -> Iterator[str]:
    """Streams the verified answer in small word groups so the UI can render progressively."""
    words = re.findall(r"\S+\s*", answer)
    for i in range(0, len(words), DELTA_WORDS):
        yield _sse("answer_delta", {"text": "".join(words[i:i + DELTA_WORDS])})
        time.sleep(DELTA_PAUSE_S)


@router.post("/chat_stream")
def chat_stream(body: ChatRequest, student_id: str = Depends(current_student)) -> StreamingResponse:
    rate_limit.enforce(student_id)
    session = sessions.get_or_create(body.session_id, student_id)
    profile = get_profile(student_id)  # identity comes from the verified token only
    request_id = uuid.uuid4().hex
    state = {"request_id": request_id, "session_id": session.session_id, "student_id": student_id,
             "student_ctx": profile_summary(profile), "message": body.message, "history": sessions.history(session)}
    budget = RequestBudget(student_id=student_id)
    config = {"configurable": {"budget": budget, "store": get_store(), "profile": profile}}

    def stream() -> Iterator[str]:
        start = time.perf_counter()
        events: list[dict[str, Any]] = []
        response = None
        yield _sse("session", {"session_id": session.session_id})
        try:
            for mode, chunk in build_graph().stream(state, config=config, stream_mode=["custom", "updates"]):
                if mode == "custom":  # live step events from orchestration/progress.py
                    yield _sse("status", chunk)
                    continue
                for output in chunk.values():
                    events.extend((output or {}).get("events", []))
                    if output and output.get("response") is not None:
                        response = output["response"]
        except Exception as exc:  # never leak a stack trace to the client
            events.append({"node": "graph", "ms": 0, "status": f"error:{type(exc).__name__}"})
        response = response or fallback_response(request_id, "internal error")
        total_ms = round((time.perf_counter() - start) * 1000)
        log_request(request_id, student_id, events, budget, response.response_type, response.partial_status.overall, total_ms)
        metrics.count("requests")
        metrics.count("requests", label=response.response_type)
        metrics.observe_latency(total_ms)
        if response.response_type == "fallback":
            yield _sse("error", {"code": response.error_code or "upstream_failed", "message": response.answer})
            return
        sessions.append(session, "user", body.message)
        if response.response_type == "clarification":
            sessions.append(session, "assistant", response.answer)
            yield _sse("clarification", {"question": response.answer, "options": response.clarification_options})
            return
        final = final_payload(response)
        sessions.append(session, "assistant", response.answer, final)
        yield from _deltas(response.answer)
        yield _sse("final", final)

    return StreamingResponse(stream(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.get("/session/{session_id}", response_model=SessionView)
def get_session(session_id: str, student_id: str = Depends(current_student)) -> SessionView:
    session = sessions.get_owned(session_id, student_id)
    if session is None:
        raise HTTPException(status_code=404, detail="session not found")
    return SessionView(session_id=session.session_id, messages=[SessionMessage(**t) for t in session.turns])


@router.get("/student_profile")
def student_profile(student_id: str = Depends(current_student)) -> dict[str, Any]:
    profile = get_profile(student_id)  # own profile only: the id comes from the token, there is no id parameter
    if not profile:
        raise HTTPException(status_code=404, detail="profile not found")
    return student_payload(profile)


@router.get("/health")
def health() -> dict[str, Any]:
    store = get_store()
    return {"status": "ok", "llm_mode": settings.llm_mode, "retrieval": retrieval_status(), "state": kv_status(),
            "data_version": store.version, "records": {c: len(v) for c, v in store.by_id.items()},
            "documents": len(store.documents)}


@router.get("/ready")
def ready() -> dict[str, Any]:
    """Readiness for load balancers and autoscalers: data loaded and the shared state backend reachable."""
    store, state = get_store(), kv_status()
    if not store.by_id or not state["reachable"]:
        raise HTTPException(status_code=503, detail="not ready")
    return {"status": "ready", "state_backend": state["backend"], "data_version": store.version}


@router.get("/metrics")
def service_metrics(authorization: str = Header(default="")) -> dict[str, Any]:
    """Aggregate counters only (no message text, no student ids). Protected when METRICS_TOKEN is set."""
    token = settings.metrics_token.get_secret_value()
    if token and not hmac.compare_digest(authorization, f"Bearer {token}"):
        raise HTTPException(status_code=401, detail="metrics token required")
    return {**metrics.snapshot(), "breakers": all_breakers(), "state": kv_status(),
            "limits": {"rate_limit_per_minute": settings.rate_limit_per_minute,
                       "daily_request_quota": settings.daily_request_quota,
                       "daily_token_budget": settings.daily_token_budget},
            "caching": {"llm_cache_backend": settings.llm_cache_backend, "llm_cache_scope": settings.llm_cache_scope,
                        "retrieval_cache_ttl_s": settings.retrieval_cache_ttl_s},
            "models": {"primary": settings.primary_model, "planner": settings.planner_model or settings.primary_model,
                       "agents": settings.agent_model or settings.primary_model, "fallback": settings.fallback_model}}
