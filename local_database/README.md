<!-- Entry point to the collected data and its schemas. -->
# Local database

**The collected files are in [data/](data/).** All 111 source files are retained in full: 1,339 JSON records and 28 Markdown documents. Follow the [DATA_GUIDE](../docs/DATA_GUIDE.md) for formats and Pinecone ingestion.

| Data | Folder | Contents |
|---|---|---|
| Academic courses | [courses](data/academic/courses/) | 231 records in 4 batches |
| Academic sections | [course_sections](data/academic/course_sections/) | 803 section records in 4 batches |
| Degree requirements | [degree_requirements](data/academic/degree_requirements/) | 6 historical program records |
| Research labs | [research_labs](data/career/research_labs/) | 19 records |
| Career opportunities | [opportunities](data/career/opportunities/) | 7 records |
| Career resources | [career_resources](data/career/career_resources/) | 40 records |
| Career guides | [career_guides](data/career/career_guides/) | 13 documents |
| USC services | [service_directory](data/student_services/service_directory/) | 8 portal records |
| International students | [international_students](data/student_services/international_students/) | 7 documents |
| Student policies | [student_policies](data/student_services/student_policies/) | 8 documents |
| Student-life events | [event_listings](data/student_services/event_listings/) | 215 records |
| Basic needs | [support_resources](data/student_services/support_resources/) | 10 complete topic records |

[registry/categories.json](registry/categories.json) defines the categories; [registry/sources.json](registry/sources.json) identifies their sources. [registry/source_checks.json](registry/source_checks.json) retains collection access observations. [schemas/](schemas/) contains their validation schemas. [student_profiles/](student_profiles/) is reserved for synthetic profiles and is currently empty. Housing and other reserved categories have no collected records yet.

Only public files with `meta.status: verified` may be indexed. There are 99 such files (1,086 records plus 28 documents). Twelve files remain draft: 20 courses referencing 38 absent prerequisite IDs, six historical degree programs, two career resources, 215 transcribed events and ten basic-needs topics. They remain in the same category folders with their full content and draft metadata.

All 803 section listings retain explicitly unknown modality/location; 96 have TBA times and 359 have no listed instructor. Treat these values as unknown. Canonical section IDs include the course code; `source_section_id` retains the original alias. Degree filenames use their actual historical catalogue years.

## Pinecone status and commands

The Pinecone index is `trojan-compass`: 384-dimensional normalized BGE-small vectors, dotproduct metric, with BM25 sparse values in the same index. The first verified upload contains **1,249 vectors**: academic **1,014**, career **132**, and student_services **103**. Housing has no collected data and therefore no populated namespace. All 12 draft files remain local.

The API key is read from root `.env` as `PINECONE_API_KEY`; `.env` is ignored by Git. The Pinecone Codex plugin is installed locally, but the reproducible upload uses the pinned Python SDK and local model rather than an integrated-embedding plugin workflow.

From the repository root:

```powershell
.venv\Scripts\python.exe -m pip install -r local_database/scripts/requirements.txt
.venv\Scripts\python.exe local_database/scripts/push_to_pinecone.py --dry-run
.venv\Scripts\python.exe local_database/scripts/push_to_pinecone.py
.venv\Scripts\python.exe local_database/scripts/push_to_pinecone.py --verify-only
```

The model downloads once from its pinned official revision into ignored `processed/model/`, with SHA-256 verification. Subsequent runs reuse unchanged file chunks and cached embeddings. BM25 is fitted on the complete eligible corpus and refitted on 25% growth or `--refit`; refitting updates all sparse payloads. Changed vectors are upserted in batches of 100. Only stale vectors marked `dataset_id: trojan_compass` are removed; unrelated records and indexes are never deleted.

Every successful upload fetches all vectors back, checks IDs, dense/sparse values and metadata, and verifies searches across all three populated domains. `processed/upload_report.json` contains the actual result; `processed/manifest.json` is written only after verification succeeds. Generated files, model weights and caches remain ignored. No original data content is shortened or overwritten.

```powershell
.venv\Scripts\python.exe local_database/scripts/query_store.py "CSCI 104" --exact
.venv\Scripts\python.exe local_database/scripts/query_store.py "F-1 on-campus employment hours" --domain career --keyword
```

Exact lookup returns complete local records. Hybrid search enforces public access, dataset ownership and the academic year (`--year` changes it); it returns candidates, not final numeric answers or a reranked production response. Do not use unknown section values as confirmed scheduling facts.

The active scripts live in `scripts/`, following DATA_GUIDE. Earlier duplicate archives and old pipeline code remain recoverable in Git history at `89fadce`; they have not been restored to the data tree.
