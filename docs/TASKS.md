# TASKS.md

Status as of 2026-11-15. Ticked items are implemented and verified; notes say what is still open.

- [x] **Build the agent system.** LangGraph flow with input guard, supervisor/planner (clarification with option chips), parallel academic, housing, career and student services agents, aggregator, deterministic verifier, recovery (retry + keyword routing), synthesizer (Markdown with [n] citations and follow-ups), output guard. Multi-domain requests return one structured answer.

- [x] **Build the RAG system.** Ingestion to Pinecone (1,249 vectors), section-A retrieval service (structured lookup first, dense/hybrid per namespace, validation, sufficiency decision, cache, circuit breaker), outline-first strategy compared, eval on 79 golden queries (dense recall@5 0.965, MRR 0.915). *Open:* normalize BM25 before using hybrid; sufficiency threshold abstains on only 20% of out-of-scope questions.

- [~] **Build and collect the data.** Done: courses, sections, opportunities, research labs, career resources, services, international-student and policy guides, 2 synthetic profiles. *Open:* housing listings and the academic calendar are not collected; degree requirements, events and support resources are still drafts.

- [~] **Research and implement security and scalability.** Done: mock JWT auth, per-student isolation (profiles, sessions), tool allow-lists, deterministic input/output guards, retrieved text treated as data, rate limiting. Scalability (C4, 2026-11-15): shared state backend (memory or Redis) for sessions, limits, caches and counters; daily request quota and token budget per student; student- and data-version-scoped caching; model tiering; LLM provider circuit breakers; `/api/ready` and `/api/metrics`. *Open:* write the scaling design in `docs/large_scale_design/`; run Redis-backed multi-worker load test.

- [x] **Integrate the final application.** The React chat UI (`frontend/`) streams from the FastAPI backend: live agent timeline, Markdown answers with citation pills, course cards with schedule grid, job, service and checklist cards, clarification chips, partial-data banner, conversation restore.

- [ ] **Prepare the demo.** Script the six-stage demo, pre-run the demo questions so answers come from cache, compare against a general-purpose AI, and record the video.

- [ ] **Later, if time allows.** Write a guide on building a scalable, secure multi-agent system over confidential data in many formats, and publish it as a GitHub Pages site.
