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
│   ├── README.md / consolidation_report.md  # commands, readiness and remaining data issues
│   ├── career_collection_report.md         # historical career-collection findings
│   ├── registry/                           # categories, sources, source_checks, provenance,
│   │                                       # readiness_manifest, data_quality, ingestion_contract
│   ├── schemas/                            # shared metadata and one schema per record type
│   ├── data/
│   │   ├── academic/                       # courses, course_sections, degree_requirements,
│   │   │                                   # academic_calendar, bulletin, registration_policies
│   │   ├── housing/                        # listings, housing_guides (uncollected)
│   │   ├── career/                         # job_listings, career_guides, research_labs,
│   │   │                                   # opportunities, career_resources
│   │   └── student_services/               # service_directory, international_students,
│   │                                       # student_policies, event_listings, support_resources
│   ├── student_profiles/                   # synthetic only, never embedded
│   ├── source_archive/                     # immutable branch data/config snapshots; not ingested
│   ├── legacy_code/                        # inactive code snapshots; not executed or ingested
│   ├── raw/                                # optional originals and one-off tools; gitignored
│   ├── processed/                          # preparation/ outputs and legacy_output/; gitignored
│   └── scripts/
│       ├── audit_dataset.py                # offline schemas, preservation and input manifest
│       └── requirements.txt                # dependencies for that audit only
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

## Implemented local collection

The application folders above remain the intended layout. Collected knowledge is implemented under `local_database/`; root `DATA_GUIDE.md` is authoritative. Student-life JSON formerly under `Docs/Student Life/` has moved into `data/student_services/`. Canonical filenames include the registered source name and academic year. Historical years retain separate files.

Schemas cover courses, sections, degree requirements, academic calendar, housing listings, job listings, research labs, career opportunities/resources, service directory, events and support resources, plus metadata, source checks and synthetic profiles. JSON records preserve richer nested fields. Drafts remain in canonical data but are excluded by `registry/readiness_manifest.json`. Registry explanatory keys (`_comment`) are not categories or sources.

`source_archive/README.md` and `legacy_code/README.md` document the immutable originals and inactive old pipeline. The only supported local tool is `scripts/audit_dataset.py`. It produces a data-input manifest and an exact-record lookup index, not chunks, embeddings or a Pinecone upload. See `local_database/README.md` for its command and `consolidation_report.md` for readiness. `evaluation/` owns all 79 golden queries.

## Orchestration files (`backend/app/orchestration/`)
`graph.py` (LangGraph wiring), `supervisor.py` (understand query, plan, clarify), `task_dispatcher.py`, `result_normalizer.py`, `result_aggregator.py`, `verifier.py` (data, maths, sources, freshness), `recovery.py` (one targeted retry, partial results), `synthesizer.py`, `fallback.py`.

## Agent files (`backend/app/agents/`)
- `base_agent.py`: shared agent interface and tool-call loop.
- `academic_agent.py`: courses, prerequisites, schedule conflicts, deadlines.
- `housing_agent.py`: listings, rent, distance, amenities, budget maths.
- `career_agent.py`: campus jobs, internships, eligibility, deadlines.
- `student_services_agent.py`: USC services directory, international student onboarding, policies.
- New agents follow the same pattern: one file, one tool allow-list registered in `tools/tool_registry.py`.
