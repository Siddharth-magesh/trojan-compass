# PROJECT_DETAILS.md

Technical facts for the prototype. Status: **set** = decided, **tbd** = to tune. Update on every change.

## Prototype scope
- Synthetic student profiles and manually curated public knowledge (`data_origin: public_copy`); no runtime scraping or real student records.
- Services (Advise USC, Handshake, housing, etc.) are replicated as local JSON data plus tools.
- Structured data lives in `local_database/data/<domain>/<category>/` as JSON and is queried in code. Record search text and document passages are prepared for derived indexing under DATA_GUIDE.
- LLM access is through hosted APIs with keys in `.env`.

## Stack
| Layer | Choice | Status |
|---|---|---|
| Frontend | Next.js, React, TypeScript, Tailwind, shadcn/ui, SSE streaming | set |
| Backend | Python, FastAPI, Pydantic | set |
| Orchestration | LangGraph (supervisor, parallel domain agents) | set |
| LLM providers | Gemini, Groq (primary), OpenRouter, NVIDIA NIM as fallbacks | set |
| Embeddings | BAAI/bge-small-en-v1.5, pinned ONNX revision `5c38ec7c405ec4b44b94cc5a9bb96e735b38267a`; CLS pooling, 384 dims, L2-normalized | set |
| Vector store | Pinecone (free tier, one index) | set |
| Doc parsing | PyMuPDF | set |
| Auth | Mock JWT for synthetic student users | set |
| Evaluation | Custom USC benchmark, optional RAGAS | tbd |

## Models
| Role | Model | Status |
|---|---|---|
| Primary (supervisor, agents, synthesizer) | Groq `openai/gpt-oss-120b` (Llama 3.3 70B was shut down 2026-08-16) | set |
| Fallback | Gemini `gemini-3.8-flash` via the OpenAI-compatible endpoint | set |
| Further fallbacks | OpenRouter / NVIDIA NIM | not implemented |

Model ids are env-configurable (`PRIMARY_MODEL`, `FALLBACK_MODEL`). Temperature: 0 for supervisor and agents, 0.3 for synthesizer. `max_tokens` 900 on every call. `LLM_MODE` = `live` | `mock` | `cache` (default `cache`: replay from `backend/.llm_cache/`, call live only on a miss). Caps: 8 LLM calls per request, 300 per process.

## RAG settings
| Setting | Value | Status |
|---|---|---|
| Chunk size / overlap | Target 350 / 50 tokens; hard cap 450 including context, per DATA_GUIDE | set |
| Retrieval | Hybrid (vector + BM25), then rerank | tbd |
| Top-k retrieved | 20 | tbd |
| Top-k after rerank | 5 | tbd |
| Index config | `trojan-compass`, 384 dims, dotproduct, AWS us-east-1 serverless, namespace per domain, batch 100; deletion protection enabled | set |
| Metadata on every chunk | Full flat metadata contract in DATA_GUIDE; explicit allow-list, no nulls, under 40 KB | set |
| Retrieval strategy comparison | Basic vs hybrid vs STAIR-inspired hierarchical | tbd |

Current academic year: `2026-2027`. Use an explicit year for historical or future-cycle queries; retain older academic-year files. DATA_GUIDE remains the authority for data and ingestion settings.

## Consolidated data status

All collected knowledge is under `local_database/data/`. Consolidation includes `main`, `Harsh`, `feat/data_career_knowledge`, `feat/data_student_services_portals`, and the already-contained `docs/mvp-plan` branch. The merged source history and earlier preservation records remain available at Git commit `89fadce`.

- 111 canonical files: 1,339 JSON records and 28 Markdown documents; 99 files / 1,086 records are eligible input, 12 files / 253 records remain draft.
- Academic: 231 courses, 803 section listings and six historical degree programs. Twenty courses reference 38 absent course IDs. Degree files use their actual catalogue years (2018-2019 through 2025-2026), remain draft, and must not answer current-year requirements.
- Career: 19 labs, seven opportunities, 40 resources and 13 guides, with two resources still draft.
- Student services: eight portal records, 15 guides, 215 draft events and ten draft basic-needs topics. The event source is the user-supplied Engage calendar URL; its contents were not independently verified.
- Housing, academic-calendar records and synthetic student profiles remain uncollected; no data was fabricated.
- All 803 section listings retain unknown modality/location; TBA times and absent instructors remain explicit unknowns. Cross-listed section IDs are disambiguated by course code; original IDs remain in `source_section_id`.

The tracked `local_database/` layout contains source data, schemas, registries, a short navigation README, the reserved synthetic-profile folder and the authorized ingestion scripts. All 111 data files are unchanged by the cleanup. Source archive duplicates, legacy code, reports, generated manifests and audit tooling were removed from the current tree and remain recoverable at Git commit `89fadce`.

## Implemented ingestion

`local_database/scripts/push_to_pinecone.py` validates source data, builds heading-aware passages/outlines and record search text, computes pinned local BGE-small dense vectors and persistent BM25 sparse weights, then synchronizes Pinecone and verifies every remote payload. Python SDK `8.1.2` uses the supported Vectors API; model/tokenizer SHA-256 pins are checked before inference. Secrets come from the ignored root `.env` only.

Initial verified contents: **1,249 vectors** across `academic` (1,014), `career` (132), and `student_services` (103). All 99 public verified source files are represented; 12 drafts and student profiles are excluded. No housing vectors exist because no housing data has been collected. The unrelated existing account index is unchanged.

Generated `processed/` files include complete chunks and source URLs, outlines, record lookup mappings, BM25 parameters, file/embedding caches, a verified manifest and an upload report. None are tracked. Maximum observed passage length is 441 tokens, below the 450-token cap. Repeated pushes reuse cached embeddings and unchanged remote payloads; obsolete cleanup is limited to vectors carrying this dataset's ownership marker. Index deletion and incompatible-index recreation are prohibited.

Read-back verification checks all vector IDs, dense/sparse values, metadata and owned record counts, plus realistic searches in each populated domain and an exact local course lookup. These are readiness checks, not a measured recall/MRR benchmark. The included query helper enforces public access, academic year, dataset and BM25-version filters. A production router, authenticated private-data handling and reranker are not implemented by this task. No application API endpoints or LLM choices changed.

The Pinecone Codex plugin `1.1.0` was installed locally from `pinecone-io/pinecone-codex-plugin`. The reproducible ingestion path uses the SDK because the dataset requires external BGE embeddings. Plugin MCP tools are not loaded into this existing chat; any new plugin session must receive the key through its environment. Do not commit it into plugin configuration.

## Agent and verification settings
- Domain agents run in parallel. Max 5 tool calls per agent per request.
- Recovery: retry a failed agent once, then return a partial result marked unverified.
- Formatting retry: once, then safe fallback.
- Per-agent tool allow-list enforced in `tool_registry.py`.

## API endpoints
| Method | Route | Purpose |
|---|---|---|
| POST | `/api/chat_stream` | Send message, stream answer via SSE |
| GET | `/api/session/{session_id}` | Load conversation and task state |
| GET | `/api/student_profile` | Return the synthetic profile for the logged-in user |
| POST | `/api/login` | Issue mock JWT for a synthetic student |
| GET | `/api/health` | Liveness check |

## Security settings
- Rate limit: 20 requests/min per user (tbd).
- Input guard: validation and prompt-injection checks before the supervisor.
- Output guard: PII scan, URL allow-list (usc.edu domains), safe render.
- Each student can only load their own profile (checked in code).

## Large-scale design
Production-scale design (managed databases, real integrations, scaling, secure multi-agent patterns) goes in `docs/large_scale_design/`, not here.
