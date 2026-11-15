"""Academic tools: course lookup and search, prerequisite status, sections and schedule conflicts (all deterministic)."""

import re
from itertools import product
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from backend.app.config.settings import settings
from backend.app.data_store.loader import DataStore
from backend.app.schemas.agent_result import RecordRef
from backend.app.schemas.response import CourseCard, SectionSummary
from backend.app.tools.tool_registry import ToolContext, ToolOutput, tool

Term = Literal["Fall 2026", "Spring 2027"]
UNKNOWN_TIMES = {"TBA", "", "unknown", "not_listed"}


def normalize_course_id(raw: str) -> str:
    match = re.match(r"\s*([A-Za-z]{2,5})\s*-?\s*(\d{3}[A-Za-z]?)\s*$", raw)
    return f"{match.group(1).upper()} {match.group(2).upper()}" if match else raw.strip().upper()


class CourseIdsInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    course_ids: list[str] = Field(min_length=1, max_length=4, description="Course ids such as 'CSCI 570'")

    @field_validator("course_ids")
    @classmethod
    def _norm(cls, v: list[str]) -> list[str]:
        return list(dict.fromkeys(normalize_course_id(c) for c in v))


class TermCoursesInput(CourseIdsInput):
    term: Term = Field(default=settings.default_term)


class SearchCoursesInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    query: str = Field(min_length=2, max_length=80, description="Topic keywords, e.g. 'machine learning'")
    level: Literal["undergraduate", "graduate"] | None = None


def prerequisite_status(course: dict[str, Any], completed: set[str], store: DataStore) -> tuple[str, list[str], list[str]]:
    """met / missing / unknown / none. A group whose unmet options include a course absent from verified data is unknown."""
    groups = course.get("prerequisite_groups") or []
    if not groups:
        return "none", [], []
    missing, unknown = [], []
    for group in groups:
        options = group.get("one_of", [])
        if sum(o in completed for o in options) >= group.get("required_count", 1):
            continue
        absent = [o for o in options if store.get("courses", o) is None]
        if absent:
            unknown.extend(absent)
        else:
            missing.append(" or ".join(options))
    return ("missing" if missing else "unknown" if unknown else "met"), missing, sorted(set(unknown))


def _sections(store: DataStore, course_id: str, term: str) -> list[dict[str, Any]]:
    rows = [s for s in store.records("course_sections") if s.get("course_id") == course_id and s.get("term") == term]
    return sorted(rows, key=lambda s: (s.get("section_type") != "lecture", s.get("start_time", "")))


def _section_summary(s: dict[str, Any]) -> SectionSummary:
    return SectionSummary(section_id=str(s["section_id"]), sis_section_id=str(s.get("sis_section_id", "not_listed")),
                          term=str(s.get("term", "unknown")), section_type=str(s.get("section_type", "unknown")),
                          days=[str(d) for d in s.get("days", [])], start_time=str(s.get("start_time", "TBA")),
                          end_time=str(s.get("end_time", "TBA")), instructor=str(s.get("instructor", "not_listed")),
                          d_clearance_required=bool(s.get("d_clearance_required", False)))


def _course_output(ctx: ToolContext, course_ids: list[str], term: str | None, with_sections: bool) -> ToolOutput:
    out = ToolOutput(tool="courses")
    completed = set(ctx.profile.get("completed_courses", []))
    for cid in course_ids:
        course = ctx.store.get("courses", cid)
        if course is None:
            out.unknowns.append(f"{cid} is not in the verified {settings.academic_year} course data.")
            out.status = "not_found"
            continue
        status, missing, unknown = prerequisite_status(course, completed, ctx.store)
        sections = [_section_summary(s) for s in _sections(ctx.store, cid, term)[:4]] if with_sections and term else []
        citation = ctx.store.citation("courses", cid)
        card = CourseCard(course_id=cid, title=str(course.get("title", cid)), units=course.get("units", "unknown"),
                          prerequisite_text=str(course.get("prerequisite_text", "unknown")),
                          prerequisite_status=status, missing_prerequisites=missing, unknown_prerequisites=unknown,
                          sections=sections, d_clearance_note=str(course.get("d_clearance_note", "unknown")),
                          source=citation)
        out.cards.append(card.model_dump())
        out.records.append(RecordRef(category="courses", record_id=cid))
        out.citations.append(citation)
        out.facts.append(f"{cid} {card.title}: {card.units} units. {card.prerequisite_text} Prerequisite status for "
                         f"this student: {status}. {card.d_clearance_note}")
        if unknown:
            out.unknowns.append(f"{cid}: prerequisite(s) {', '.join(unknown)} are not in our verified data, so status is unknown.")
        if with_sections:
            if not sections:
                out.unknowns.append(f"No {term} sections found for {cid}.")
            for s in sections:
                out.facts.append(f"{cid} {s.section_type} {s.section_id}: {'/'.join(s.days) or 'TBA'} "
                                 f"{s.start_time}-{s.end_time}, {s.instructor}")
        if course.get("d_clearance_required"):
            out.checklist.append({"text": f"Request D-clearance for {cid} before registering.", "domain": "academic",
                                  "source": citation.model_dump()})
        if status == "missing":
            out.checklist.append({"text": f"Resolve missing prerequisites for {cid}: {'; '.join(missing)}.",
                                  "domain": "academic", "source": citation.model_dump()})
    return out


@tool("get_courses", "Course details and this student's prerequisite status for up to 4 course ids.", CourseIdsInput)
def get_courses(args: CourseIdsInput, ctx: ToolContext) -> ToolOutput:
    return _course_output(ctx, args.course_ids, None, with_sections=False).model_copy(update={"tool": "get_courses"})


@tool("find_sections", "Lecture/lab sections (days, times, instructor) for up to 4 courses in a term.", TermCoursesInput)
def find_sections(args: TermCoursesInput, ctx: ToolContext) -> ToolOutput:
    return _course_output(ctx, args.course_ids, args.term, with_sections=True).model_copy(update={"tool": "find_sections"})


@tool("search_courses", "Find courses by topic keywords; returns up to 5 matching course ids and titles.", SearchCoursesInput)
def search_courses(args: SearchCoursesInput, ctx: ToolContext) -> ToolOutput:
    words = [w for w in re.findall(r"[a-z0-9]+", args.query.lower()) if len(w) > 2]
    scored = []
    for course in ctx.store.records("courses"):
        if args.level and course.get("level") != args.level:
            continue
        hay = f"{course.get('title', '')} {' '.join(course.get('tags', []))}".lower()
        score = sum(w in hay for w in words)
        if score:
            scored.append((score, course["course_id"]))
    top = [cid for _, cid in sorted(scored, key=lambda x: (-x[0], x[1]))[:5]]
    out = _course_output(ctx, top, None, with_sections=False).model_copy(update={"tool": "search_courses"})
    if not top:
        out.status = "not_found"
        out.unknowns.append(f"No verified courses match '{args.query}'.")
    return out


def _overlap(a: dict[str, Any], b: dict[str, Any]) -> bool | None:
    """True/False when both sections have known days and times; None when either is TBA."""
    if {a.get("start_time"), a.get("end_time"), b.get("start_time"), b.get("end_time")} & UNKNOWN_TIMES:
        return None
    if not a.get("days") or not b.get("days") or "TBA" in a["days"] + b["days"]:
        return None
    same_day = set(a["days"]) & set(b["days"])
    return bool(same_day) and a["start_time"] < b["end_time"] and b["start_time"] < a["end_time"]


@tool("check_schedule_conflicts", "Check lecture time conflicts between 2-4 courses in a term.", TermCoursesInput)
def check_schedule_conflicts(args: TermCoursesInput, ctx: ToolContext) -> ToolOutput:
    out = _course_output(ctx, args.course_ids, args.term, with_sections=True).model_copy(update={"tool": "check_schedule_conflicts"})
    lectures = {cid: [s for s in _sections(ctx.store, cid, args.term) if s.get("section_type") == "lecture"]
                for cid in args.course_ids if ctx.store.get("courses", cid)}
    ids = list(lectures)
    conflicts: dict[str, list[str]] = {cid: [] for cid in ids}
    for i, a_id in enumerate(ids):
        for b_id in ids[i + 1:]:
            pairs = list(product(lectures[a_id], lectures[b_id]))
            results = [_overlap(a, b) for a, b in pairs]
            if not pairs:
                out.unknowns.append(f"{a_id} / {b_id}: no {args.term} lectures listed for both, conflict unknown.")
            elif any(r is False for r in results):
                out.facts.append(f"{a_id} and {b_id} have at least one conflict-free lecture combination in {args.term}.")
            elif all(r is True for r in results):
                out.facts.append(f"Every {args.term} lecture of {a_id} conflicts with every lecture of {b_id}.")
                conflicts[a_id].append(f"All lectures conflict with {b_id}")
                conflicts[b_id].append(f"All lectures conflict with {a_id}")
            else:
                out.unknowns.append(f"{a_id} / {b_id}: some lecture times are TBA, so a conflict cannot be ruled out.")
    for card in out.cards:
        card["schedule_conflicts"] = conflicts.get(card["course_id"], [])
    out.facts.append("Conflicts were checked for lectures only; labs, discussions and quizzes were not checked.")
    return out
