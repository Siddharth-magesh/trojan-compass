"""Loads verified, public local_database files once into memory (drafts and private files are never loaded).

Reuses the ingestion pipeline's own loader and eligibility rule (local_database/scripts/source_data.py) so the
backend and the vector index agree on which files count as canonical.
"""

import logging
import re
import sys
from dataclasses import dataclass, field
from functools import lru_cache
from typing import Any

from backend.app.config.settings import settings
from backend.app.schemas.response import Citation

sys.path.insert(0, str(settings.data_root / "scripts"))
from ingestion_models import Category, read_json  # noqa: E402
from source_data import load_source  # noqa: E402

log = logging.getLogger(__name__)


@dataclass
class DocSummary:
    doc_id: str
    domain: str
    category: str
    title: str
    summary: str
    headings: list[str]
    tags: list[str]
    citation: Citation


@dataclass
class DataStore:
    categories: dict[str, Category]
    by_id: dict[str, dict[str, dict[str, Any]]] = field(default_factory=dict)   # category -> id -> record
    citations: dict[tuple[str, str], Citation] = field(default_factory=dict)    # (category, id) -> source
    documents: list[DocSummary] = field(default_factory=list)
    skipped: list[str] = field(default_factory=list)                            # draft/invalid files, for logs

    def records(self, category: str) -> list[dict[str, Any]]:
        return list(self.by_id.get(category, {}).values())

    def get(self, category: str, record_id: str) -> dict[str, Any] | None:
        return self.by_id.get(category, {}).get(record_id)

    def available(self, category: str) -> bool:
        return bool(self.by_id.get(category)) or any(d.category == category for d in self.documents)

    def citation(self, category: str, record_id: str) -> Citation | None:
        return self.citations.get((category, record_id))


def _record_citation(record: dict[str, Any], meta: Any) -> Citation:
    # Prefer per-record provenance (career records carry their own) over the file-level meta.
    return Citation(source_name=str(record.get("source_name", meta.source_name)),
                    url=str(record.get("source_url", meta.source_url)),
                    verified_date=str(record.get("last_verified_date", meta.last_verified_date)))


def load_store() -> DataStore:
    root = settings.data_root
    categories = {name: Category.model_validate(value) for name, value in
                  read_json(root / "registry/categories.json").items() if name != "_comment"}
    store = DataStore(categories=categories)
    for path in sorted((root / "data").rglob("*")):
        if path.suffix not in {".json", ".md"}:
            continue
        try:
            source = load_source(path)
        except Exception as exc:  # malformed file: skip it rather than serve unvalidated data
            store.skipped.append(f"{path.name}: {exc}")
            continue
        if not source.eligible or source.meta.academic_year != settings.academic_year:
            store.skipped.append(f"{path.name}: {source.meta.status}/{source.meta.access_level}/{source.meta.academic_year}")
            continue
        category = categories.get(source.category)
        if category is None:
            store.skipped.append(f"{path.name}: unregistered category")
            continue
        if category.file_type == "records":
            bucket = store.by_id.setdefault(source.category, {})
            for record in source.records:
                rid = str(record[category.id_field])
                bucket[rid] = record
                store.citations[(source.category, rid)] = _record_citation(record, source.meta)
        else:
            store.documents.append(DocSummary(
                doc_id=source.doc_id, domain=source.domain, category=source.category, title=source.meta.title,
                summary=source.meta.summary, headings=re.findall(r"^##\s+(.+)$", source.body, flags=re.M),
                tags=source.meta.tags,
                citation=Citation(source_name=source.meta.source_name, url=source.meta.source_url,
                                  verified_date=source.meta.last_verified_date)))
    log.info("data store loaded: %s records, %s documents, %s skipped",
             {c: len(v) for c, v in store.by_id.items()}, len(store.documents), len(store.skipped))
    return store


@lru_cache(maxsize=1)
def get_store() -> DataStore:
    return load_store()
