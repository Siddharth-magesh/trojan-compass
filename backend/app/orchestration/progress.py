"""Live step events for the UI's activity timeline: one started and one done/failed per node, sent via LangGraph's custom stream."""

from typing import Literal

from langgraph.config import get_stream_writer

UiNode = Literal["input_guard", "supervisor", "academic_agent", "housing_agent", "career_agent",
                 "student_services_agent", "verifier", "synthesizer", "output_guard"]

LABELS: dict[str, str] = {
    "input_guard": "Checking your request", "supervisor": "Planning", "academic_agent": "Academic agent",
    "housing_agent": "Housing agent", "career_agent": "Career agent", "student_services_agent": "Student services agent",
    "verifier": "Verifying", "synthesizer": "Writing", "output_guard": "Final check",
}


def emit(node: UiNode, state: Literal["started", "done", "failed"], elapsed_ms: int | None = None) -> None:
    """No-op outside a streaming run (e.g. the CLI's invoke), so nodes can always call it."""
    try:
        writer = get_stream_writer()
    except Exception:
        return
    event = {"node": node, "state": state, "label": LABELS[node]}
    if elapsed_ms is not None:
        event["elapsed_ms"] = elapsed_ms
    writer(event)
