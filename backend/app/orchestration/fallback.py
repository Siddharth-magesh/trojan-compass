"""Safe fallback responses used when planning, synthesis or a guard fails."""

from backend.app.schemas.response import AgentStatus, PartialStatus, StructuredResponse

FALLBACK_TEXT = ("I couldn't complete this request reliably right now. Please try again in a moment, or contact the "
                 "relevant USC office directly through https://www.usc.edu.")


def fallback_response(request_id: str, reason: str) -> StructuredResponse:
    return StructuredResponse(request_id=request_id, response_type="fallback", answer=FALLBACK_TEXT,
                              partial_status=PartialStatus(overall="unverified",
                                                           agents={"system": AgentStatus(status="failed", reason=reason[:200])}))


def clarification_response(request_id: str, question: str) -> StructuredResponse:
    return StructuredResponse(request_id=request_id, response_type="clarification", answer=question)
