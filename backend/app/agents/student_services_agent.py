"""Student services agent: USC service directory, onboarding guides and the pre-semester checklist."""

from typing import Any

from backend.app.agents.base_agent import AgentSpec, PlannedCall, define_agent

CHECKLIST_KEYWORDS = ["new student", "checklist", "insurance", "immunization", "payment", "uscard"]
TOPIC_WORDS = ["insurance", "health", "immunization", "payment", "tuition", "uscard", "card", "tax", "meal", "ssn", "bill"]


def heuristic(sub_query: str, student_ctx: dict[str, Any]) -> list[PlannedCall]:
    text = sub_query.lower()
    topics = [w for w in TOPIC_WORDS if w in text]
    guide_keywords = CHECKLIST_KEYWORDS if ("checklist" in text or "arriv" in text or not topics) else topics
    return [("list_services", {"keywords": topics[:6]}), ("list_guides", {"keywords": guide_keywords[:6]})]


SPEC = define_agent(AgentSpec(name="student_services",
                              categories=["service_directory", "international_students", "student_policies"],
                              heuristic=heuristic))
