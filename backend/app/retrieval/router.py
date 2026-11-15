"""Deterministic router: exact ids and numeric comparisons go to JSON lookup first; everything else to hybrid search."""

from dataclasses import dataclass

from backend.app.config.settings import settings
from backend.app.data_store.loader import DataStore
from backend.app.retrieval.query_parser import ParsedQuery
from backend.app.schemas.retrieval import RetrievalRequest

# Words that tell us which numeric field a comparison refers to.
NUMERIC_FIELD_HINTS = {"monthly_rent_usd": ("rent", "housing", "apartment", "month"),
                       "hourly_pay_usd": ("pay", "hour", "hourly", "wage", "salary"),
                       "hours_per_week": ("hours per week", "hours a week", "hrs"),
                       "units": ("unit", "units", "credit")}


@dataclass
class Route:
    kind: str           # structured | hybrid
    alpha: float
    numeric_field: str = ""


def record_categories(store: DataStore, domains: list[str]) -> list[str]:
    return [name for name, cat in store.categories.items() if cat.domain in domains and cat.file_type == "records"]


def numeric_field_for(parsed: ParsedQuery, store: DataStore, domains: list[str]) -> str:
    if not parsed.comparisons:
        return ""
    fields = {f for c in record_categories(store, domains) for f in store.categories[c].filter_fields}
    for field_name, hints in NUMERIC_FIELD_HINTS.items():
        if field_name in fields and any(h in parsed.normalized for h in hints):
            return field_name
    return ""


def choose(parsed: ParsedQuery, request: RetrievalRequest, store: DataStore) -> Route:
    alpha = request.alpha if request.alpha is not None else (
        settings.retrieval_keyword_alpha if parsed.keyword_heavy else settings.retrieval_alpha)
    categories = record_categories(store, request.domains)
    known_code = "academic" in request.domains and any(store.get("courses", c) for c in parsed.course_codes)
    known_id = any(store.get(cat, rid) for cat in categories for rid in parsed.record_ids)
    if known_code or known_id:
        return Route("structured", alpha)
    if field_name := numeric_field_for(parsed, store, request.domains):
        return Route("structured", alpha, numeric_field=field_name)
    return Route("hybrid", alpha)
