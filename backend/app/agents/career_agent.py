"""Career agent: on-campus jobs, research openings and career resources."""

from typing import Any

from backend.app.agents.base_agent import AgentSpec, PlannedCall, define_agent

VISA_RULE_WORDS = ("international", "f-1", "f1", "cpt", "opt", "visa", "hours per week", "eligib")

SKILL_WORDS = ["software", "research", "machine learning", "data", "python", "web", "robotics", "technical",
               "engineering", "student worker", "assistant", "ai"]


def heuristic(sub_query: str, student_ctx: dict[str, Any]) -> list[PlannedCall]:
    text = sub_query.lower()
    keywords = [w for w in SKILL_WORDS if w in text] or list(student_ctx.get("job_interests", []))[:4] or ["technical"]
    paid = any(w in text for w in ("job", "paid", "part-time", "part time", "work"))
    calls: list[PlannedCall] = [("search_opportunities", {"keywords": keywords[:6], "paid_only": paid})]
    if any(w in text for w in VISA_RULE_WORDS):  # work-authorization rules live in guides, not job records
        calls.append(("knowledge_retrieval", {"query": sub_query[:200]}))
    return calls


SPEC = define_agent(AgentSpec(name="career", categories=["opportunities", "research_labs", "career_resources"],
                              heuristic=heuristic))
