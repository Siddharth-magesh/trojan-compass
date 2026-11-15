"""Student services tools: USC service directory and verified guide summaries (front matter + headings only, no retrieval)."""

import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from backend.app.schemas.agent_result import RecordRef
from backend.app.schemas.response import ServiceCard
from backend.app.tools.tool_registry import ToolContext, ToolOutput, tool


class ServicesInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    keywords: list[str] = Field(default_factory=list, max_length=6)


class GuidesInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    keywords: list[str] = Field(default_factory=list, max_length=6, description="e.g. ['insurance', 'payment']")
    domain: Literal["student_services", "career"] = "student_services"


def _words(keywords: list[str]) -> list[str]:
    return [w for k in keywords for w in re.findall(r"[a-z0-9]+", k.lower()) if len(w) > 2]


@tool("list_services", "List USC student services (portals, offices) optionally filtered by keywords.", ServicesInput)
def list_services(args: ServicesInput, ctx: ToolContext) -> ToolOutput:
    words = _words(args.keywords)
    records = ctx.store.records("service_directory")
    if words:
        records = [r for r in records if any(w in f"{r.get('name', '')} {r.get('purpose', '')} {r.get('tags', '')}".lower()
                                            for w in words)] or records
    out = ToolOutput(tool="list_services", status="ok" if records else "no_data")
    for r in records[:6]:
        rid = str(r["service_id"])
        citation = ctx.store.citation("service_directory", rid)
        card = ServiceCard(service_id=rid, name=str(r.get("name", rid)), purpose=str(r.get("purpose", "")),
                           official_url=str(r.get("official_url", "not_listed")),
                           login_required=r.get("login_required", "unknown"), source=citation)
        out.cards.append(card.model_dump())
        out.records.append(RecordRef(category="service_directory", record_id=rid))
        out.citations.append(citation)
        out.facts.append(f"{card.name}: {card.purpose}")
    return out


@tool("list_guides", "Find verified USC onboarding/policy guides by keywords; returns title, summary and section headings.", GuidesInput)
def list_guides(args: GuidesInput, ctx: ToolContext) -> ToolOutput:
    words = _words(args.keywords)
    docs = [d for d in ctx.store.documents if d.domain == args.domain]
    scored = sorted(((sum(w in f"{d.title} {d.summary} {' '.join(d.tags)}".lower() for w in words) if words else 1, d)
                     for d in docs), key=lambda x: -x[0])
    top = [d for score, d in scored if score > 0][:5]
    out = ToolOutput(tool="list_guides", status="ok" if top else "not_found")
    for d in top:
        out.citations.append(d.citation)
        out.facts.append(f"Guide '{d.title}': {d.summary} Sections: {'; '.join(d.headings[:6])}")
        first_sentence = d.summary.split(". ")[0].rstrip(".")
        out.checklist.append({"text": f"{d.title}: {first_sentence}.", "domain": ctx.agent, "source": d.citation.model_dump()})
    if not top:
        out.unknowns.append("No verified guide matches these keywords.")
    return out
