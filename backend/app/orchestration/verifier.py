"""Deterministic verification: every card must match a loaded record, citations must be known sources, stale data is flagged."""

from datetime import date
from typing import Any

from backend.app.config.settings import settings
from backend.app.data_store.loader import DataStore

# card type -> (store category, id field, numeric fields that must equal the record exactly)
CHECKS = {"course": ("courses", "course_id", ["units"]),
          "housing": ("listings", "listing_id", ["monthly_rent_usd", "bedrooms"]),
          "job": ("opportunities", "job_id", ["hourly_pay_usd", "hours_per_week"]),
          "lab": ("research_labs", "lab_id", []),
          "service": ("service_directory", "service_id", [])}


def _known_urls(store: DataStore) -> set[str]:
    return {c.url for c in store.citations.values()} | {d.citation.url for d in store.documents}


def verify(agg: dict[str, Any], store: DataStore, today: date | None = None) -> dict[str, Any]:
    today = today or date.today()
    known = _known_urls(store)
    kept, issues = [], []
    for card in agg["cards"]:
        if card["type"] == "checklist":
            card["items"] = [i for i in card["items"] if i["source"]["url"] in known]
            if card["items"]:
                kept.append(card)
            continue
        category, id_field, numeric = CHECKS[card["type"]]
        record = store.get(category, card[id_field])
        if record is None:
            issues.append(f"{card['type']} {card[id_field]} is not in verified data")
            continue
        mismatched = [f for f in numeric if card.get(f) != record.get(f, card.get(f))]
        if mismatched or card["source"]["url"] not in known:
            issues.append(f"{card['type']} {card[id_field]} failed checks: {mismatched or 'unknown source'}")
            continue
        kept.append(card)
    citations = [c for c in agg["citations"] if c["url"] in known]
    stale = []
    for c in citations:
        try:
            age = (today - date.fromisoformat(c["verified_date"])).days
        except ValueError:
            stale.append(f"{c['source_name']}: verification date unknown")
            continue
        if age > settings.freshness_days:
            stale.append(f"{c['source_name']} was last verified on {c['verified_date']} ({age} days ago).")
    partial = agg["partial_status"]
    if issues:
        partial["overall"] = "unverified"
    return {**agg, "cards": kept, "citations": citations, "issues": issues, "freshness_notes": sorted(set(stale))[:5],
            "partial_status": partial}
