# PROJECT_DETAILS.md

Technical facts for the prototype. Status: **set** = decided, **tbd** = to tune. Update on every change.

## Prototype scope
- Synthetic data only, no live scraping, no real student records.
- Services (Advise USC, Handshake, housing, etc.) are replicated as local JSON data plus tools.
- Structured data lives in `local_database/structured/` as JSON and is queried in code. Only document embeddings go to Pinecone.
- LLM access is through hosted APIs with keys in `.env`.

## Stack
| Layer | Choice | Status |
|---|---|---|
| Frontend | Next.js, React, TypeScript, Tailwind, shadcn/ui, SSE streaming | set |
| Backend | Python, FastAPI, Pydantic | set |
| Orchestration | LangGraph (supervisor, parallel domain agents) | set |
| LLM providers | Gemini, Groq (primary), OpenRouter, NVIDIA NIM as fallbacks | set |
| Embeddings | BGE-small (384 dims, cosine) | tbd |
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
| Chunk size / overlap | 512 / 64 tokens | tbd |
| Retrieval | Hybrid (vector + BM25), then rerank | tbd |
| Top-k retrieved | 20 | tbd |
| Top-k after rerank | 5 | tbd |
| Metadata on every chunk | source, section, collected_date, verified_date | set |
| Retrieval strategy comparison | Basic vs hybrid vs STAIR-inspired hierarchical | tbd |

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