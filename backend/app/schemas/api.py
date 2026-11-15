"""Request and response bodies for the HTTP API."""

from typing import Any

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    student_id: str = Field(pattern=r"^synthetic_student_\d{3}$")


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    student: dict[str, Any]  # frontend student_profile shape (see api/presenter.py)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    session_id: str | None = Field(default=None, pattern=r"^[A-Za-z0-9_-]{1,64}$")  # unknown ids start a new session


class SessionMessage(BaseModel):
    role: str
    content: str
    final: dict[str, Any] | None = None  # the final_response shown for an assistant answer


class SessionView(BaseModel):
    session_id: str
    messages: list[SessionMessage]
