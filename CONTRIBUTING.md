<!-- Maps the current repository and the collected source data. -->
# Contributing

Start with [local_database/data/](local_database/data/) for the collected knowledge and [DATA_GUIDE.md](DATA_GUIDE.md) for its format. [local_database/README.md](local_database/README.md) links directly to every populated category.

```text
local_database/
  README.md
  data/
    academic/
      courses/
      course_sections/
      degree_requirements/
      academic_calendar/          # reserved, uncollected
      bulletin/                   # reserved, uncollected
      registration_policies/      # reserved, uncollected
    housing/
      listings/                   # reserved, uncollected
      housing_guides/             # reserved, uncollected
    career/
      career_guides/
      research_labs/
      opportunities/
      career_resources/
      job_listings/               # reserved, uncollected
    student_services/
      service_directory/
      international_students/
      student_policies/
      event_listings/
      support_resources/
  registry/
    categories.json
    sources.json
    source_checks.json
  schemas/                        # metadata, record and source-check schemas
  student_profiles/               # 2 synthetic demo profiles (synthetic_student_001/002); never embedded
  scripts/
    ingestion_models.py           # settings and Pydantic input/output boundaries
    source_data.py                # canonical data validation
    build_chunks.py               # passages, outlines and full-record lookup mappings
    embedding_runtime.py          # pinned BGE ONNX model, tokenizer and cache
    sparse_encoder.py             # persistent deterministic BM25 encoder
    pinecone_store.py             # create, synchronize and verify owned vectors
    push_to_pinecone.py            # end-to-end dry-run / upload / verification command
    query_store.py                 # public hybrid search and exact JSON lookup
    requirements.txt              # pinned ingestion dependencies
  processed/                      # generated artifacts and model caches; gitignored
```

```text
backend/                          # FastAPI + LangGraph multi-agent API (run from repo root)
  main.py                         # app entry: uvicorn backend.main:app
  requirements.txt                # pinned backend dependencies
  scripts/run_query.py            # run one query through the graph: python -m backend.scripts.run_query --mode mock "..."
  scripts/run_retrieval.py        # retrieval only: python -m backend.scripts.run_retrieval "..." --domain career (--parity)
  app/
    config/settings.py            # env settings: LLM_MODE, models, caps, JWT, data paths
    schemas/                      # plan, agent_result, response (frontend contract), state, api
    llm_gateway/                  # gateway (Groq -> Gemini), budget caps, disk cache, mock outputs
    data_store/loader.py          # loads verified+public data once, reusing local_database/scripts/source_data.py
    tools/                        # typed tools + tool_registry.py (per-agent allow-lists)
    retrieval/                    # deterministic retrieval: pipeline, runtime, query_parser, filters, router,
                                  #   structured_lookup, hybrid_engine, fusion, validation, evidence, reliability, cache, retrieval_client
    agents/                       # base_agent loop, one file per domain agent, prompts/*.md
    orchestration/                # graph, supervisor, dispatcher, aggregator, verifier, synthesizer, fallback
    security/                     # auth (mock JWT), rate_limit, input_guard, output_guard
    session_store/memory_store.py # in-memory sessions with trimmed history
    observability/request_log.py  # one JSON log line per request
    api/routes.py                 # /api endpoints and SSE streaming
```

Data filenames contain the registered source name and academic-year suffix. Keep historical years separate. Complete JSON records provide exact facts; Markdown contains source-linked guides. Draft and verified data share the category folders, with indexing eligibility determined by their metadata. Do not silently promote drafts or truncate nested details.

`evaluation/golden_queries.jsonl` contains 79 academic, career and student-service questions; `evaluation/README.md` describes their use. `evaluation/run_retrieval_eval.py` measures retrieval on them and writes `evaluation/retrieval_eval_report.json`. Root `AGENTS.md` contains contributor rules, and `PROJECT_DETAILS.md` contains intended stack/configuration values. The backend is implemented under `backend/`; the frontend remains a planned component. The ingestion pipeline is implemented under `local_database/scripts/` and follows root DATA_GUIDE.

The former source archives, inactive code, reports and generated audit manifests are recoverable from Git history at `89fadce`. They are intentionally absent from the current data tree. The current uploader is a new implementation; it does not restore the earlier legacy code. Its generated `processed/` output remains ignored.
