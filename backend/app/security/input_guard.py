"""Deterministic input guard: length/format checks and prompt-injection patterns (never an LLM decision)."""

import re
import unicodedata

from pydantic import BaseModel

from backend.app.config.settings import settings

INJECTION_PATTERNS = [
    r"ignore (all |any )?(previous|prior|above) (instructions|prompts|rules)",
    r"disregard (the |your )?(system|previous) (prompt|instructions)",
    r"(reveal|print|show|repeat) (your |the )?(system|hidden) (prompt|instructions)",
    r"\byou are now\b", r"\bdeveloper mode\b", r"\bjailbreak\b", r"\bact as (an? )?(admin|system|developer)\b",
    r"student_id\s*[:=]", r"<\s*/?\s*(system|assistant)\s*>",
]
_INJECTION = re.compile("|".join(INJECTION_PATTERNS), re.IGNORECASE)


class GuardResult(BaseModel):
    ok: bool
    reason: str = ""
    sanitized: str = ""


def check_input(message: str) -> GuardResult:
    text = "".join(ch for ch in unicodedata.normalize("NFKC", message) if ch.isprintable() or ch in "\n\t").strip()
    if not text:
        return GuardResult(ok=False, reason="empty message")
    if len(text) > settings.max_message_chars:
        return GuardResult(ok=False, reason="message too long")
    if re.search(r"(.)\1{40,}", text):
        return GuardResult(ok=False, reason="repeated characters")
    if _INJECTION.search(text):
        return GuardResult(ok=False, reason="possible prompt injection")
    return GuardResult(ok=True, sanitized=text)
