<!-- Describes the consolidated dataset and future ingestion boundary. -->
# Local database

Root `../DATA_GUIDE.md` is authoritative. All collected knowledge lives in `data/<domain>/<category>/`. Complete local JSON provides exact facts; future Pinecone retrieval will locate records and document passages.

| Location | Purpose |
|---|---|
| `data/academic/` | Courses, sections and historical degree requirements |
| `data/career/` | Research labs, opportunities, resources and guides |
| `data/student_services/` | Portal directory, policies, international-student guides, events and basic needs |
| `data/housing/` | Reserved collection folders; no listings found in the inspected branches |
| `student_profiles/` | Synthetic profiles only; never embedded; currently empty |
| `registry/categories.json`, `sources.json` | Category schemas, search templates, filters and source identities |
| `registry/readiness_manifest.json` | Every canonical file, hash, generated doc ID, year and input eligibility |
| `registry/data_quality.json` | Blockers, unknown values and preservation results |
| `registry/consolidation_provenance.json` | Branch tips, original paths, hashes and transformations |
| `registry/ingestion_contract.json` | Settings and obligations for the future uploader |
| `schemas/` | Metadata and record schemas; nested source details retained |
| `source_archive/` | Immutable branch originals; never ingested |
| `legacy_code/` | Inactive old pipeline code; never executed or ingested |
| `scripts/audit_dataset.py` | Offline audit and data manifest generator |
| `processed/preparation/` | Generated audit report and full-record lookup index; gitignored |
| `processed/legacy_output/` | Isolated older generated artifacts; obsolete and gitignored |
| `raw/` | Optional original captures and one-off collection tools; gitignored |

## Reproduce the audit

Run from the repository root using the existing environment:

```powershell
.venv\Scripts\python.exe local_database/scripts/audit_dataset.py
```

For a fresh environment, install `local_database/scripts/requirements.txt` first. The audit needs no API key or internet. It checks all files, including drafts, against schemas; checks IDs, dates, filenames, source registrations, prerequisite references and golden-query document IDs; verifies archived hashes; and compares complete original records and Markdown text. Missing prerequisite records are explicit draft blockers. Structural or preservation errors return a nonzero exit status; the readiness manifest is published only after those checks pass.

`processed/preparation/records_index.json` maps `{doc_id}#{record_slug}` to the complete local JSON file and array position. It includes review entries, so consumers must enforce `eligible_input` and authenticated access in code. Exact answers come from the full record, never shortened search text. Section IDs include the course code; `source_section_id` and `sis_section_id` retain original aliases.

## Current preparation status

There are **111 files, 1,339 records and 28 Markdown documents**. The input manifest permits **99 files / 1,086 records** and holds **12 files / 253 records**. Held data includes 20 courses with absent prerequisite records, six historical degree programs, two career resources, 215 events and ten basic-needs topics. Every held record remains complete in `data/`.

The user supplied the Engage calendar URL for the events. This establishes attribution, not event-status verification. Existing verified statuses elsewhere are inherited from collectors, not fresh live-source checks. All 803 sections have explicitly unverified modality/location; 96 have TBA times and 359 have no listed instructor. These values must not be used as confirmed schedule facts. See `consolidation_report.md` for the full handoff.

## Future Pinecone preparation

This is a prepared source dataset, not a vector upload package. No embeddings, BM25 fit, Pinecone index or upserts were produced. The old upload code is inactive. Future implementation must consume eligible files, apply DATA_GUIDE's heading-aware 350/450-token chunking with 50-token overlap, preserve tables and numbered lists, build complete manifests and lookup mappings, embed with normalized BGE-small vectors, fit BM25, and upload to domain namespaces. Oversized content must be split losslessly or flagged, never truncated. Providing a key does not by itself implement these remaining pipeline steps.
