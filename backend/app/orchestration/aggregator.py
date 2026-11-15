"""Result normalizer + aggregator: merges agent outputs into cards, one checklist, deduped citations and partial status (code only)."""

from typing import Any

from backend.app.config.settings import settings
from backend.app.schemas.agent_result import AgentResult
from backend.app.schemas.response import AgentStatus, ChecklistCard, ChecklistItem, PartialStatus

CARD_KEYS = {"course": "course_id", "housing": "listing_id", "job": "job_id", "service": "service_id"}
CHECKLIST_ORDER = ["student_services", "academic", "career", "housing"]


def _merge_course(existing: dict[str, Any], new: dict[str, Any]) -> None:
    known = {s["section_id"] for s in existing["sections"]}
    existing["sections"] += [s for s in new["sections"] if s["section_id"] not in known]
    existing["schedule_conflicts"] = sorted(set(existing["schedule_conflicts"]) | set(new["schedule_conflicts"]))


def aggregate(results: list[AgentResult]) -> dict[str, Any]:
    cards: dict[tuple[str, str], dict[str, Any]] = {}
    checklist: dict[str, dict[str, Any]] = {}
    citations: dict[str, dict[str, Any]] = {}
    facts, unknowns = [], []
    partial = PartialStatus()
    for res in sorted(results, key=lambda r: r.agent):
        reason = res.error or (res.unknowns[0] if res.unknowns else "")
        partial.agents[res.agent] = AgentStatus(status=res.status, reason=reason[:200])
        facts += [{"agent": res.agent, "text": f.text, "url": f.citation.url if f.citation else ""} for f in res.facts]
        for f in res.facts:
            if f.citation:
                citations.setdefault(f.citation.url, f.citation.model_dump())
        unknowns += [f"[{res.agent}] {u}" for u in res.unknowns]
        for out in res.tool_outputs:
            for card in out["cards"]:
                key = (card["type"], card[CARD_KEYS[card["type"]]])
                if key in cards and card["type"] == "course":
                    _merge_course(cards[key], card)
                else:
                    cards.setdefault(key, card)
            for item in out["checklist"]:
                checklist.setdefault(item["text"], item)
            for c in out["citations"]:
                citations.setdefault(c["url"], c)
    card_list = list(cards.values())[: settings.max_cards]
    if checklist:
        items = sorted(checklist.values(), key=lambda i: CHECKLIST_ORDER.index(i["domain"]) if i["domain"] in CHECKLIST_ORDER else 9)
        card_list.append(ChecklistCard(title="Pre-semester checklist",
                                       items=[ChecklistItem.model_validate(i) for i in items[:10]]).model_dump())
    if any(a.status != "ok" for a in partial.agents.values()):
        partial.overall = "partial"
    return {"cards": card_list, "citations": list(citations.values()), "facts": facts[:40], "unknowns": unknowns[:15],
            "partial_status": partial.model_dump()}
