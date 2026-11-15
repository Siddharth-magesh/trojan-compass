# PROJECT_DETAILS.md

Technical facts for the prototype. Status: **set** = decided, **tbd** = to tune. Update on every change.

## Prototype scope
- Synthetic student profiles and manually curated public knowledge (`data_origin: public_copy`); no runtime scraping or real student records.
- Services (Advise USC, Handshake, housing, etc.) are replicated as local JSON data plus tools.
- Structured data lives in `local_database/data/<domain>/<category>/` as JSON and is queried in code. Record search text and document passages are prepared for derived indexing under DATA_GUIDE.
- LLM access is through hosted APIs with keys in `.env`.

## Backend status (implemented in `backend/`)
- Flow: input guard -> supervisor (1 LLM call: plan or clarification) -> parallel academic / housing / career / student_services agents -> aggregate -> deterministic verify -> synthesizer (1 LLM call) -> output guard -> structured response.
- Data: verified + public records loaded once from `local_database/data/` (drafts never loaded). Housing, academic calendar and job listings are empty, so those answers report "not collected yet".
- Retrieval: deterministic section-A pipeline in `backend/app/retrieval/` (zero LLM calls). `RETRIEVAL_BACKEND=auto` (default) uses Pinecone when `processed/` (manifest, BM25, model) and `PINECONE_API_KEY` are present, otherwise a stub whose reason shows in `/api/health`. Build `processed/` locally with `cd local_database/scripts && python push_to_pinecone.py --verify-only` (read-only on Pinecone; also proves vector parity). Measured: hybrid query p50 122 ms / p95 204 ms warm, 0-2 ms for structured hits and cache hits; timeout 2.5 s, one retry with jitter, breaker opens after 3 failures for 30 s; 5-minute TTL cache. Eval: `python evaluation/run_retrieval_eval.py` (316 Pinecone queries). Search scope is set in code (`knowledge_tool.SEARCH_SCOPE`): student_services and career search each other's namespaces because international-student work rules are indexed under career guides. Live check 2026-11-14: "F-1 on-campus work hours" answered "up to 20 hours per week" cited to ois.usc.edu; "parking permit price" (not in our data) answered "couldn't find it" with no citations and status partial.
- Profiles: 2 synthetic students (`synthetic_student_001`, `_002`) for mock login.
- Try it: `python -m backend.scripts.run_query --mode mock "..."` or `uvicorn backend.main:app`. Default `LLM_MODE=cache` replays from `backend/.llm_cache/`.

## Key files
| Path | Role |
|---|---|
| `frontend/src/lib/api_types.ts`, `api_client.ts` | the API contract and the only module that calls the backend |
| `frontend/src/components/cards/`, `components/chat/` | card renderers (course, housing, job, service, checklist) and chat UI |
| `backend/main.py`, `backend/app/api/routes.py` | FastAPI app and `/api` endpoints (SSE chat) |
| `backend/app/api/presenter.py` | maps internal responses to the frontend contract |
| `backend/app/orchestration/graph.py` | LangGraph flow; `supervisor`, `dispatcher`, `aggregator`, `verifier`, `synthesizer`, `fallback` alongside |
| `backend/app/agents/base_agent.py` | agent tool loop; `*_agent.py` keyword routing; `prompts/*.md` |
| `backend/app/tools/tool_registry.py` | typed tools, per-agent allow-lists, ToolContext (identity from JWT) |
| `backend/app/tools/knowledge_tool.py` | agent-facing retrieval tool (domain = calling agent) |
| `backend/app/retrieval/pipeline.py` | retrieval: parse -> filters -> route -> hybrid/structured -> fusion -> validate -> evidence |
| `backend/app/retrieval/retrieval_client.py` | Retriever protocol, stub, `stub/pinecone/auto` switch, health status |
| `backend/app/retrieval/runtime.py` | loads `processed/` (manifest, BM25, BGE encoder, chunks) once; readiness |
| `backend/app/data_store/loader.py` | verified+public JSON/MD loaded once (reuses `source_data.load_source`) |
| `backend/app/schemas/` | `plan`, `agent_result` (Evidence), `retrieval` (EvidencePackage), `response` (frontend contract) |
| `backend/app/llm_gateway/gateway.py` | Groq -> Gemini, budget caps, mock/cache modes |
| `backend/app/security/`, `observability/request_log.py` | guards, JWT, rate limit; JSON request and retrieval logs |
| `backend/scripts/run_query.py`, `run_retrieval.py` | CLI: full graph / retrieval only (`--parity`) |
| `local_database/scripts/push_to_pinecone.py` | ingestion (`--dry-run`, `--verify-only`); `build_chunks.py`, `embedding_runtime.py`, `sparse_encoder.py`, `query_store.py` |
| `evaluation/golden_queries.jsonl` | 79 queries (recall@5 / MRR / abstention) |

## Stack
| Layer | Choice | Status |
|---|---|---|
| Frontend | React 19 + Vite 7, TypeScript, Tailwind v4, Radix/shadcn primitives, wouter, react-markdown, SSE streaming (`frontend/`, built with Replit then integrated) | set |
| Backend | Python, FastAPI, Pydantic | set |
| Orchestration | LangGraph (supervisor, parallel domain agents) | set |
| LLM providers | Groq `openai/gpt-oss-120b` (primary), Gemini `gemini-3.8-flash` (fallback); OpenRouter / NVIDIA NIM not implemented | set |
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
| Retrieval | Exact ids/numeric comparisons from local JSON first; otherwise dense (alpha 1.0) per namespace in parallel, score order, top 5; hybrid BM25, heuristic and hosted rerank remain switchable (`RETRIEVAL_ALPHA`, `RETRIEVAL_RERANKER`) | set |
| Top-k retrieved | 20 | set |
| Top-k after rerank | 5 (knowledge tool uses 3) | set |
| Index config | `trojan-compass`, 384 dims, dotproduct, AWS us-east-1 serverless, namespace per domain, batch 100; deletion protection enabled | set |
| Metadata on every chunk | Full flat metadata contract in DATA_GUIDE; explicit allow-list, no nulls, under 40 KB | set |
| Retrieval strategy comparison | 2026-11-14 eval on 69 golden positives: dense recall@5 0.965 / MRR 0.915; hybrid 0.938 / 0.773 (unnormalized BM25 dominates); outline-first 0.722 / 0.697; hosted rerank +0.014 MRR on 34 semantic queries. Report: `evaluation/retrieval_eval_report.json` | set |
| Sufficiency threshold | cosine 0.62: answers 97% of positives, abstains on 20% of the 10 negatives (similarity is a weak out-of-scope signal) | set |

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
- Domain agents run in parallel. Max 3 tool calls per agent per request, one LLM round per agent; agents whose data is empty (housing) skip the LLM.
- Recovery: retry a failed agent once, then route it with keywords (no LLM) and mark it partial.
- Planner failure: keyword routing; nothing routable -> safe fallback.
- Synthesizer: writes short Markdown (### per domain, bullets) citing numbered sources as [n]; 1,800 max tokens; 1 formatting retry, then a code-built Markdown answer. Numbers not in the facts are rejected, invalid markers removed, and uncited bullets get the source of the best-matching verified fact. `answered=false` (nothing answered and no citations) drops unrelated citations and marks the answer partial. It also returns up to 3 follow-ups.
- Per-agent tool allow-list enforced in `backend/app/tools/tool_registry.py`. Cards and citations are built in code, never by the LLM.
- Expected LLM calls: clarification 1; single domain 3; four domains 6 (cap 8).

## API endpoints
| Method | Route | Purpose |
|---|---|---|
| POST | `/api/chat_stream` | Send message, stream answer via SSE |
| GET | `/api/session/{session_id}` | Load conversation and task state |
| GET | `/api/student_profile` | Return the synthetic profile for the logged-in user |
| POST | `/api/login` | Issue mock JWT for a synthetic student |
| GET | `/api/health` | Liveness check (adds state backend, data version) |
| GET | `/api/ready` | Readiness for load balancers: data loaded and state backend reachable (503 otherwise) |
| GET | `/api/metrics` | Aggregate counters, cache hit rates, latency p50/p95, breaker states, limits (Bearer `METRICS_TOKEN` when set) |

Run: `uvicorn backend.main:app --port 8000` from the repo root. Auth: `POST /api/login {"student_id": "synthetic_student_001"}` returns a bearer token; all other routes except health need `Authorization: Bearer <token>`.
The API contract is the frontend's `frontend/src/lib/api_types.ts`; `backend/app/api/presenter.py` is the only place that maps internal results to it.
- `POST /api/login` returns `{access_token, student}` (student_profile: display_name, program, level, international, interests, budget, job_interests).
- `POST /api/chat_stream` body `{"message": "...", "session_id": optional}` streams SSE: `session` -> `status` (`{node, state: started|done|failed, label, elapsed_ms}` per step: input_guard, supervisor, <domain>_agent, verifier, synthesizer, output_guard) -> either `answer_delta` chunks + `final` (`{answer (Markdown with [n] citations), cards, citations [{id, source_name, title, url, verified_date, authority}], freshness_notes, partial_status {status, missing[]}, follow_ups}`), or `clarification` (`{question, options}`), or `error` (`{code: guard_blocked|upstream_failed, message}`). 429 for the rate limit.
- `GET /api/session/{id}` returns `{session_id, messages: [{role, content, final?}]}` (owner only).
- Frontend dev: `uvicorn backend.main:app --port 8000`, then `cd frontend && pnpm install && pnpm dev` (http://127.0.0.1:5173; Vite proxies `/api` to `BACKEND_URL`, default `http://localhost:8000`). `VITE_USE_MOCK=true` switches back to the in-browser mock.

## Security settings
- Rate limit: 20 chat requests/min per student plus a daily quota of 300 requests (fixed windows on the shared state backend); 429 with a clear message.
- Input guard (deterministic): length, control characters, repeated characters, prompt-injection patterns.
- Output guard (deterministic): SSN/card-number and non-usc.edu email redaction; URLs allowed only for usc.edu or URLs present in verified data.
- Student identity comes only from the JWT; tools never accept a student_id argument. Sessions and profiles are owner-only.

## Scalability (C4 of the architecture)
| Control | Implementation | Default |
|---|---|---|
| Shared state | `shared_state/kv_store.py`: one key-value contract, in-process memory or Redis (`STATE_BACKEND`); sessions, rate limits, quotas, retrieval cache and metrics counters all use it, so the API is stateless and can run `uvicorn backend.main:app --workers N` behind a load balancer. Redis fails open (reads miss, writes skipped, logged); an unreachable Redis at startup falls back to memory and `/api/health` says why | memory |
| Rate limits & quotas | per-minute limit and daily request quota per student (`security/rate_limit.py`); daily live-token budget per student checked before every live LLM call (`RequestBudget.student_id`), cache hits free; over budget, agents fall back to keyword routing and the answer is marked partial | 20/min, 300/day, 300k tokens/day |
| Caching | LLM cache backend `disk` (replayable) or `shared` (TTL); `LLM_CACHE_SCOPE=student` adds the student id and the data version (`DataStore.version`, a hash of every loaded file) to the key, so personalized answers are never shared and a data update invalidates them. Retrieval cache keys always include the data version | disk, shared scope (keys unchanged) |
| Index partitioning | namespace per domain, academic-year filter (unchanged) | on |
| Cost control | per-request and per-process call caps, daily token budget, model tiering (`PLANNER_MODEL`, `AGENT_MODEL`; the synthesizer always uses `PRIMARY_MODEL`), circuit breaker per LLM provider (opens after 3 failed calls for 60 s, then the next provider is used immediately) | tiering off |
| Observability | `/api/ready`, `/api/metrics` (counters shared through the state backend, latency per worker) | on |

Verified 2026-11-15 through the real app (TestClient): cached F-1 question still replays with 0 live calls (keys unchanged); 429 on the 4th request/min and the 3rd request/day with test limits; over-budget student gets a partial answer while another student is unaffected; unreachable provider opens the breaker and later requests skip it in about 0.3 s; Redis requested but down falls back to memory; Redis path (fakeredis) stores sessions and counters with prefixed keys and TTLs. Not yet load-tested with a real Redis and several workers.

## Large-scale design
Production-scale design (managed databases, real integrations, scaling, secure multi-agent patterns) goes in `docs/large_scale_design/`, not here.
