"""Safe fallback responses used when planning, synthesis or a guard fails."""

from typing import Literal

from backend.app.schemas.response import AgentStatus, PartialStatus, StructuredResponse

DEFAULT_OPTIONS = ["Courses and registration", "Housing", "Jobs and research", "USC services and onboarding"]

FALLBACK_TEXT = ("I couldn't complete this request reliably right now. Please try again in a moment, or contact the "
                 "relevant USC office directly through https://www.usc.edu.")


GUARD_TEXT = "I can't help with that request. Please rephrase your question about USC courses, housing, jobs or services."


def fallback_response(request_id: str, reason: str,
                      code: Literal["guard_blocked", "upstream_failed"] = "upstream_failed") -> StructuredResponse:
    return StructuredResponse(request_id=request_id, response_type="fallback", error_code=code,
                              answer=GUARD_TEXT if code == "guard_blocked" else FALLBACK_TEXT,
                              partial_status=PartialStatus(overall="unverified",
                                                           agents={"system": AgentStatus(status="failed", reason=reason[:200])}))


def clarification_response(request_id: str, question: str, options: list[str] | None = None) -> StructuredResponse:
    return StructuredResponse(request_id=request_id, response_type="clarification", answer=question,
                              clarification_options=(options or DEFAULT_OPTIONS)[:4])
