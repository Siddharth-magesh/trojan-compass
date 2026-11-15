"""Typed boundaries for career records, provenance, and ingestion configuration."""

from datetime import date
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, JsonValue, StringConstraints

Text = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
Identifier = Annotated[str, StringConstraints(pattern=r"^[a-z0-9_]+$")]
RecruitmentStatus = Literal["active", "upcoming", "closed", "unverified", "no_opening_verified", "interest_only", "not_recruiting"]


class DataModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Meta(DataModel):
    title: Text
    summary: Text
    source_name: Identifier
    source_url: HttpUrl
    collected_by: Text
    collected_date: date
    last_verified_date: date
    academic_year: Annotated[str, StringConstraints(pattern=r"^\d{4}-\d{4}$")]
    version: int = Field(ge=1)
    status: Literal["draft", "verified", "deprecated"]
    data_origin: Literal["public_copy", "synthetic"]
    access_level: Literal["public", "synthetic_private"]
    owner_student_id: Identifier | None = None
    audience: list[Literal["all", "international", "undergraduate", "graduate"]] = Field(min_length=1)
    tags: list[Identifier] = Field(min_length=3, max_length=8)


class Evidence(DataModel):
    source_url: HttpUrl
    source_name: Identifier
    checked_date: date
    access_status: Literal["public", "gated", "fetch_failed", "rate_limited", "broken", "search_only"]
    observation: Text


class SourceChecks(DataModel):
    purpose: Text
    checks: list[Evidence]


class CareerRecord(DataModel):
    title: Text
    description: Text
    source_name: Identifier
    source_url: HttpUrl
    last_verified_date: date
    evidence: list[Evidence] = Field(min_length=1)
    verification_notes: Text
    tags: list[Identifier] = Field(min_length=3, max_length=8)


class ResearchLab(CareerRecord):
    lab_id: Identifier
    principal_investigator: Text
    official_url: HttpUrl
    research_areas: list[Text] = Field(min_length=1)
    recruitment_status: RecruitmentStatus
    opportunity_types: list[Literal["paid_employment", "directed_research", "volunteer", "unpaid_research", "expression_of_interest", "unspecified"]]
    invited_levels: list[Literal["undergraduate", "masters", "phd", "unverified"]]
    compensation_status: Literal["paid", "unpaid", "not_stated", "varies"]
    application_instructions: Text
    required_skills: list[Text] = Field(default_factory=list)
    recruitment_contact: Text | None = None


class Opportunity(CareerRecord):
    opportunity_id: Identifier
    organization: Text
    opportunity_type: Literal["paid_employment", "research", "unpaid_research", "volunteer", "internship", "event"]
    recruitment_status: RecruitmentStatus
    status_reason: Text
    compensation_status: Literal["paid", "unpaid", "not_stated"]
    international_eligibility: Literal["yes", "no", "unverified"]
    student_eligibility: list[Text] = Field(min_length=1)
    required_skills: list[Text] = Field(default_factory=list)
    application_instructions: Text
    apply_url: HttpUrl
    lab_id: Identifier | None = None
    recruitment_contact: Text | None = None
    location: Text | None = None
    posting_date: date | None = None
    deadline: date | None = None
    start_date: date | None = None
    end_date: date | None = None
    hourly_pay_usd: float | None = Field(default=None, ge=0)
    annual_pay_by_location_usd: dict[str, float] | None = None
    hours_per_week: float | None = Field(default=None, gt=0, le=168)
    break_hours_per_week: float | None = Field(default=None, gt=0, le=168)
    duration_weeks: int | None = Field(default=None, gt=0)
    commitment_months: int | None = Field(default=None, gt=0)


class CareerResource(CareerRecord):
    resource_id: Identifier
    resource_type: Literal["campus_employer", "job_platform", "career_service", "networking", "research_program", "student_organization", "policy"]
    official_url: HttpUrl
    account_requirements: Text
    access_status: Literal["public", "gated", "fetch_failed", "search_only"]
    search_functionality: Text
    usage_steps: list[Text] = Field(min_length=1)
    recruitment_status: RecruitmentStatus
    eligibility_notes: Text
    numerical_facts: dict[Identifier, float] | None = None


class JobListing(CareerRecord):
    job_id: Identifier
    employer: Text
    job_type: Text
    location: Text
    hourly_pay_usd: float = Field(ge=0)
    hours_per_week: float = Field(gt=0, le=168)
    required_skills: list[Text]
    international_eligibility: Literal["yes", "no", "unverified"]
    deadline: date
    apply_url: HttpUrl
    recruitment_status: RecruitmentStatus


class Category(DataModel):
    domain: Identifier
    file_type: Literal["records", "document"]
    schema_name: str | None = Field(default=None, alias="schema")
    id_field: str | None = None
    search_template: str | None = None
    filter_fields: list[str] = Field(default_factory=list)


class Source(DataModel):
    url: HttpUrl
    owner: Text
    authority: Literal["official", "third_party", "synthetic"]
    status: Literal["in_progress", "verified", "inaccessible"]


class RecordFile(DataModel):
    purpose: Text
    meta: Meta
    records: list[dict[str, JsonValue]]


class GoldenQuery(DataModel):
    query: Text
    domain: Literal["career"]
    type: Literal["semantic", "exact", "filter", "negative"]
    expected_doc_ids: list[str]


record_models = {"research_lab": ResearchLab, "career_opportunity": Opportunity,
                 "career_resource": CareerResource, "job_listing": JobListing}
