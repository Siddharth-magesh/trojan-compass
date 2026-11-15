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
| Embeddings | BAAI/bge-small-en-v1.5 (384 dims, L2-normalized); tokenizer used locally, embeddings not yet run | set |
| Vector store | Pinecone (free tier, one index) | set |
| Doc parsing | PyMuPDF | set |
| Auth | Mock JWT for synthetic student users | set |
| Evaluation | Custom USC benchmark, optional RAGAS | tbd |

## Models
| Role | Model | Status |
|---|---|---|
| Supervisor, domain agents | Groq tool-capable model (e.g. Llama 3.3 70B) | tbd |
| Synthesizer | Gemini Flash | tbd |
| Fallback | OpenRouter / NVIDIA NIM model | tbd |

Temperature: 0 for supervisor and agents, 0.3 for synthesizer. Always set `max_tokens`.

## RAG settings
| Setting | Value | Status |
|---|---|---|
| Chunk size / overlap | Target 350 / 50 tokens; hard cap 450 including context, per DATA_GUIDE | set |
| Retrieval | Hybrid (vector + BM25), then rerank | tbd |
| Top-k retrieved | 20 | tbd |
| Top-k after rerank | 5 | tbd |
| Index config | `trojan_compass`, 384 dims, dotproduct, namespace per domain, upsert batch 100; not provisioned by the collection task | set |
| Metadata on every chunk | source, section, collected_date, verified_date | set |
| Retrieval strategy comparison | Basic vs hybrid vs STAIR-inspired hierarchical | tbd |

Current academic year: `2026-2027`. Use an explicit year for historical or future-cycle queries; retain older academic-year files. DATA_GUIDE remains the authority for data and ingestion settings.

Career collection: checked `2026-11-14`, pipeline version `career_collection_1`. Registered categories are `career_guides`, `job_listings`, `research_labs`, `opportunities`, and `career_resources`. Only public verified files enter local retrieval output. The current builder rebuilds all small source files, preserves per-heading sections, and fails on oversized sections. Automatic splitting/overlap, dense+sparse vectors, remote upload, and production query routing remain unimplemented. No endpoints or LLM models changed.

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
