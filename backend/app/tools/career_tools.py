"""Career tools: opportunity and research-lab search plus career resources; eligibility fields are copied, never inferred."""

import re
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from backend.app.schemas.agent_result import RecordRef
from backend.app.schemas.response import JobCard
from backend.app.tools.tool_registry import ToolContext, ToolOutput, tool


class KeywordInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    keywords: list[str] = Field(default_factory=list, max_length=6, description="Topic or skill keywords")


class OpportunityInput(KeywordInput):
    paid_only: bool = False


def _score(record: dict[str, Any], fields: list[str], keywords: list[str]) -> int:
    hay = " ".join(str(record.get(f, "")) for f in fields).lower()
    words = [w for k in keywords for w in re.findall(r"[a-z0-9+#]+", k.lower()) if len(w) > 1]
    return sum(w in hay for w in words) if words else 1


def _top(records: list[dict[str, Any]], fields: list[str], keywords: list[str], n: int = 5) -> list[dict[str, Any]]:
    scored = [(s, r) for r in records if (s := _score(r, fields, keywords)) > 0]
    return [r for _, r in sorted(scored, key=lambda x: -x[0])[:n]]


@tool("search_opportunities", "Search USC jobs and research openings by skill/topic keywords (paid_only filters pay).", OpportunityInput)
def search_opportunities(args: OpportunityInput, ctx: ToolContext) -> ToolOutput:
    records = ctx.store.records("opportunities")
    if args.paid_only:
        records = [r for r in records if isinstance(r.get("hourly_pay_usd"), (int, float))]
    top = _top(records, ["title", "description", "required_skills", "tags", "opportunity_type"], args.keywords)
    out = ToolOutput(tool="search_opportunities", status="ok" if top else "not_found")
    if not top and records:
        # No keyword match: show the few verified openings rather than nothing, and say so.
        top = records[:5]
        out.status = "ok"
        out.unknowns.append(f"No opening matched {args.keywords}; showing all {len(top)} verified openings instead.")
    for r in top:
        rid = str(r["opportunity_id"])
        citation = ctx.store.citation("opportunities", rid)
        card = JobCard(job_id=rid, title=str(r.get("title", rid)), organization=str(r.get("organization", "not_listed")),
                       opportunity_type=str(r.get("opportunity_type", "not_listed")),
                       hourly_pay_usd=r.get("hourly_pay_usd", "not_listed"), hours_per_week=r.get("hours_per_week", "not_listed"),
                       recruitment_status=str(r.get("recruitment_status", "unverified")),
                       international_eligibility=str(r.get("international_eligibility", "unverified")),
                       apply_url=str(r.get("apply_url", "not_listed")), source=citation)
        out.cards.append(card.model_dump())
        out.records.append(RecordRef(category="opportunities", record_id=rid))
        out.citations.append(citation)
        out.add_fact(f"{card.title} ({card.organization}): pay {card.hourly_pay_usd} USD/hour, {card.hours_per_week} "
                         f"hours/week, recruitment {card.recruitment_status}, international eligibility "
                         f"'{card.international_eligibility}' as listed.", citation)
        if card.international_eligibility != "yes":
            out.unknowns.append(f"{card.title}: work eligibility for international students is '{card.international_eligibility}'; "
                                "confirm with the Office of International Services before applying.")
    if not top:
        out.unknowns.append("No verified opportunities match these keywords.")
    return out


@tool("search_research_labs", "Search USC research labs by research area keywords.", KeywordInput)
def search_research_labs(args: KeywordInput, ctx: ToolContext) -> ToolOutput:
    top = _top(ctx.store.records("research_labs"), ["title", "research_areas", "description", "tags"], args.keywords, n=3)
    out = ToolOutput(tool="search_research_labs", status="ok" if top else "not_found")
    for r in top:
        rid = str(r["lab_id"])
        out.records.append(RecordRef(category="research_labs", record_id=rid))
        lab_citation = ctx.store.citation("research_labs", rid)
        out.citations.append(lab_citation)
        out.add_fact(f"Lab {r.get('title')} (PI {r.get('principal_investigator', 'not_listed')}): recruitment "
                         f"{r.get('recruitment_status', 'unverified')}, funding {r.get('compensation_status', 'unverified')}.", lab_citation)
    return out


@tool("list_career_resources", "List USC career resources (Handshake, career center tools) matching keywords.", KeywordInput)
def list_career_resources(args: KeywordInput, ctx: ToolContext) -> ToolOutput:
    top = _top(ctx.store.records("career_resources"), ["title", "description", "tags", "resource_type"], args.keywords, n=4)
    out = ToolOutput(tool="list_career_resources", status="ok" if top else "not_found")
    for r in top:
        rid = str(r["resource_id"])
        citation = ctx.store.citation("career_resources", rid)
        out.records.append(RecordRef(category="career_resources", record_id=rid))
        out.citations.append(citation)
        out.add_fact(f"{r.get('title')}: {str(r.get('description', ''))[:200]}", citation)
    return out
