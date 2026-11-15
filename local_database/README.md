<!-- Operating instructions and limitations for the curated career dataset. -->
# Local career knowledge

The canonical collection contract is [the root DATA_GUIDE](../DATA_GUIDE.md). This directory implements the career portion of that structure. It contains manually researched public information, not student records or a live scraping service. Read [the collection report](career_collection_report.md) for coverage and gaps.

## Categories and source facts

- `data/career/career_guides/`: 13 source-linked procedures and preparation guides.
- `data/career/research_labs/`: 19 profiles; general interest is distinct from current recruitment.
- `data/career/opportunities/`: 7 dated announcements, internships, or events. Missing salary, dates, and hours remain absent.
- `data/career/career_resources/`: 40 campus employers, platforms, services, programs, and exact policy facts. Two records are drafts and excluded from retrieval.
- `job_listings` remains registered with all DATA_GUIDE required fields. No collected vacancy has every required exact field, so no job records were fabricated to populate it. Empty directories are not tracked by Git.

An envelope's `meta` applies to every record. Each record also repeats its primary source and verification date and includes evidence observations. `purpose`, JSON Schema `$comment`, registry `_comment`, and Markdown front-matter comments document file purpose without invalid JSON comments. JSONL uses the specified one-query-per-line format.

`status: verified` means the public statement was checked. `recruitment_status` separately records availability: `active`, `upcoming`, `closed`, `unverified`, `interest_only`, `not_recruiting`, or `no_opening_verified`. The last means no opening was established from inspected sources, not proof that no opening exists anywhere. `data_origin: public_copy` includes concise paraphrases of public sources; no synthetic vacancies were introduced. International eligibility stays `unverified` unless explicitly established for that particular opportunity.

## Reproduce locally

Use Python 3.12 or later from the repository root:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r local_database/scripts/requirements.txt
.\.venv\Scripts\python.exe local_database/scripts/prepare_tokenizer.py
.\.venv\Scripts\python.exe local_database/scripts/validate_data.py --as-of 2026-11-14
.\.venv\Scripts\python.exe local_database/scripts/build_chunks.py --as-of 2026-11-14
.\.venv\Scripts\python.exe local_database/scripts/lookup_records.py teppit_student_worker_fall_2026 --as-of 2026-11-14
```

Only dependency installation and the first tokenizer setup require network access. The tokenizer's SHA-256 is pinned. No model weights, hosted LLM, Pinecone credentials, or student login are required. Use the actual review date for future collection runs; changing `--as-of` does not reverify a source. Record corrections require a version bump and renewed evidence/date; new academic years use new files.

Schemas are checked in. After an intentional model/schema change, run `export_schemas.py`, review the resulting diff, then validate. The validator checks both JSON Schema and Pydantic models, metadata/date/source integrity, duplicate IDs and title/source pairs, lab references, expired availability, source-access observations, golden references, and BGE token counts.

## Retrieval preparation boundary

`processed/` is ignored and rebuildable. It contains heading chunks, outline trees, local record indexes, hashes, provenance URLs, neighboring section IDs, token counts, and a manifest. Only public, verified envelopes enter either the record index or chunk output; drafts are excluded. The exact lookup checks this boundary again and computes expiry at the requested date.

This initial builder rebuilds the small corpus on each run. All current sections fit below 450 BGE tokens, including context and special tokens. Oversized sections fail validation and must be split editorially; automatic paragraph splitting/50-token overlap and incremental caching remain future shared-pipeline work. Duplicate text is grouped by hash and authority, with `duplicate_of` and `also_in` pointers; all sources remain in local chunks.

No embedding, sparse-vector fitting, Pinecone upload, or retrieval benchmark has run. There was no existing `push_to_pinecone.py`, backend retrieval implementation, or index configuration in the checkout. The manifest explicitly records these unrun stages. It is a preparation manifest, not proof of server state; a future uploader must maintain its own last-successful-upload state before deleting vectors. No dense/hybrid recall or MRR claim is made.

`lookup_records.py` demonstrates exact local access, not a deployed API or complete natural-language router. A future backend must add authenticated authorization, year-aware routing, current-source refresh rules, filters, and the shared retrieval pipeline described by DATA_GUIDE.
