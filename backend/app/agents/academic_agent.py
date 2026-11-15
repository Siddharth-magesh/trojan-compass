"""Academic agent: courses, prerequisites, sections and schedule conflicts."""

import re
from typing import Any

from backend.app.agents.base_agent import AgentSpec, PlannedCall, define_agent

COURSE_ID = re.compile(r"\b([A-Za-z]{2,5})\s?-?(\d{3}[A-Za-z]?)\b")
DEPARTMENTS = {"CSCI", "EE", "ECE", "MATH", "ISE", "ITP", "PHYS", "BISC", "CHEM", "WRIT", "ENGR"}


def course_ids_in(text: str) -> list[str]:
    ids = [f"{d.upper()} {n.upper()}" for d, n in COURSE_ID.findall(text) if d.upper() in DEPARTMENTS]
    return list(dict.fromkeys(ids))[:4]


def heuristic(sub_query: str, student_ctx: dict[str, Any]) -> list[PlannedCall]:
    ids = course_ids_in(sub_query)
    term = "Fall 2026" if "fall" in sub_query.lower() else "Spring 2027"
    if len(ids) >= 2:
        return [("check_schedule_conflicts", {"course_ids": ids, "term": term})]
    if ids:
        return [("find_sections", {"course_ids": ids, "term": term})]
    topic = re.sub(r"[^a-z ]", " ", sub_query.lower())
    return [("search_courses", {"query": topic[:80].strip() or "course"})]


SPEC = define_agent(AgentSpec(name="academic", categories=["courses", "course_sections"], heuristic=heuristic))
