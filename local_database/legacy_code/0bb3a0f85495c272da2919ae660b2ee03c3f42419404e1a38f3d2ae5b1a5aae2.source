"""Validate every data file against DATA_GUIDE.md: meta and record schemas, ids, dates, sources,
tags, size limits and referential integrity. Exits 1 with a report if any error is found."""

import datetime as dt
import re
import sys
from collections import defaultdict

from jsonschema import Draft202012Validator

from data_common import (
    CAP_TOKENS, ROOT, DataFile, blocks_of, categories, count_tokens, embed_text, is_atomic, iter_data_files,
    load_json, parse_document, parse_records, sources, split_sections,
)

MAX_DOC_WORDS = 3000
YEAR_REQUIRED = re.compile(r"polic|calendar|courses|listings")
DATE_KEYS = re.compile(r"(^|_)(date|deadline|available_from)$")


class Report:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.warnings: list[str] = []

    def error(self, where: str, msg: str) -> None:
        self.errors.append(f"{where}: {msg}")

    def warn(self, where: str, msg: str) -> None:
        self.warnings.append(f"{where}: {msg}")


def schema_validator(name: str) -> Draft202012Validator:
    return Draft202012Validator(load_json(ROOT / "schemas" / f"{name}.json"))


def find_empty(value, path: str = "") -> list[str]:
    """Paths of null or empty-string values (Pinecone rejects null metadata)."""
    if value is None or value == "":
        return [path or "<root>"]
    if isinstance(value, dict):
        return [p for k, v in value.items() for p in find_empty(v, f"{path}.{k}" if path else k)]
    if isinstance(value, list):
        return [p for i, v in enumerate(value) for p in find_empty(v, f"{path}[{i}]")]
    return []


def check_dates(obj: dict, where: str, report: Report) -> None:
    for key, value in obj.items():
        if DATE_KEYS.search(key) and isinstance(value, str):
            try:
                dt.date.fromisoformat(value)
            except ValueError:
                report.error(where, f"{key}={value!r} is not a valid YYYY-MM-DD date")


def check_meta(f: DataFile, meta: dict, is_document: bool, known_sources: dict, report: Report) -> None:
    where = f.rel
    for err in schema_validator("meta_common").iter_errors(meta):
        report.error(where, f"meta {'.'.join(map(str, err.path)) or ''} {err.message}")
    for p in find_empty(meta):
        report.error(where, f"meta has null/empty value at {p}")
    if meta.get("source_name") not in known_sources:
        report.error(where, f"source_name {meta.get('source_name')!r} not in registry/sources.json")
    if is_document and not meta.get("summary"):
        report.error(where, "documents need a summary")
    if YEAR_REQUIRED.search(f.category) and not meta.get("academic_year"):
        report.error(where, f"academic_year is required for category {f.category}")
    check_dates(meta, where, report)
    if not re.fullmatch(r"[a-z0-9_]+", f.stem):
        report.error(where, "file name must be lowercase snake_case")


def check_document(f: DataFile, report: Report, known_sources: dict) -> None:
    meta, body = parse_document(f.path)
    check_meta(f, meta, True, known_sources, report)
    words = len(body.split())
    if words > MAX_DOC_WORDS:
        report.error(f.rel, f"{words} words; split documents over {MAX_DOC_WORDS} words by chapter")
    if not re.search(r"^# ", body, re.M):
        report.error(f.rel, "body needs a '# Title' heading")
    for section_path, text in split_sections(body, meta.get("title", f.stem)):
        tokens = count_tokens(embed_text(section_path, meta.get("summary", ""), text))
        if tokens <= CAP_TOKENS:
            continue
        name = " > ".join(section_path)
        # Plain paragraphs are split by build_chunks.py; a single table or list over the cap cannot be.
        too_big_atomic = [b for b in blocks_of(text) if is_atomic(b) and count_tokens(b) > CAP_TOKENS]
        if too_big_atomic:
            report.error(f.rel, f"section '{name}' has a table/list over {CAP_TOKENS} tokens; shorten it")
        else:
            report.warn(f.rel, f"section '{name}' is {tokens} tokens (cap {CAP_TOKENS}); it will be split")


def check_records(f: DataFile, cat: dict, ids: dict, report: Report, known_sources: dict) -> list[dict]:
    meta, records = parse_records(f.path)
    check_meta(f, meta, False, known_sources, report)
    if not records:
        report.error(f.rel, "no records")
    validator = schema_validator(cat["schema"])
    id_field = cat["id_field"]
    for i, record in enumerate(records):
        where = f"{f.rel} record[{i}]"
        for err in validator.iter_errors(record):
            report.error(where, f"{'.'.join(map(str, err.path)) or ''} {err.message}")
        for p in find_empty(record):
            report.error(where, f"null/empty value at {p}")
        check_dates(record, where, report)
        rid = record.get(id_field)
        if rid in ids[f.category]:
            report.error(where, f"duplicate {id_field} {rid!r} (also in {ids[f.category][rid]})")
        ids[f.category][rid] = f.rel
    return records


def check_references(all_records: dict, report: Report) -> None:
    courses = {r.get("course_id") for r in all_records.get("courses", [])}
    for r in all_records.get("courses", []):
        for pre in r.get("prerequisites", []):
            if pre not in courses:
                report.error("courses", f"{r.get('course_id')} prerequisite {pre!r} is not a known course")
    for r in all_records.get("course_sections", []):
        if r.get("course_id") not in courses:
            report.error("course_sections", f"{r.get('section_id')} course_id {r.get('course_id')!r} is not a known course")


def main() -> int:
    report = Report()
    cats, known_sources = categories(), sources()
    ids: dict[str, dict] = defaultdict(dict)
    all_records: dict[str, list] = defaultdict(list)
    files = iter_data_files()
    for f in files:
        cat = cats.get(f.category)
        if cat is None:
            report.error(f.rel, f"category {f.category!r} is not in registry/categories.json")
            continue
        if cat.get("domain") != f.domain:
            report.error(f.rel, f"category {f.category!r} belongs to domain {cat.get('domain')!r}, not {f.domain!r}")
        try:
            if cat["file_type"] == "document" and f.path.suffix == ".md":
                check_document(f, report, known_sources)
            elif cat["file_type"] == "records" and f.path.suffix == ".json":
                all_records[f.category] += check_records(f, cat, ids, report, known_sources)
            else:
                report.error(f.rel, f"{f.path.suffix} file does not match file_type {cat['file_type']!r}")
        except (ValueError, KeyError) as exc:
            report.error(f.rel, f"could not parse: {exc}")
    check_references(all_records, report)

    for w in report.warnings:
        print(f"WARN  {w}")
    for e in report.errors:
        print(f"ERROR {e}")
    print(f"\nChecked {len(files)} files: {len(report.errors)} errors, {len(report.warnings)} warnings")
    return 1 if report.errors else 0


if __name__ == "__main__":
    sys.exit(main())
