"""Load canonical files and validate schemas, source identities and record references."""

from __future__ import annotations

import json
from pathlib import Path

import yaml
from jsonschema import Draft202012Validator, FormatChecker
from pydantic import JsonValue

from ingestion_models import Category, FileMeta, SourceFile, database_root, read_json, repo_root, sha256


def validate_schema(value: object, schema_name: str, label: str) -> None:
    schema = read_json(database_root / 'schemas' / f'{schema_name}.json')
    errors = list(Draft202012Validator(schema, format_checker=FormatChecker()).iter_errors(value))
    if errors:
        raise ValueError(f'{label}: {errors[0].message}')


def ensure_present_values(value: JsonValue, label: str) -> None:
    if value is None or value == '':
        raise ValueError(f'Null/empty field in {label}')
    if isinstance(value, dict):
        for key, child in value.items():
            ensure_present_values(child, f'{label}/{key}')
    if isinstance(value, list):
        for child in value:
            ensure_present_values(child, label)


def load_source(path: Path) -> SourceFile:
    domain, category = path.relative_to(database_root / 'data').parts[:2]
    body, records = '', []
    if path.suffix == '.json':
        data = read_json(path)
        meta, records = data['meta'], data['records']
    else:
        front, body = path.read_text(encoding='utf-8-sig').split('---', 2)[1:]
        meta = json.loads(json.dumps(yaml.safe_load(front), default=str))
        if not meta.get('summary') or len(body.split()) > 3000:
            raise ValueError(f'{path.name}: missing summary or document exceeds 3000 words')
    validate_schema(meta, 'meta_common', path.name)
    ensure_present_values(meta, path.name)
    return SourceFile(path=path.relative_to(repo_root).as_posix(), sha256=sha256(path.read_bytes()),
                      doc_id=f'{domain}.{category}.{path.stem}', domain=domain, category=category,
                      meta=FileMeta.model_validate(meta), records=records, body=body)


def validate_records(source: SourceFile, category: Category, course_ids: set[str], seen: set[tuple]) -> None:
    for record in source.records:
        validate_schema(record, category.schema_name, source.path)
        ensure_present_values(record, source.path)
        identity = (source.category, source.meta.academic_year, record[category.id_field])
        if identity in seen:
            raise ValueError(f'Duplicate record identity: {identity}')
        seen.add(identity)
        if not source.eligible:
            continue
        references = record.get('prerequisites', []) if source.category == 'courses' else []
        if source.category == 'course_sections':
            references = [record['course_id']]
        missing = set(references) - course_ids
        if missing:
            raise ValueError(f'{identity}: missing course references {sorted(missing)}')


def load_dataset() -> tuple[list[SourceFile], dict[str, Category], dict]:
    categories = {name: Category.model_validate(value) for name, value in
                  read_json(database_root / 'registry/categories.json').items() if name != '_comment'}
    sources = read_json(database_root / 'registry/sources.json')
    files = [load_source(p) for p in sorted((database_root / 'data').rglob('*')) if p.suffix in {'.md', '.json'}]
    course_ids = {r['course_id'] for f in files if f.category == 'courses' for r in f.records}
    seen: set[tuple] = set()
    for source in files:
        category = categories[source.category]
        if category.domain != source.domain or source.meta.source_name not in sources:
            raise ValueError(f'Unregistered domain/source: {source.path}')
        if category.file_type == 'records':
            validate_records(source, category, course_ids, seen)
    return files, categories, sources
