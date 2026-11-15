# DATA_GUIDE.md

How to collect, store and index data. Everyone collecting data follows this exactly.

## Principles
- Local files in `local_database/data/` are the source of truth. Pinecone is a derived index and can be rebuilt any time.
- One file = one unit of ingestion (one page, policy, guide, or one batch of records).
- Exact facts (rent, prerequisites, times, eligibility) are read from local JSON by code. Pinecone only finds the right records or passages.
- Label synthetic data (`data_origin`). No runtime scraping: collect by hand or with one-off scripts.

## Folder structure
```
local_database/
├── registry/
│   ├── categories.json          # per category: domain, file_type, schema, id_field, search_template, filter_fields
│   └── sources.json             # per website: url, owner, authority, status
├── schemas/                     # one JSON schema per record type + meta_common.json
├── data/
│   ├── academic/                # owner: person_1
│   │   ├── courses/             # records
│   │   ├── course_sections/     # records
│   │   ├── academic_calendar/   # records (deadlines)
│   │   ├── bulletin/            # documents
│   │   └── registration_policies/   # documents
│   ├── housing/                 # owner: person_2
│   │   ├── listings/            # records
│   │   └── housing_guides/      # documents
│   ├── career/                  # owner: person_3
│   │   ├── job_listings/        # records
│   │   └── career_guides/       # documents
│   └── student_services/        # owner: person_4
│       ├── service_directory/   # records
│       ├── international_students/   # documents
│       └── student_policies/    # documents
├── student_profiles/            # synthetic profiles, JSON, never embedded
├── raw/                         # optional original pages/PDFs (gitignored)
├── processed/                   # generated, gitignored (see "Generated files")
└── scripts/
    ├── source_data.py           # schema, source and reference validation
    ├── build_chunks.py          # passages, outlines and record lookup index
    ├── embedding_runtime.py     # pinned local BGE model and embedding cache
    ├── sparse_encoder.py        # persisted BM25 vocabulary and weights
    ├── pinecone_store.py        # guarded upload, cleanup and read-back checks
    ├── ingestion_models.py      # typed boundaries and shared settings
    ├── query_store.py           # public hybrid search / exact local lookup
    ├── requirements.txt
    └── push_to_pinecone.py      # single end-to-end command
```
New category: add the folder, a `categories.json` entry and (for records) a schema. No code change.

## File naming
- snake_case, lowercase: `{source_name}__{topic}.md` or `.json`, e.g. `usc_iss__f1_arrival_checklist.md`.
- Year-specific content (policies, calendars, catalogs) gets a year suffix: `usc_bulletin__grading_policy__2026_2027.md`. A new academic year is a new file, and last year's file stays indexed.
- `doc_id` is generated from the path: `{domain}.{category}.{file_stem}`. Never write it by hand.
- Each record also gets an auto-generated `record_slug` (id lowercased, spaces to underscores: `CSCI 567` -> `csci_567`) used in vector ids.
- One topic per document file (under ~3,000 words). Split big handbooks by chapter.

## Required meta (every file)
| Field | Type | Notes |
|---|---|---|
| title | string | |
| summary | string | 1-2 sentences on what this file answers (required for documents, optional for records). It is added to every chunk's embedded text. |
| source_name | string | must exist in `sources.json` |
| source_url | string | page the content came from |
| collected_by | string | your name |
| collected_date, last_verified_date | `YYYY-MM-DD` | update verified date on every re-check |
| academic_year | string | e.g. `2026-2027`. Required for policies, calendars, courses and listings. |
| version | int | start at 1, bump on a correction within the same academic year (replaces the previous vectors) |
| status | `draft` / `verified` / `deprecated` | only `verified` is indexed |
| data_origin | `public_copy` / `synthetic` | |
| access_level | `public` / `synthetic_private` | default `public`. `synthetic_private` also needs `owner_student_id`. |
| audience | list | `all`, `international`, `undergraduate`, `graduate` |
| tags | list | 3-8 lowercase keywords |

Omit fields with no value. Never use `null` or empty strings (Pinecone rejects null metadata).

## File type 1: documents (`.md` with front matter)
Headings define the hierarchy, so keep them clean and descriptive ("F-1 work authorization", not "Overview").
```markdown
---
title: F-1 Arrival Checklist
summary: Steps an incoming F-1 student must complete before and after arriving at USC.
source_name: usc_iss
source_url: https://iss.usc.edu/
collected_by: person_4
collected_date: 2026-11-14
last_verified_date: 2026-11-14
academic_year: 2026-2027
version: 1
status: verified
data_origin: public_copy
audience: [international]
tags: [arrival, f1, onboarding]
---
# F-1 Arrival Checklist
## Before you travel
Text...
## After you arrive
### Check in with ISS
Text...
```
Copy only meaningful content. Drop navigation, footers, banners and repeated text. Write dates, deadlines and amounts in the text itself, never as "see table above".

## File type 2: records (`.json`)
```json
{
  "meta": { "title": "CSCI courses fall 2026", "source_name": "usc_schedule_of_classes", "...": "same fields as above" },
  "records": [
    {
      "course_id": "CSCI 567",
      "title": "Machine Learning",
      "units": 4,
      "level": "graduate",
      "prerequisites": ["CSCI 270"],
      "terms_offered": ["fall", "spring"],
      "description": "...",
      "tags": ["machine_learning"]
    }
  ]
}
```
Numbers stay numbers (`1200`, not `"$1,200"`), booleans stay booleans, dates are ISO, lists are lists, keys are snake_case, and the id field is unique and stable across versions.

| Category | Id field | Required fields |
|---|---|---|
| courses | course_id | title, units, level, description, prerequisites, terms_offered |
| course_sections | section_id | course_id, term, instructor, days, start_time, end_time, location, modality |
| academic_calendar | deadline_id | title, date, term, applies_to, description |
| listings | listing_id | name, housing_type, address, neighborhood, monthly_rent_usd, bedrooms, distance_to_campus_miles, campus, amenities, furnished, available_from |
| job_listings | job_id | title, employer, job_type, location, hourly_pay_usd, hours_per_week, required_skills, international_eligibility, deadline, apply_url |
| service_directory | service_id | name, purpose, official_url, login_required, replicated, common_tasks |
| student_profiles | student_id | fake name, program, level, country, interests, completed_courses, housing_budget_usd, job_interests |

`international_eligibility` is `yes`, `no` or `unverified`. Never guess.

## Registry
`registry/categories.json` drives ingestion. The `search_template` turns a record into a natural sentence for embedding. `filter_fields` are copied into vector metadata so Pinecone can pre-filter on them.
```json
{
  "listings": {
    "domain": "housing", "file_type": "records", "schema": "housing_listing", "id_field": "listing_id",
    "search_template": "{name}, {housing_type} in {neighborhood}. ${monthly_rent_usd}/month, {bedrooms} bed, {distance_to_campus_miles} miles from {campus}. Amenities: {amenities}.",
    "filter_fields": ["monthly_rent_usd", "bedrooms", "distance_to_campus_miles", "campus", "furnished"]
  },
  "bulletin": { "domain": "academic", "file_type": "document" }
}
```
`registry/sources.json`: `{ "usc_iss": { "url": "https://iss.usc.edu/", "owner": "person_4", "authority": "official", "status": "in_progress" } }`. `authority` is `official`, `third_party` or `synthetic`, and is used to rank and de-duplicate results.

## Retrieval-ready indexing
Each file produces these vector types, all with a dense and a sparse part:
| chunk_type | One per | Embedded text | Purpose |
|---|---|---|---|
| outline | document file | title + summary + list of headings | coarse routing to the right document |
| chunk | heading section | breadcrumb (`title > h2 > h3`) + summary + section text | passage retrieval |
| record | record | `search_template` output (starts with the id and title) | semantic search over records |

Ids: `{doc_id}#outline`, `{doc_id}#{chunk_no:03d}`, `{doc_id}#{record_slug}`.

- **Chunking:** split by heading. Target ~350 tokens, hard cap 450 including breadcrumb and summary (BGE-small reads 512). Split oversized sections on paragraph breaks with 50 tokens overlap. Never split tables or numbered lists. Values to be tuned with the golden queries.
- **Dense:** BGE-small, 384 dims, L2-normalized. Passages are embedded without any prefix.
- **Sparse:** BM25 over the same embedded text, so exact terms (course codes, "CPT", "I-20") match. Fitted once on the full corpus (`processed/bm25_params.json`) and refitted (with a full re-upsert) only when the corpus has grown by about 25% or with `--refit`. Rule of thumb, tune later.
- **Embedding cache:** dense vectors are cached by `chunk_hash` + model name, so re-pushes never re-embed unchanged text.
- **Dedup:** if the same `chunk_hash` appears in several files, keep one vector from the highest-`authority` source and list the other `doc_id`s (max 5) in its `also_in` metadata. `chunks.jsonl` keeps every source URL, so citations show the authoritative source and can mention the others.
- **Vector metadata** (flat, no nulls, under 40 KB): `doc_id`, `record_slug`, `chunk_type`, `domain`, `category`, `title`, `section_path`, `chunk_no`, `source_name`, `source_url`, `authority`, `also_in`, `academic_year`, `version`, `verified_date_num` (int `YYYYMMDD`), `access_level`, `owner_student_id` (only if private), `audience`, `tags`, `data_origin`, `embed_model`, `text` (raw chunk, shown and cited), plus the category's `filter_fields`.
- Student profiles are never embedded. They are loaded by code for the logged-in user only.

## Pinecone config
- One serverless index `trojan-compass` (Pinecone requires hyphens rather than underscores): dimension 384, **metric `dotproduct`** (required for dense+sparse in one index). Changing the embedding model means recreating the index and re-pushing.
- **Namespace = domain** (`academic`, `housing`, `career`, `student_services`). Agents query their own namespace; `student_services` may query several.

## Access control
- Only `public` files are indexed. `push_to_pinecone.py` skips anything else unless it has an `owner_student_id`.
- Every query gets a mandatory metadata filter (`access_level`, plus `owner_student_id` for private data) built by the security middleware from the authenticated user's JWT. Agents and LLMs cannot change or remove it.
- Namespaces organize data. They are not authorization.
- Student profiles stay local and are never embedded.

## Query-time contract (for the retrieval code)
- **Route first, in code, not with an LLM:** ids and codes (`CSCI 567`, listing or job ids) and numeric or comparison questions (rent, units, times, conflicts, eligibility) go to JSON lookup tools using `records_index.json` and the local files. Return that record directly, and fall back to hybrid retrieval only on a miss.
- **Everything else uses hybrid retrieval:** embed the query **with** the prefix `Represent this sentence for searching relevant passages: ` (passages never get it). Alpha (dense weight) 0.75 by default, 0.25 for keyword-heavy text queries (e.g. "CPT", "I-20"). Tune on golden queries.
- **Year filter:** default to the current `academic_year` set in `PROJECT_DETAILS.md`. If the question names another year, filter on that year instead.
- Pre-filter with metadata the agent already knows (`category`, `audience`, `academic_year`, plus numeric filters such as rent or units). Pinecone numeric filters only narrow semantic candidates. Any number shown to the student comes from the local record.
- Retrieve top 20, rerank to 5. For long documents, optionally query `outline` vectors first, then search chunks with a `doc_id` filter.
- Expand a hit to its neighbors or full section from `processed/chunks.jsonl`. Use `records_index.json` to load the full record from local JSON.
- Rank `official` above `third_party` when scores are close. Show `verified_date` with every citation.

## Generated files (`processed/`)
`chunks.jsonl` (text, hashes, prev/next ids, section path in metadata, all source URLs), `outlines.json` (heading tree per document), `records_index.json` (record_slug -> file + position), `embedding_cache/`, `bm25_params.json`, and `manifest.json` (file hashes, vector ids per file, embed model, chunker settings, pipeline version). Any change to chunk settings or templates bumps the pipeline version and rebuilds everything.

## Ingestion flow (run after any data change)
1. `python local_database/scripts/push_to_pinecone.py --dry-run`: validate metadata, schemas, unique IDs, dates, registered sources, token limits, and course references for eligible files. Drafts retain unresolved references and are excluded. This builds local passages and lookup mappings without Pinecone access.
2. `build_chunks.py` (called by the command): hash each file and reuse prepared chunks only when source content, category configuration, source registry, model pin and chunker code/settings match. Generated files stay ignored under `processed/`.
3. `python local_database/scripts/push_to_pinecone.py`: embed uncached passages, compute BM25 sparse vectors, upsert changed records in batches of 100, and remove only obsolete vectors marked as owned by this dataset. Verify every uploaded ID, dense/sparse value and metadata field, then run realistic searches before committing the local manifest. `--verify-only` performs read-back checks without remote writes; `--refit` forces a full-corpus BM25 refit and re-upsert.
4. Removing a file or setting `status: deprecated` (wrong or withdrawn content) removes its vectors on the next push. Older academic years stay indexed as their own files. A same-year correction bumps `version` and replaces the previous vectors (old text stays in git history).

## Evaluation (how we know retrieval is good)
Each collector adds at least 15 queries for their domain to `evaluation/golden_queries.jsonl`, one JSON per line:
`{"query": "...", "domain": "housing", "type": "semantic|exact|filter|negative", "expected_doc_ids": ["..."]}`
Use empty `expected_doc_ids` for `negative` queries whose answer is not in our data. We report recall@5 and MRR, and compare dense-only vs hybrid vs hybrid + outline routing to choose alpha, chunk size and top-k. Exact and filter queries are checked against the JSON lookup tools, not Pinecone.

## Collection workflow (4 people)
| Person | Domain | Owns |
|---|---|---|
| person_1 | academic | courses, sections, calendar, bulletin, registration policies |
| person_2 | housing | listings, housing guides |
| person_3 | career | job listings, career guides |
| person_4 | student_services | service directory, international student docs, student policies, `student_profiles/` |

1. Add your websites to `registry/sources.json` first.
2. Work only inside your own domain folder. Ask before changing a schema or the registry.
3. Branch `feat/data_<domain>_<topic>`, add files, run the ingestion command with `--dry-run`, open a PR.
4. When updating a file, bump `version` and `last_verified_date`. For a new academic year, create a new file instead.
## Implemented ingestion safeguards

The current implementation indexes public, verified files only; private ingestion remains disabled. Embeddings use the pinned official BGE-small ONNX model with CLS pooling and L2 normalization. The Python SDK is pinned to 8.1.2 for the supported Vectors API used by this contract. Index creation uses AWS `us-east-1`, 384 dimensions, dotproduct and deletion protection. It refuses incompatible existing indexes and never deletes an index. API credentials are read only from the ignored root `.env`.

Vectors include `dataset_id`, `chunk_hash`, `payload_hash`, `model_revision`, `pipeline_version` and `bm25_hash` as flat provenance fields. Cleanup is restricted to this dataset's obsolete vectors; unrelated indexes and records are preserved. Deduplication respects domain and academic-year boundaries. A table or numbered list that cannot fit intact under the token cap stops ingestion for review. Empty eligible corpora are rejected instead of silently deleting the index contents.

Public hybrid queries enforce dataset, public-access, academic-year and BM25-version filters in code. The included query utility is a verification/reuse helper, not the full production router or reranker. Numerical/comparison answers still require complete local JSON and deterministic application logic. The index being ready does not mean a student-facing application or reranking evaluation has been implemented.
