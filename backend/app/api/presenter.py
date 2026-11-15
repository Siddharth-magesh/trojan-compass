"""Maps the internal StructuredResponse and profiles to the frontend contract (frontend/src/lib/api_types.ts).

Pure reshaping: every value comes from verified cards and citations; unknown values are omitted (the UI then shows
"not listed") rather than invented.
"""

import hashlib
from typing import Any

from backend.app.schemas.response import StructuredResponse

CHECKLIST_GROUPS = [("student_services", "Accounts, payments and health"), ("academic", "Academics and registration"),
                    ("career", "Jobs and work authorization"), ("housing", "Housing")]
AGENT_NAMES = {"academic": "Courses", "housing": "Housing", "career": "Jobs", "student_services": "USC services",
               "system": "Assistant"}
ELIGIBILITY = {"yes", "no", "unverified"}


def _number(value: Any) -> float | int | None:
    return value if isinstance(value, (int, float)) and not isinstance(value, bool) else None


def _clean(d: dict[str, Any]) -> dict[str, Any]:
    return {k: v for k, v in d.items() if v is not None and v != "" and v != []}


def _course(card: dict[str, Any], ids: dict[str, int]) -> dict[str, Any]:
    lectures = [s for s in card["sections"] if s["section_type"] == "lecture"] or card["sections"]
    # An empty list means "no prerequisites" in the UI, so it is attached after _clean (which drops empty lists).
    prerequisites = [{"course_id": p["course_id"], "known": p["status"] != "unknown", "status": p["status"]}
                     for p in card.get("prerequisite_courses", [])]
    return _clean({
        "type": "course", "course_id": card["course_id"], "title": card["title"], "units": _number(card["units"]),
        "level": card.get("level", "").capitalize(),
        "terms_offered": [t.capitalize() for t in card.get("terms_offered", [])],
        "sections": [_clean({"section_id": s["sis_section_id"] if s["sis_section_id"] != "not_listed" else s["section_id"],
                             "days": [d for d in s["days"] if d != "TBA"], "start_time": s["start_time"],
                             "end_time": s["end_time"],
                             "instructor": None if s["instructor"] == "not_listed" else s["instructor"]})
                     for s in lectures],
        "citation_ids": [ids[card["source"]["url"]]] if card["source"]["url"] in ids else [],
    }) | {"prerequisites": prerequisites}


def _job(card: dict[str, Any], ids: dict[str, int]) -> dict[str, Any]:
    eligibility = card["international_eligibility"] if card["international_eligibility"] in ELIGIBILITY else "unverified"
    return _clean({
        "type": "job", "job_id": card["job_id"], "title": card["title"],
        "employer": None if card["organization"] == "not_listed" else card["organization"],
        "job_type": card["opportunity_type"].replace("_", " ").capitalize() if card["opportunity_type"] != "not_listed" else None,
        "hourly_pay_usd": _number(card["hourly_pay_usd"]), "hours_per_week": _number(card["hours_per_week"]),
        "apply_url": card["apply_url"] if card["apply_url"].startswith("http") else None,
        "international_eligibility": eligibility,
        "citation_ids": [ids[card["source"]["url"]]] if card["source"]["url"] in ids else [],
    })


def _housing(card: dict[str, Any], ids: dict[str, int]) -> dict[str, Any]:
    return _clean({
        "type": "housing", "listing_id": card["listing_id"], "name": card["name"],
        "neighborhood": None if card["neighborhood"] == "unknown" else card["neighborhood"],
        "monthly_rent_usd": _number(card["monthly_rent_usd"]), "bedrooms": _number(card["bedrooms"]),
        "distance_to_campus_miles": _number(card["distance_to_campus_miles"]),
        "citation_ids": [ids[card["source"]["url"]]] if card["source"]["url"] in ids else [],
    })


def _service(card: dict[str, Any]) -> dict[str, Any]:
    return _clean({"type": "service", "service_id": card["service_id"], "name": card["name"], "purpose": card["purpose"],
                   "official_url": card["official_url"] if card["official_url"].startswith("http") else None,
                   "login_required": card["login_required"] if isinstance(card["login_required"], bool) else None})


def _checklist(card: dict[str, Any]) -> dict[str, Any]:
    """Groups items by domain; item ids are stable hashes so ticks persist across reloads and regenerations."""
    groups = []
    for domain, title in CHECKLIST_GROUPS:
        items = [_clean({"id": hashlib.sha256(i["text"].encode()).hexdigest()[:12], "label": i["text"],
                         "link": i["source"]["url"] if i["source"]["url"].startswith("http") else None})
                 for i in card["items"] if i["domain"] == domain]
        if items:
            groups.append({"title": title, "items": items})
    return {"type": "checklist", "title": card["title"], "groups": groups}


def final_payload(response: StructuredResponse) -> dict[str, Any]:
    """StructuredResponse -> final_response. Citation ids are positions (1-based) in response.citations, the same
    numbering the synthesizer used for [n] markers."""
    data = response.model_dump(mode="json")
    citations = [_clean({"id": i + 1, "source_name": c["source_name"], "title": c.get("title"), "url": c["url"],
                         "verified_date": c["verified_date"], "authority": c.get("authority") or None})
                 for i, c in enumerate(data["citations"])]
    ids = {c["url"]: c["id"] for c in citations}
    cards = []
    for card in data["cards"]:
        kind = card["type"]
        cards.append(_course(card, ids) if kind == "course" else _job(card, ids) if kind == "job" else
                     _housing(card, ids) if kind == "housing" else _service(card) if kind == "service" else _checklist(card))
    missing = [f"{AGENT_NAMES.get(name, name)}: {status['reason']}" for name, status in data["partial_status"]["agents"].items()
               if status["status"] != "ok" and status["reason"]]
    return {"answer": data["answer"], "cards": cards, "citations": citations, "freshness_notes": data["freshness_notes"],
            "partial_status": {"status": data["partial_status"]["overall"], "missing": missing},
            "follow_ups": data["follow_ups"]}


def student_payload(profile: dict[str, Any]) -> dict[str, Any]:
    """Synthetic profile -> student_profile (display fields only; completed courses stay server-side)."""
    return _clean({"student_id": profile["student_id"], "display_name": profile.get("name", profile["student_id"]),
                   "program": profile.get("program"), "level": str(profile.get("level", "")).capitalize(),
                   "international": profile.get("country") not in (None, "United States", "USA"),
                   "interests": profile.get("interests"), "housing_budget_usd": _number(profile.get("housing_budget_usd")),
                   "job_interests": profile.get("job_interests")})
