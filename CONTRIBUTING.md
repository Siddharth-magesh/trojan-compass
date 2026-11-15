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
│   ├── DATA_GUIDE.md
│   ├── registry/
│   │   ├── categories.json      # every category: domain, file_type, schema, search_fields, owner
│   │   └── sources.json         # every website we replicate: url, owner, status
│   ├── schemas/                 # one JSON schema per record type + meta_common.json
│   ├── data/
│   │   ├── academic/            # owner: person_1
│   │   │   ├── courses/         # records
│   │   │   ├── course_sections/ # records
│   │   │   ├── degree_requirements/ # records (BS/MS/PhD requirements per program)
│   │   │   ├── academic_calendar/ # records (deadlines)
│   │   │   ├── bulletin/        # documents
│   │   │   └── registration_policies/
│   │   ├── housing/             # owner: person_2
│   │   │   ├── listings/        # records
│   │   │   └── housing_guides/  # documents
│   │   ├── career/              # owner: person_3
│   │   │   ├── job_listings/    # records
│   │   │   └── career_guides/   # documents
│   │   └── student_services/    # owner: person_4
│   │       ├── service_directory/ # records
│   │       ├── international_students/ # documents
│   │       └── student_policies/ # documents
│   ├── student_profiles/        # synthetic profiles, JSON, never embedded
│   ├── raw/                     # optional original saved pages/PDFs (gitignored)
│   ├── processed/               # generated: chunks.jsonl, manifest.json (gitignored)
│   ├── requirements.txt         # Python deps for the data pipeline
│   └── scripts/
│       ├── data_common.py       # shared paths, parsing, ids, token counting, sectioning
│       ├── embedding.py         # BGE-small dense (cached) and BM25 sparse encoders
│       ├── validate_data.py     # checks meta, schema, ids, dates
│       ├── build_chunks.py      # files -> chunks, skips unchanged files by hash
│       ├── push_to_pinecone.py  # embeds new/changed chunks, upserts, deletes stale ids (--dry-run)
│       ├── eval_retrieval.py    # recall@5 / MRR on golden queries, dense vs hybrid (--local)
│       └── scrape_public_pages.py # one-off crawler for public USC help pages -> raw/
└── evaluation/
    └── golden_queries.jsonl     # retrieval benchmark queries, one JSON per line
```

## Where to look
| I need to... | Go to |
|---|---|
| Change the request flow (plan, dispatch, verify, synthesize) | `backend/app/orchestration/` |
| Edit one domain agent | `backend/app/agents/<name>_agent.py` |
| Add or change a tool an agent can call | `backend/app/tools/` |
| Change chunking, embeddings, top-k or reranking | `backend/app/retrieval/` |
| Add or fix synthetic data | `local_database/structured/` |
| Add or change data | `local_database/DATA_GUIDE.md` |
| Add source documents for RAG | `local_database/documents/` |
| Change auth, guards or rate limits | `backend/app/security/` |
| Swap or add an LLM provider | `backend/app/llm_gateway/` |
| Change a UI component | `frontend/src/components/` |

## Orchestration files (`backend/app/orchestration/`)
`graph.py` (LangGraph wiring), `supervisor.py` (understand query, plan, clarify), `task_dispatcher.py`, `result_normalizer.py`, `result_aggregator.py`, `verifier.py` (data, maths, sources, freshness), `recovery.py` (one targeted retry, partial results), `synthesizer.py`, `fallback.py`.

## Agent files (`backend/app/agents/`)
- `base_agent.py`: shared agent interface and tool-call loop.
- `academic_agent.py`: courses, prerequisites, schedule conflicts, deadlines.
- `housing_agent.py`: listings, rent, distance, amenities, budget maths.
- `career_agent.py`: campus jobs, internships, eligibility, deadlines.
- `student_services_agent.py`: USC services directory, international student onboarding, policies.
- New agents follow the same pattern: one file, one tool allow-list registered in `tools/tool_registry.py`.