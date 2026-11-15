"""Validate career schemas, provenance, freshness, unique IDs, and BGE token limits offline."""

import argparse
import hashlib
import json
import re
from collections import Counter
from datetime import date

from jsonschema import Draft202012Validator, FormatChecker
from pydantic import JsonValue
from tokenizers import Tokenizer

from data_models import GoldenQuery, Meta, SourceChecks, record_models
from dataset_io import database_root, document_id, load_document, load_records, read_json, record_slug, record_text, registries, sections
from prepare_tokenizer import tokenizer_sha256


def reject_empty(value: JsonValue, location: str) -> None:
    if value is None or value == "":
        raise ValueError(f"{location}: null/empty string is forbidden")
    if isinstance(value, dict):
        for key, item in value.items():
            reject_empty(item, f"{location}.{key}")
    elif isinstance(value, list):
        for index, item in enumerate(value):
            reject_empty(item, f"{location}[{index}]")


def check_schema(name: str, value: JsonValue) -> None:
    schema = read_json(database_root / "schemas" / f"{name}.json")
    Draft202012Validator.check_schema(schema)
    Draft202012Validator(schema, format_checker=FormatChecker()).validate(value)


def check_meta(meta: Meta, raw: dict[str, JsonValue], sources: set[str], as_of: date) -> None:
    check_schema("meta_common", raw)
    reject_empty(raw, meta.title)
    if meta.source_name not in sources:
        raise ValueError(f"Unregistered source: {meta.source_name}")
    if not meta.collected_date <= meta.last_verified_date <= as_of:
        raise ValueError(f"Invalid collection/verification chronology: {meta.title}")
    if meta.access_level != "public" and not meta.owner_student_id:
        raise ValueError("Private files require owner_student_id")
    if meta.access_level == "public" and meta.owner_student_id:
        raise ValueError("Public files cannot contain owner_student_id")
    start, end = map(int, meta.academic_year.split("-"))
    if end != start + 1:
        raise ValueError("Invalid academic year")


def check_record(record: dict[str, JsonValue], schema: str, sources: set[str], as_of: date) -> None:
    check_schema(schema, record)
    record_models[schema].model_validate(record)
    reject_empty(record, str(record.get("title")))
    if record["source_name"] not in sources:
        raise ValueError("Unregistered record source")
    if date.fromisoformat(record["last_verified_date"]) > as_of:
        raise ValueError("Future verification date")
    for evidence in record["evidence"]:
        if evidence["source_name"] not in sources or date.fromisoformat(evidence["checked_date"]) > as_of:
            raise ValueError("Invalid evidence provenance")
    deadline = record.get("deadline")
    if deadline and date.fromisoformat(deadline) < as_of and record["recruitment_status"] in {"active", "upcoming"}:
        raise ValueError(f"Expired opportunity marked available: {record['title']}")
    if record.get("end_date") and date.fromisoformat(record["end_date"]) < as_of and record["recruitment_status"] in {"active", "upcoming"}:
        raise ValueError("Past event marked available")
    if record.get("posting_date") and date.fromisoformat(record["posting_date"]) > as_of:
        raise ValueError("Future posting date")


def validate(as_of: date) -> dict[str, JsonValue]:
    categories, sources = registries()
    tokenizer_path = database_root / "processed/tokenizer.json"
    if hashlib.sha256(tokenizer_path.read_bytes()).hexdigest() != tokenizer_sha256:
        raise ValueError("Unexpected tokenizer; run prepare_tokenizer.py")
    tokenizer = Tokenizer.from_file(str(tokenizer_path))
    tokenizer.no_truncation()
    counts: Counter[str] = Counter()
    statuses: Counter[str] = Counter()
    ids: set[str] = set()
    record_signatures: set[tuple[str, str]] = set()
    docs: set[str] = set()
    labs: set[str] = set()
    lab_references: set[str] = set()
    maximum_tokens = 0
    for path in sorted((database_root / "data").rglob("*")):
        if not path.is_file():
            continue
        domain, category_name = path.relative_to(database_root / "data").parts[:2]
        category = categories[category_name]
        if domain != category.domain or not re.fullmatch(r"[a-z0-9_]+\.(json|md)", path.name):
            raise ValueError(f"Invalid domain or file name: {path}")
        docs.add(document_id(path))
        if category.file_type == "document":
            meta, body, raw_meta = load_document(path)
            check_meta(meta, raw_meta, set(sources), as_of)
            texts = [" > ".join(parts) + "\n" + meta.summary + "\n" + text for parts, text in sections(body)]
            texts.append(meta.title + "\n" + meta.summary + "\n" + "\n".join(re.findall(r"^#{1,6} (.+)$", body, re.M)))
            counts["documents"] += 1
        else:
            payload = load_records(path)
            check_meta(payload.meta, read_json(path)["meta"], set(sources), as_of)
            texts = []
            for record in payload.records:
                check_record(record, category.schema_name, set(sources), as_of)
                slug = record_slug(record[category.id_field])
                if slug in ids:
                    raise ValueError(f"Duplicate record ID/slug: {slug}")
                ids.add(slug)
                signature = (record["source_url"], record["title"].strip().casefold())
                if signature in record_signatures:
                    raise ValueError(f"Duplicate record title/source: {signature}")
                record_signatures.add(signature)
                counts[category_name] += 1
                statuses[record["recruitment_status"]] += 1
                if category_name == "research_labs":
                    labs.add(record["lab_id"])
                elif record.get("lab_id"):
                    lab_references.add(record["lab_id"])
                texts.append(record_text(record, category))
        for text in texts:
            tokens = len(tokenizer.encode(text, add_special_tokens=True).ids)
            maximum_tokens = max(maximum_tokens, tokens)
            if tokens > 450:
                raise ValueError(f"{path}: {tokens} tokens; split this section before ingestion")
    if lab_references - labs:
        raise ValueError(f"Missing lab references: {lab_references - labs}")
    audit = read_json(database_root / "registry/source_checks.json")
    check_schema("source_checks", audit)
    checks = SourceChecks.model_validate(audit)
    for check in checks.checks:
        if check.source_name not in sources or check.checked_date > as_of:
            raise ValueError("Invalid source-access observation")
    queries = database_root.parent / "evaluation/golden_queries.jsonl"
    for line in queries.read_text(encoding="utf-8").splitlines():
        query = GoldenQuery.model_validate_json(line)
        if set(query.expected_doc_ids) - docs:
            raise ValueError(f"Golden query references missing documents: {query.query}")
        if query.type == "negative" and query.expected_doc_ids:
            raise ValueError("Negative query must have empty expected_doc_ids")
        counts["golden_queries"] += 1
    if counts["golden_queries"] < 15:
        raise ValueError("At least 15 career golden queries required")
    return {"as_of": as_of.isoformat(), "files": len(docs), "counts": dict(counts),
            "recruitment_status_counts": dict(statuses), "maximum_tokens": maximum_tokens,
            "sources": len(sources), "validation": "passed"}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--as-of", type=date.fromisoformat, required=True)
    arguments = parser.parse_args()
    print(json.dumps(validate(arguments.as_of), indent=2))
