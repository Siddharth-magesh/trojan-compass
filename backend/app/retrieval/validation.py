"""Evidence validation: re-check access and provenance, flag stale or wrong-year items and instruction-like text.

Retrieved text is untrusted data: it is flagged and never followed. Values are never edited here.
"""

import re
from datetime import date

from backend.app.config.settings import settings
from backend.app.schemas.retrieval import EvidenceItem
from backend.app.security.input_guard import INJECTION_RE

MIN_BODY_CHARS = 40


def validate(items: list[EvidenceItem], year: str, today: date | None = None) -> tuple[list[EvidenceItem], list[str], list[str]]:
    """Returns (kept items, package flags, freshness notes)."""
    today = today or date.today()
    kept, flags, notes = [], [], []
    for item in items:
        if item.access_level != "public":
            flags.append(f"dropped_non_public:{item.id}")  # defense in depth: the query filter already requires public
            continue
        if not item.source_url.startswith("http") or item.verified_date == "unknown":
            flags.append(f"dropped_no_provenance:{item.id}")
            continue
        if len(re.sub(r"^#+ .*$", "", item.text, flags=re.M).strip()) < MIN_BODY_CHARS:
            flags.append(f"dropped_heading_only:{item.id}")  # a bare heading carries no answerable content
            continue
        if item.academic_year != year:
            item.flags.append("wrong_year")
        try:
            age = (today - date.fromisoformat(item.verified_date)).days
            if age > settings.freshness_days:
                item.flags.append("stale")
                notes.append(f"{item.source_name} was last verified on {item.verified_date} ({age} days ago).")
        except ValueError:
            item.flags.append("stale")
        if INJECTION_RE.search(item.text):
            item.flags.append("instruction_like")
            flags.append(f"instruction_like:{item.id}")
        kept.append(item)
    return kept, flags, sorted(set(notes))
