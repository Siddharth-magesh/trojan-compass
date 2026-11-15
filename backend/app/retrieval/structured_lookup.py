"""Exact JSON lookup through the agents' DataStore: ids and numeric comparisons; record text rendered exactly like the index."""

from functools import lru_cache
from typing import Any

from backend.app.data_store import loader  # noqa: F401  (adds local_database/scripts to sys.path)
from backend.app.data_store.loader import DataStore
from backend.app.retrieval.query_parser import ParsedQuery
from backend.app.retrieval.router import Route, record_categories
from backend.app.retrieval.runtime import Runtime
from backend.app.schemas.retrieval import EvidenceItem
from build_chunks import render_value  # noqa: E402  (same renderer the ingestion used for record text)
from ingestion_models import read_json  # noqa: E402

MAX_ITEMS = 5


@lru_cache(maxsize=1)
def _authorities() -> dict[str, str]:
    return {name: entry.get("authority", "unknown") for name, entry in read_json(loader.settings.data_root / "registry/sources.json").items()
            if isinstance(entry, dict)}


def _doc_id(runtime: Runtime, slug: str, year: str) -> str:
    """records_index.json maps a record slug to its vector id(s) and source doc_id for the academic year."""
    index = runtime.records_index or {}
    for key in index.get("by_slug", {}).get(slug, []):
        location = index["records"][key]
        if location.get("academic_year") == year:
            return location["doc_id"]
    return "unknown"


def _item(store: DataStore, runtime: Runtime, category: str, record: dict[str, Any], year: str) -> EvidenceItem:
    cat = store.categories[category]
    rid = str(record[cat.id_field])
    slug = rid.lower().replace(" ", "_")
    citation = store.citation(category, rid)
    text = cat.search_template.format_map({k: render_value(v) for k, v in record.items()})
    doc_id = _doc_id(runtime, slug, year)
    return EvidenceItem(id=f"{doc_id}#{slug}", doc_id=doc_id, namespace=cat.domain, chunk_type="record", record_slug=slug,
                        title=str(record.get("title", record.get("name", rid))), text=text, hybrid_score=1.0,
                        source_name=citation.source_name, source_url=citation.url, verified_date=citation.verified_date,
                        authority=_authorities().get(citation.source_name, "unknown"), academic_year=year, access_level="public")


def lookup(parsed: ParsedQuery, route: Route, domains: list[str], store: DataStore, runtime: Runtime,
           year: str) -> list[EvidenceItem]:
    """Only verified+public records are in the store, and only the current-year files are loaded."""
    items: list[EvidenceItem] = []
    categories = record_categories(store, domains)
    for code in parsed.course_codes:
        if "courses" in categories and (record := store.get("courses", code)):
            items.append(_item(store, runtime, "courses", record, year))
    for rid in parsed.record_ids:
        for category in categories:
            if record := store.get(category, rid):
                items.append(_item(store, runtime, category, record, year))
    if route.numeric_field:
        for category in categories:
            if route.numeric_field not in store.categories[category].filter_fields:
                continue
            for record in store.records(category):
                value = record.get(route.numeric_field)
                if not isinstance(value, (int, float)) or isinstance(value, bool):
                    continue  # unknown values never satisfy a numeric comparison
                if all(value <= v if op == "$lte" else value >= v for op, v in parsed.comparisons):
                    items.append(_item(store, runtime, category, record, year))
    return items[:MAX_ITEMS]
