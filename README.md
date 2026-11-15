# Trojan Compass

**One AI assistant for the entire USC student experience.**

## The problem
Students juggle many disconnected platforms (Advise USC, Web Registration, Brightspace, Handshake, housing sites, international student services) to answer simple questions. General-purpose AI can't fix this because it lacks current, USC-specific information and knows nothing about the individual student. International students feel this most.

## The idea
A single chat interface that understands what a student needs, pulls the right USC-specific information, compares options, and returns a personalized, source-cited answer. It informs and recommends, but never performs official actions like registration.

## How it works
- **Supervisor agent** plans the request and sends it to specialized agents: academic, housing, career, and student services.
- **Two kinds of retrieval:** structured data tools for exact work (prerequisites, schedule conflicts, rent comparison, job eligibility) and RAG over USC documents for policies and procedures.
- **Verification before delivery:** every answer is checked for data, maths, sources, and freshness, then passed through security guards.
- **Source-grounded output:** answers include citations, freshness dates, and a clear flag for anything partial or unverified.

## Prototype scope
Synthetic student profiles, curated local datasets, and hand-collected public USC documents. Services are replicated, not integrated, and there is no live scraping.

## Demo
An international student arrives at USC and, in one conversation, learns the key services, finds housing under $1,200, picks two courses, finds a part-time job, and gets a pre-semester checklist. The same queries are then run against a general-purpose AI to compare accuracy, freshness, and personalization.

## What makes it different
USC-specific knowledge, cross-service answers in one place, personalized context, multi-agent collaboration, source-grounded responses, and security built into the architecture.
## Local knowledge dataset

All collected branch data is consolidated under [local_database](local_database/README.md). See the [consolidation report](local_database/consolidation_report.md) for complete preservation checks, eligible input files and draft data issues. The current tool prepares source data offline; Pinecone ingestion is future work under [DATA_GUIDE](DATA_GUIDE.md).
