<!-- Maps the repository: where each part lives, how to run it, and the rules for changing it. -->
# Contributing

Read [AGENTS.md](AGENTS.md) (rules), [PROJECT_DETAILS.md](PROJECT_DETAILS.md) (stack, settings, API contract) and [DATA_GUIDE.md](DATA_GUIDE.md) (data format) first. Update this file whenever a folder or file moves.

## Repository layout
```text
README.md                         project overview, quick start, team
.env.example                      every backend setting (copy to .env)
docs/                             AGENTS, CONTRIBUTING, PROJECT_DETAILS, DATA_GUIDE, TASKS
frontend/                         React + Vite chat app (the student-facing UI)
backend/                          FastAPI + LangGraph multi-agent API
local_database/                   collected USC data, registry, schemas, ingestion scripts
evaluation/                       golden queries and the retrieval evaluation
video/                            3-minute demo video (Remotion), assets manifest, claims and production docs
```

### frontend/
```text
frontend/
  README.md                       how to run and how the UI talks to the backend
  .env.example                    VITE_API_BASE_URL, VITE_USE_MOCK, BACKEND_URL, PORT
  package.json, pnpm-workspace.yaml, vite.config.ts (dev proxy /api -> backend), tsconfig.json
  src/
    lib/api_types.ts              the API contract (requests, SSE events, cards)
    lib/api_client.ts             the only module that calls the backend (fetch + SSE parsing)
    lib/chat_provider.tsx         turns stream events into messages; lib/auth_provider.tsx demo login
    lib/demo_students.ts          the two synthetic demo students
    components/chat/              home view, composer, activity timeline, Markdown answers, citations
    components/cards/             course (schedule grid), housing (compare), job, lab, service, checklist
    components/layout/            shell, sidebar, top bar, right panel, login dialog
    app/                          pages: chat, conversations, checklists, shortcuts
    mock_api/                     in-browser mock backend (VITE_USE_MOCK=true) for offline demos
```

### backend/
```text
backend/
  main.py                         app entry: uvicorn backend.main:app --port 8000
  requirements.txt                pinned dependencies
  scripts/run_query.py            run one question through the full graph (--mode mock|cache|live)
  scripts/run_retrieval.py        retrieval only (--parity checks stored vectors)
  app/
    api/routes.py                 /api endpoints and SSE streaming
    api/presenter.py              internal response -> frontend contract (frontend/src/lib/api_types.ts)
    config/settings.py            all settings from .env
    schemas/                      plan, agent_result, retrieval, response, state, api
    orchestration/                graph, supervisor, dispatcher, aggregator, verifier, synthesizer, fallback, progress
    agents/                       base_agent loop, one file per domain agent, prompts/*.md
    tools/                        typed tools + tool_registry.py (per-agent allow-lists)
    retrieval/                    deterministic retrieval over Pinecone + local JSON (zero LLM calls)
    llm_gateway/                  Groq -> Gemini gateway, call caps, disk cache, mock outputs
    data_store/loader.py          verified + public data loaded once
    security/                     mock JWT auth, rate limit, input and output guards
    session_store/memory_store.py in-memory conversations
    observability/request_log.py  JSON request and retrieval logs
```

### local_database/
```text
local_database/
  README.md                       links to every populated category
  data/<domain>/<category>/       academic, career, student_services (housing not collected yet)
  registry/                       categories.json, sources.json, source_checks.json
  schemas/                        JSON schemas for metadata and each record type
  student_profiles/               2 synthetic demo students (never embedded)
  scripts/                        ingestion: validate, chunk, embed (BGE), BM25, push/verify Pinecone, query helper
  processed/                      generated; gitignored (build with push_to_pinecone.py --verify-only)
```

### video/
```text
video/
  WHAT_WE_NEED_FROM_YOU.md        team to-do before the final compile
  DEMO_NOTES.md                   differences from the brief, open issues, app changes made for the demo
  asset_manifest.json             source of truth for every asset (A01-A18); missing_assets.md is generated from it
  claims.json                     every on-screen claim with evidence; checked by remotion/scripts/check_claims.mjs
  storyboard.md, voiceover_script.md, recording_checklist.md, render_instructions.md
  demo/                           demo_prompts.json (exact prompts), demo_run_sheet.md, security_demo_script.md
  remotion/                       Remotion project
    src/config/                   timeline.ts (scene order and frames), asset_registry.ts, available_assets.json (generated)
    src/compositions/             scene_01_hook.tsx ... scene_11_closing.tsx; root.tsx registers them and FullVideo
    src/components/, animations/, styles/   shared UI pieces, motion helpers, theme tokens
    src/data/                     JSON the scenes read (built by scripts from real data and real runs)
    scripts/                      record_app, sync_assets, build_data, security_capture, measure_cost, check_*, render_segments
    public/                       logo; recordings/ and team assets (gitignored media)
  renders/                        segments/, previews/, final/ (gitignored)
```
Large media (recordings, screenshots, audio, renders) is gitignored; only code, JSON and docs are committed.

## Running locally
```bash
cp .env.example .env                                   # add your keys
python -m venv .venv && .venv/bin/pip install -r backend/requirements.txt
.venv/bin/uvicorn backend.main:app --port 8000          # backend
cd frontend && pnpm install && pnpm dev                 # frontend on http://127.0.0.1:5173
```
`LLM_MODE=mock` runs without LLM keys. Guide search needs `local_database/processed/`; build it once with `cd local_database/scripts && python push_to_pinecone.py --verify-only` (read-only on Pinecone).

## Data rules
Data filenames contain the registered source name and academic-year suffix. Keep historical years separate. JSON records provide exact facts; Markdown files are source-linked guides. Draft and verified data share the category folders; only `verified` + `public` files are used. Do not silently promote drafts or truncate nested details.

`evaluation/golden_queries.jsonl` contains 79 questions; `evaluation/run_retrieval_eval.py` measures retrieval on them and writes `evaluation/retrieval_eval_report.json`.

Former source archives and legacy code are recoverable from Git history at `89fadce`. The Replit-generated frontend workspace was flattened into `frontend/` (2026-11-15); its unused scaffolding (Express placeholder, design sandbox, API/DB stubs) was not carried over.
