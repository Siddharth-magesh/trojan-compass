"""Audit the complete local collection and write data-only preparation manifests.
No scraping, embedding, Pinecone client, credentials, or network access is used.
"""

from __future__ import annotations

import hashlib
import json
import re
from collections import Counter
from pathlib import Path

import yaml
from jsonschema import Draft202012Validator, FormatChecker
from pydantic import JsonValue, RootModel

ROOT = Path(__file__).resolve().parents[2]
DB = ROOT / 'local_database'
OUTPUT = DB / 'processed/preparation'


class JsonObject(RootModel[dict[str, JsonValue]]):
    """Validate JSON objects at the local-file boundary without dropping extra facts."""


def load_json(path: Path) -> dict[str, JsonValue]:
    return JsonObject.model_validate_json(path.read_text(encoding='utf-8-sig')).root


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')


def digest(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def record_digest(value: object) -> str:
    return digest(json.dumps(value, ensure_ascii=False, sort_keys=True).encode('utf-8'))


def relative(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def load_file(path: Path) -> tuple[dict, list[dict], str]:
    if path.suffix == '.json':
        data = load_json(path)
        return data['meta'], data['records'], ''
    text = path.read_text(encoding='utf-8-sig')
    front, body = text.split('---', 2)[1:]
    raw_meta = yaml.safe_load(front)
    meta = JsonObject.model_validate_json(json.dumps(raw_meta, default=str)).root
    return meta, [], body


def empty_values(value: JsonValue, location: str = '') -> list[str]:
    if value is None or value == '':
        return [location]
    if isinstance(value, dict):
        return [p for k, v in value.items() for p in empty_values(v, f'{location}/{k}')]
    if isinstance(value, list):
        return [p for i, v in enumerate(value) for p in empty_values(v, f'{location}/{i}')]
    return []


def schema_errors(value: object, schema: dict) -> list[str]:
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    return [f"{'/'.join(map(str, e.absolute_path))}: {e.message}" for e in validator.iter_errors(value)]


def preservation_errors(files: list[Path], provenance: dict) -> tuple[list[str], dict]:
    errors = []
    records = Counter()
    bodies = set()
    support = {}
    for path in files:
        if path.suffix == '.md':
            bodies.add(digest(path.read_text(encoding='utf-8-sig').encode('utf-8')))
            continue
        data = load_json(path)
        for row in data['records']:
            original_row = dict(row)
            if path.parent.name == 'course_sections' and 'source_section_id' in original_row:
                original_row['section_id'] = original_row.pop('source_section_id')
            records[record_digest(original_row)] += 1
        if path.parent.name == 'support_resources':
            support = {r['resource_id'].removeprefix('usc_basic_needs_'): r['content'] for r in data['records']}
    checked = set()
    data_versions = 0
    for item in provenance['inputs'] + provenance['legacy_code']:
        path = ROOT / item['archive_path']
        if not path.exists() or digest(path.read_bytes()) != item['sha256']:
            errors.append(f"Archive mismatch: {item['archive_path']}")
            continue
        if item['kind'] != 'data' or item['sha256'] in checked:
            continue
        checked.add(item['sha256'])
        data_versions += 1
        if path.suffix == '.md':
            if digest(path.read_text(encoding='utf-8-sig').encode('utf-8')) not in bodies:
                errors.append(f"Document changed or missing: {item['original_path']}")
        else:
            original = load_json(path)
            if 'records' in original:
                missing = Counter(record_digest(r) for r in original['records']) - records
                if missing:
                    errors.append(f"Original record payload missing: {item['original_path']} ({sum(missing.values())})")
            elif original.get('content') != support:
                errors.append(f"Basic-needs subtree changed: {item['original_path']}")
    return errors, {'archived_branch_inputs': len(provenance['inputs']), 'archived_code_versions': len(provenance['legacy_code']), 'unique_data_versions_checked': data_versions, 'byte_hashes_verified': len(provenance['inputs']) + len(provenance['legacy_code']), 'original_records_and_document_text_preserved': not errors, 'comparison_notes': 'Archives are byte exact. Canonical Markdown allows Git checkout newline conversion. Canonical section ids are reversed through source_section_id before full-record comparison.'}


def audit() -> int:
    categories = load_json(DB / 'registry/categories.json')
    sources = load_json(DB / 'registry/sources.json')
    provenance = load_json(DB / 'registry/consolidation_provenance.json')
    meta_schema = load_json(DB / 'schemas/meta_common.json')
    files = sorted(p for p in (DB / 'data').rglob('*') if p.suffix in {'.json', '.md'})
    errors, preservation = preservation_errors(files, provenance)
    entries, index, issues = [], {}, []
    course_ids = {r['course_id'] for p in files if p.parent.name == 'courses' for r in load_file(p)[1]}
    identities = set()
    counts = Counter()
    known_doc_ids = set()
    for path in files:
        domain, category = path.relative_to(DB / 'data').parts[:2]
        config = categories.get(category)
        if not isinstance(config, dict) or config['domain'] != domain:
            errors.append(f'Unregistered category: {relative(path)}')
            continue
        meta, rows, body = load_file(path)
        doc_id = f'{domain}.{category}.{path.stem}'
        known_doc_ids.add(doc_id)
        local_errors = schema_errors(meta, meta_schema)
        local_errors += [f'Null or empty value: {p}' for p in empty_values(meta)]
        if meta['source_name'] not in sources:
            local_errors.append('Unregistered source_name')
        if not re.fullmatch(r'[a-z0-9_]+', path.stem):
            local_errors.append('Non-snake-case filename')
        if not path.stem.startswith(meta['source_name'] + '__'):
            local_errors.append('Filename source_name mismatch')
        if not path.stem.endswith('__' + meta['academic_year'].replace('-', '_')):
            local_errors.append('Filename academic_year mismatch')
        blockers = []
        if meta['status'] != 'verified':
            blockers.append('status_' + meta['status'])
        if meta['access_level'] != 'public':
            blockers.append('non_public')
        if config['file_type'] == 'document':
            if not meta.get('summary') or not body.strip():
                local_errors.append('Document summary or body missing')
            if len(body.split()) > 3000:
                local_errors.append('Document exceeds 3000 words; split by topic without truncation')
        else:
            schema = load_json(DB / 'schemas' / (config['schema'] + '.json'))
            for position, record in enumerate(rows):
                local_errors += [f'record {position}: {e}' for e in schema_errors(record, schema)]
                local_errors += [f'record {position}: null or empty {p}' for p in empty_values(record)]
                record_id = record[config['id_field']]
                identity = (category, meta['academic_year'], record_id)
                if identity in identities:
                    local_errors.append(f'Duplicate category/year id: {identity}')
                identities.add(identity)
                slug = record_id.lower().replace(' ', '_')
                key = f'{doc_id}#{slug}'
                if key in index:
                    local_errors.append(f'Duplicate vector/lookup key: {key}')
                index[key] = {'file': relative(path), 'position': position, 'record_id': record_id, 'record_slug': slug, 'doc_id': doc_id, 'academic_year': meta['academic_year']}
                missing = sorted(set(record.get('prerequisites', [])) - course_ids) if category == 'courses' else []
                if category == 'course_sections' and record['course_id'] not in course_ids:
                    missing = [record['course_id']]
                if missing:
                    blockers.append('missing_course_references')
                    issues.append({'file': relative(path), 'record_id': record_id, 'code': 'missing_course_references', 'missing_ids': missing})
                if category == 'course_sections':
                    unknown = [k for k in ['start_time', 'end_time', 'location', 'modality', 'instructor'] if record[k] in {'TBA', 'unverified', 'not_listed'}]
                    if unknown:
                        issues.append({'file': relative(path), 'record_id': record_id, 'code': 'explicit_unknown_section_fields', 'fields': unknown, 'severity': 'warning'})
                if category == 'event_listings' and (record.get('organizer') == 'Today' or record['start_date'] != record['end_date']):
                    issues.append({'file': relative(path), 'record_id': record_id, 'code': 'review_transcription_and_timezone', 'severity': 'review'})
        if local_errors:
            blockers.append('validation_errors')
            errors.extend(f'{relative(path)}: {e}' for e in local_errors)
        blockers = sorted(set(blockers))
        entries.append({'path': relative(path), 'sha256': digest(path.read_bytes()), 'doc_id': doc_id, 'domain': domain, 'category': category, 'academic_year': meta['academic_year'], 'version': meta['version'], 'status': meta['status'], 'records': len(rows), 'eligible_input': not blockers, 'blockers': blockers})
        for key in [k for k in index if k.startswith(doc_id + '#')]:
            index[key]['eligible_input'] = not blockers
        counts[f'{domain}.{category}.files'] += 1
        counts[f'{domain}.{category}.records'] += len(rows)
    for line in (ROOT / 'evaluation/golden_queries.jsonl').read_text(encoding='utf-8-sig').splitlines():
        query = JsonObject.model_validate_json(line).root
        for doc_id in query.get('expected_doc_ids', []):
            if doc_id not in known_doc_ids:
                errors.append(f'Golden query references absent doc_id: {doc_id}')
    report = {'purpose': 'Offline structural and lossless-preservation audit; source facts were not independently reverified.', 'structural_errors': errors, 'preservation': preservation, 'counts': dict(sorted(counts.items())), 'total_files': len(files), 'total_records': len(index), 'eligible_input_files': sum(e['eligible_input'] for e in entries), 'eligible_input_records': sum(e['records'] for e in entries if e['eligible_input']), 'held_files': sum(not e['eligible_input'] for e in entries), 'missing_prerequisite_ids': sorted({i for issue in issues for i in issue.get('missing_ids', [])}), 'quality_issues': issues, 'remote_upload_performed': False, 'chunking_and_embeddings_prepared': False}
    write_json(OUTPUT / 'audit_report.json', report)
    if errors:
        write_json(DB / 'registry/readiness_manifest.json', {'purpose': 'Audit failed; no input is eligible until errors are corrected and the audit is rerun.', 'schema_version': 1, 'audit_status': 'failed', 'files': []})
        write_json(OUTPUT / 'records_index.json', {'purpose': 'Audit failed; previous lookup index invalidated.', 'records': {}})
        print(json.dumps({'structural_errors': len(errors), 'examples': errors[:8], 'report': relative(OUTPUT / 'audit_report.json')}))
        return 1
    manifest = {'purpose': 'Data-input manifest only, not a vector/upsert payload. Re-run the audit after edits and verify each file hash before consuming it. Consume eligible_input entries only; profiles, archives and legacy code are excluded.', 'schema_version': 1, 'audit_status': 'passed', 'files': entries}
    write_json(DB / 'registry/readiness_manifest.json', manifest)
    write_json(OUTPUT / 'records_index.json', {'purpose': 'Composite id -> complete local record; eligible_input controls production eligibility. Includes held records for review only.', 'records': index})
    write_json(DB / 'registry/data_quality.json', {k: v for k, v in report.items() if k != 'counts'})
    print(json.dumps({k: v for k, v in report.items() if k not in {'quality_issues', 'counts', 'missing_prerequisite_ids'}}))
    return 0


if __name__ == '__main__':
    raise SystemExit(audit())
