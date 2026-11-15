"""Mock JWT auth for synthetic students: the token subject is the only source of student identity in the backend."""

from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Header, HTTPException

from backend.app.config.settings import settings
from backend.app.tools.profile_tools import load_profiles

ALGORITHM = "HS256"


def issue_token(student_id: str) -> str:
    if student_id not in load_profiles():
        raise HTTPException(status_code=404, detail="unknown synthetic student")
    now = datetime.now(timezone.utc)
    payload = {"sub": student_id, "iat": now, "exp": now + timedelta(minutes=settings.jwt_ttl_minutes)}
    return jwt.encode(payload, settings.jwt_secret.get_secret_value(), algorithm=ALGORITHM)


def current_student(authorization: str = Header(default="")) -> str:
    """FastAPI dependency: returns the verified student_id or raises 401."""
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="missing bearer token")
    try:
        claims = jwt.decode(token, settings.jwt_secret.get_secret_value(), algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="invalid or expired token") from None
    student_id = claims.get("sub", "")
    if student_id not in load_profiles():
        raise HTTPException(status_code=401, detail="unknown student")
    return student_id
