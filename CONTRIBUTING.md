# CONTRIBUTING.md

Where everything lives. Update this file whenever the structure changes.

## Folder structure
```
trojan_compass/
├── AGENTS.md / CONTRIBUTING.md / PROJECT_DETAILS.md / TASKS.md / README.md
├── docs/
│   ├── configurations/          # shared config notes and presets
│   ├── system_architecture/     # architecture diagram (v2) and notes
│   └── large_scale_design/      # how we would build this at production scale (later)
├── backend/
│   ├── main.py                  # FastAPI entry point
│   └── app/
│       ├── api/                 # routes: chat stream, session, health
│       ├── security/            # auth (JWT), rate_limit, input_guard, output_guard
│       ├── orchestration/       # LangGraph flow (see below)
│       ├── agents/              # domain agents (see below)
│       ├── tools/               # tool registry, structured data tools, knowledge retrieval tool
│       ├── retrieval/           # ingest, chunker, embedder, pinecone_store, retriever, reranker
│       ├── llm_gateway/         # provider routing, timeouts, fallback (Gemini, Groq, etc.)
│       ├── session_store/       # conversation state and task status
│       ├── observability/       # logs, latency and token usage
│       ├── schemas/             # Pydantic models shared across the backend
│       └── config/              # settings loaded from .env and project values
├── frontend/
│   └── src/
│       ├── app/                 # Next.js pages and layout
│       ├── components/          # chat, cards, comparison tables, checklist
│       └── lib/                 # API client and SSE streaming helpers
├── local_database/
│   ├── README.md               # local commands and collection semantics; root DATA_GUIDE.md is canonical
│   ├── career_collection_report.md # verified coverage, access gaps, and validation outcome
│   ├── registry/
│   │   ├── categories.json      # every category: domain, file_type, schema, search_fields, owner
│   │   ├── sources.json         # every website we replicate: url, owner, status
│   │   └── source_checks.json   # manual access observations; no private portal contents
│   ├── schemas/                 # one JSON schema per record type + meta_common.json
│   ├── data/
│   │   ├── academic/            # owner: person_1
│   │   │   ├── courses/         # records
│   │   │   ├── course_sections/ # records
│   │   │   ├── academic_calendar/ # records (deadlines)
│   │   │   ├── bulletin/        # documents
│   │   │   └── registration_policies/
│   │   ├── housing/             # owner: person_2
│   │   │   ├── listings/        # records
│   │   │   └── housing_guides/  # documents
│   │   ├── career/              # owner: person_3
│   │   │   ├── job_listings/    # records
│   │   │   ├── career_guides/   # documents
│   │   │   ├── research_labs/  # research profiles and qualified recruitment status
│   │   │   ├── opportunities/  # partial announcements, research, internships, events
│   │   │   └── career_resources/ # employer/platform/service guides and exact policy values
│   │   └── student_services/    # owner: person_4
│   │       ├── service_directory/ # records
│   │       ├── international_students/ # documents
│   │       └── student_policies/ # documents
│   ├── student_profiles/        # synthetic profiles, JSON, never embedded
│   ├── raw/                     # optional original saved pages/PDFs (gitignored)
│   ├── processed/               # generated: chunks.jsonl, manifest.json (gitignored)
│   └── scripts/
│       ├── data_models.py       # typed collection boundaries
│       ├── dataset_io.py        # registry, document, and record readers
│       ├── export_schemas.py    # generates checked-in schemas for intentional changes
│       ├── prepare_tokenizer.py # opt-in pinned tokenizer setup
│       ├── requirements.txt     # local data tooling dependencies
│       ├── validate_data.py     # checks meta, schema, ids, dates, provenance, tokens
│       ├── build_chunks.py      # local full rebuild; remote embeddings not implemented
│       └── lookup_records.py    # public verified exact-record lookup demonstration
└── evaluation/                  # benchmark questions, reference answers, comparison vs general AI
```

## Where to look
| I need to... | Go to |
|---|---|
| Change the request flow (plan, dispatch, verify, synthesize) | `backend/app/orchestration/` |
| Edit one domain agent | `backend/app/agents/<name>_agent.py` |
| Add or change a tool an agent can call | `backend/app/tools/` |
| Change chunking, embeddings, top-k or reranking | `backend/app/retrieval/` |
| Add or fix structured data | `local_database/data/<domain>/<category>/` |
| Add or change data | Root `DATA_GUIDE.md`; local commands in `local_database/README.md` |
| Add source documents for RAG | `local_database/data/<domain>/<document_category>/` |
| Change auth, guards or rate limits | `backend/app/security/` |
| Swap or add an LLM provider | `backend/app/llm_gateway/` |
| Change a UI component | `frontend/src/components/` |

## Implemented career collection files

The application folders above remain the intended layout; this checkout currently implements the local career collection. Career filenames use `{source_name}__{topic}__{academic_year}.json` or `.md`; the collection report summarizes each category. `evaluation/golden_queries.jsonl` and `evaluation/README.md` own the career query set.

`schemas/` contains `meta_common.json`, `job_listing.json`, `research_lab.json`, `career_opportunity.json`, `career_resource.json`, and `source_checks.json`, exported from `scripts/data_models.py`. The three additional career record categories implement the task's laboratories, partial opportunities, and resources without weakening `job_listings` required fields. Registry `_comment` entries are explanatory and are skipped by ingestion.

`raw/` and `processed/` are ignored. The initial builder produces local chunks, outlines, records_index, validation_report, and manifest files, but no embeddings or remote writes. There is no implemented `push_to_pinecone.py` yet. See `local_database/README.md` for the exact boundary and reproduction commands.

## Orchestration files (`backend/app/orchestration/`)
`graph.py` (LangGraph wiring), `supervisor.py` (understand query, plan, clarify), `task_dispatcher.py`, `result_normalizer.py`, `result_aggregator.py`, `verifier.py` (data, maths, sources, freshness), `recovery.py` (one targeted retry, partial results), `synthesizer.py`, `fallback.py`.

## Agent files (`backend/app/agents/`)
- `base_agent.py`: shared agent interface and tool-call loop.
- `academic_agent.py`: courses, prerequisites, schedule conflicts, deadlines.
- `housing_agent.py`: listings, rent, distance, amenities, budget maths.
- `career_agent.py`: campus jobs, internships, eligibility, deadlines.
- `student_services_agent.py`: USC services directory, international student onboarding, policies.
- New agents follow the same pattern: one file, one tool allow-list registered in `tools/tool_registry.py`.
