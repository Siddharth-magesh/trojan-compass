"""Internal structured response produced by the graph. Cards and citations are built in code, never by the LLM.
The HTTP API does not send this directly: api/presenter.py maps it to the frontend contract (frontend/
src/lib/api_types.ts: numbered citations, citation_ids on cards, checklist groups, partial_status {status, missing}).

Shape: {schema_version, request_id, response_type, answer, cards[], citations[], freshness_notes[], partial_status,
follow_ups[], clarification_options[], error_code}.
response_type: "answer" | "clarification" (answer holds the question) | "fallback" (minimal safe answer).
cards[].type: "course" | "housing" | "job" | "lab" | "service" | "checklist". Unknown facts stay as the strings
"TBA", "unverified", "not_listed" or "unknown"; the frontend should show them, not hide them.
partial_status.overall: "complete" | "partial" (some domain had no data or failed) | "unverified" (checks failed).
"""

from typing import Annotated, Literal

from pydantic import BaseModel, Field

Unknownable = float | int | str  # a number when known, otherwise "unknown"/"not_listed"/"unverified"


class Citation(BaseModel):
    source_name: str
    url: str
    verified_date: str
    title: str = ""          # file or guide title (shown in the UI's source list)
    authority: str = ""      # official | third_party (from registry/sources.json)


class SectionSummary(BaseModel):
    section_id: str
    sis_section_id: str
    term: str
    section_type: str
    days: list[str]
    start_time: str
    end_time: str
    instructor: str
    d_clearance_required: bool


class CourseCard(BaseModel):
    type: Literal["course"] = "course"
    course_id: str
    title: str
    units: Unknownable
    prerequisite_text: str
    prerequisite_status: Literal["met", "missing", "unknown", "none"]
    prerequisite_courses: list[dict[str, str]] = Field(default_factory=list)  # [{course_id, status: met|missing|unknown}]
    level: str = ""
    terms_offered: list[str] = Field(default_factory=list)
    missing_prerequisites: list[str] = Field(default_factory=list)
    unknown_prerequisites: list[str] = Field(default_factory=list)
    sections: list[SectionSummary] = Field(default_factory=list)
    schedule_conflicts: list[str] = Field(default_factory=list)
    d_clearance_note: str = "unknown"
    source: Citation


class HousingCard(BaseModel):
    type: Literal["housing"] = "housing"
    listing_id: str
    name: str
    monthly_rent_usd: Unknownable
    bedrooms: Unknownable
    rent_per_person_usd: Unknownable = "unknown"
    distance_to_campus_miles: Unknownable
    neighborhood: str
    source: Citation


class JobCard(BaseModel):
    type: Literal["job"] = "job"
    job_id: str
    title: str
    organization: str
    opportunity_type: str
    hourly_pay_usd: Unknownable
    hours_per_week: Unknownable
    recruitment_status: str
    international_eligibility: str  # copied from the record, never inferred
    apply_url: str
    source: Citation


class LabCard(BaseModel):
    type: Literal["lab"] = "lab"
    lab_id: str
    title: str
    principal_investigator: str
    research_areas: list[str] = Field(default_factory=list)
    recruitment_status: str          # copied from the record (e.g. interest_only, not_stated); never inferred
    invited_levels: list[str] = Field(default_factory=list)
    compensation_status: str
    application_instructions: str
    official_url: str
    source: Citation


class ServiceCard(BaseModel):
    type: Literal["service"] = "service"
    service_id: str
    name: str
    purpose: str
    official_url: str
    login_required: bool | str
    source: Citation


class ChecklistItem(BaseModel):
    text: str
    domain: str
    source: Citation


class ChecklistCard(BaseModel):
    type: Literal["checklist"] = "checklist"
    title: str
    items: list[ChecklistItem]


Card = Annotated[CourseCard | HousingCard | JobCard | LabCard | ServiceCard | ChecklistCard, Field(discriminator="type")]


class AgentStatus(BaseModel):
    status: Literal["ok", "partial", "failed", "skipped"]
    reason: str = ""


class PartialStatus(BaseModel):
    overall: Literal["complete", "partial", "unverified"] = "complete"
    agents: dict[str, AgentStatus] = Field(default_factory=dict)


class StructuredResponse(BaseModel):
    schema_version: Literal["1.0"] = "1.0"
    request_id: str
    response_type: Literal["answer", "clarification", "fallback"]
    answer: str = Field(max_length=4000)
    cards: list[Card] = Field(default_factory=list)
    citations: list[Citation] = Field(default_factory=list)
    freshness_notes: list[str] = Field(default_factory=list)
    partial_status: PartialStatus = Field(default_factory=PartialStatus)
    follow_ups: list[str] = Field(default_factory=list)
    clarification_options: list[str] = Field(default_factory=list)
    error_code: Literal["guard_blocked", "upstream_failed"] | None = None
