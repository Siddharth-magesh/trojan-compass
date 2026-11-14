# DATA_GUIDE.md

How to collect, store and index data. Everyone collecting data follows this exactly.

## Principles
- Local files in `local_database/data/` are the source of truth. Pinecone is a derived index and can be rebuilt any time.
- One file = one unit of ingestion (one page, policy, guide, or one batch of records).
- Structured facts (rent, prerequisites, times, eligibility) are read from the local JSON by code. Pinecone is only used to find the right records or passages.
- Synthetic and replicated data must be labeled (`data_origin`). No scraping at runtime; collect by hand or with one-off scripts.

## Folder structure
```
local_database/
├── DATA_GUIDE.md
├── registry/
│   ├── categories.json          # every category: domain, file_type, schema, search_fields, owner
│   └── sources.json             # every website we replicate: url, owner, status
├── schemas/                     # one JSON schema per record type + meta_common.json
├── data/
│   ├── academic/                # owner: person_1
│   │   ├── courses/             # records
│   │   ├── course_sections/     # records
│   │   ├── academic_calendar/   # records (deadlines)
│   │   ├── bulletin/            # documents
│   │   └── registration_policies/
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
├── raw/                         # optional original saved pages/PDFs (gitignored)
├── processed/                   # generated: chunks.jsonl, manifest.json (gitignored)
└── scripts/
    ├── validate_data.py         # checks meta, schema, ids, dates
    ├── build_chunks.py          # files -> chunks, skips unchanged files by hash
    └── push_to_pinecone.py      # embeds new/changed chunks, upserts, deletes stale ids
```
New category: create the folder, add it to `registry/categories.json`, and add a schema if it holds records. No code change needed.

## File naming
- snake_case, lowercase: `{source_name}__{topic}.md` or `.json`, e.g. `usc_iss__f1_arrival_checklist.md`.
- `doc_id` is generated from the path: `{domain}.{category}.{file_stem}`. Never write it by hand.
- Keep each document file to one topic (roughly under 3,000 words). Split large handbooks by chapter into separate files.

## Required meta (every file)
| Field | Type | Notes |
|---|---|---|
| title | string | |
| source_name | string | must exist in `registry/sources.json` |
| source_url | string | page the content came from |
| collected_by | string | your name |
| collected_date, last_verified_date | `YYYY-MM-DD` | update verified date on every re-check |
| academic_year | string | e.g. `2026-2027`, omit if not applicable |
| version | int | start at 1, bump on every content change |
| status | `draft` / `verified` / `deprecated` | only `verified` files are pushed |
| data_origin | `public_copy` / `synthetic` | |
| access_level | `public` / `synthetic_private` | default `public` |
| audience | list | `all`, `international`, `undergraduate`, `graduate` |
| tags | list | 3-8 lowercase keywords |

Omit any field with no value. Never use `null` or empty strings (Pinecone rejects null metadata).

## File type 1: documents (`.md` with front matter)
Used for pages, policies, guides, FAQs. Headings define the hierarchy, so keep them clean.
```markdown
---
title: F-1 Arrival Checklist
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
Copy only meaningful content. Drop navigation, footers, cookie banners and duplicate text.

## File type 2: records (`.json`)
Used for courses, sections, housing, jobs, deadlines, services. One file holds many records from one source.
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
Rules: numbers stay numbers (`1200`, not `"$1,200"`), booleans stay booleans, dates are ISO, lists are lists, keys are snake_case, and the id field is unique and stable across versions.

## Record schemas (required fields)
| Category | Id field | Required fields |
|---|---|---|
| courses | course_id | title, units, level, description, prerequisites, terms_offered |
| course_sections | section_id | course_id, term, instructor, days, start_time, end_time, location, modality |
| academic_calendar | deadline_id | title, date, term, applies_to, description |
| listings | listing_id | name, housing_type, address, neighborhood, monthly_rent_usd, bedrooms, distance_to_campus_miles, campus, amenities, furnished, available_from |
| job_listings | job_id | title, employer, job_type, location, hourly_pay_usd, hours_per_week, required_skills, international_eligibility, deadline, apply_url |
| service_directory | service_id | name, purpose, official_url, login_required, replicated, common_tasks |
| student_profiles | student_id | fake name, program, level, country, interests, completed_courses, housing_budget_usd, job_interests |

- `job_listings.international_eligibility` is `yes`, `no` or `unverified`. Never guess.
- `search_text` is built automatically from the category's `search_fields` in `categories.json` (for example title + description + tags for courses). Do not write it by hand.

## Pinecone mapping
- One index `trojan_compass`: serverless, dimension 384 (BGE-small), metric cosine. If the embedding model changes, recreate the index and re-push everything.
- **Namespace = domain** (`academic`, `housing`, `career`, `student_services`). Agents query their own namespace and filter by `category`, `audience`, `academic_year`.
- **Vector id** = `{doc_id}#{chunk_no}` for documents and `{doc_id}#{record_id}` for records.
- **Chunking:** documents are split by heading. Each chunk is prefixed with `title > heading path` and capped at 512 tokens (64 overlap only for oversized sections). Records get one vector each, from `search_text`.
- **Vector metadata** (flat, no nulls, under 40 KB): `doc_id`, `record_id` (records only), `domain`, `category`, `title`, `section_path`, `chunk_no`, `source_name`, `source_url`, `academic_year`, `version`, `verified_date_num` (int, `YYYYMMDD`, used for freshness filters), `audience`, `tags`, `data_origin`, `embed_model`, `text` (the chunk text, short).
- **Hierarchy:** `processed/chunks.jsonl` keeps parent and neighbor links, so "expand to the full section" is answered locally with no extra Pinecone call.
- Student profiles are never embedded. They are loaded by code for the logged-in user only.

## Ingestion flow (run after any data change)
1. `validate_data.py` checks every file against meta and schemas and fails on the first error.
2. `build_chunks.py` hashes each file, compares with `processed/manifest.json`, and rebuilds chunks only for new or changed files.
3. `push_to_pinecone.py` embeds those chunks, upserts in batches of 100 into the domain namespace, and deletes ids listed in the manifest that no longer exist. Re-running is always safe.
4. Removing a file or setting `status: deprecated` removes its vectors on the next push.

## Collection workflow (4 people)
| Person | Domain | Owns |
|---|---|---|
| person_1 | academic | courses, sections, calendar, bulletin, registration policies |
| person_2 | housing | listings, housing guides |
| person_3 | career | job listings, career guides |
| person_4 | student_services | service directory, international student docs, student policies, `student_profiles/` |

1. Add your websites to `registry/sources.json` (`url`, `owner`, `status`: `todo` / `in_progress` / `done`).
2. Work only inside your own domain folder. Never edit another person's files, and ask before changing a schema or the registry.
3. Create a branch (`feat/data_<domain>_<topic>`), add files, run `validate_data.py`, then open a PR.
4. When updating a file, bump `version` and `last_verified_date`. Never delete history by overwriting without a version bump.