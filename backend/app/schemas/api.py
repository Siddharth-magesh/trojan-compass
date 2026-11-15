"""Request and response bodies for the HTTP API."""

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    student_id: str = Field(pattern=r"^synthetic_student_\d{3}$")


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    student_id: str


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    session_id: str | None = Field(default=None, pattern=r"^[a-f0-9]{32}$")


class SessionTurn(BaseModel):
    role: str
    content: str


class SessionView(BaseModel):
    session_id: str
    turns: list[SessionTurn]
