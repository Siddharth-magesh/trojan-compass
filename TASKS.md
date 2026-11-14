# TASKS.md

- [ ] **Build the agent system.** Implement the LangGraph flow: supervisor and planner, clarification step, task dispatcher, and the academic, housing, career and student services agents running in parallel. Add the result normalizer, aggregator, verification step, recovery path and synthesizer so a multi-domain request returns one structured answer.

- [ ] **Build the RAG system.** Ingest USC documents, chunk and embed them, and store them in Pinecone. Implement hybrid retrieval with reranking and source and freshness metadata. Then build a STAIR-inspired hierarchical retriever on one or two long documents and compare the three approaches.

- [ ] **Build and collect the data.** Create the synthetic student profiles and the local JSON datasets for courses, sections, prerequisites, housing, jobs, services and deadlines. Collect public USC documents by hand for the knowledge base. Write the script that pushes embeddings to Pinecone.

- [ ] **Research and implement security and scalability.** Add JWT auth, per-student data isolation, tool allow-lists, input and output guards, and prompt-injection defenses for retrieved documents. Research how the same design would scale and write it up in `docs/large_scale_design/`.

- [ ] **Integrate the final application.** Connect the Next.js chat UI to the FastAPI backend with streaming, and show course cards, housing comparisons, job lists and the onboarding checklist. Run the full international student journey end to end.

- [ ] **Prepare the demo.** Define our unique selling points, script the six-stage demo, run the same queries against a general-purpose AI for comparison, and record the demo video.

- [ ] **Later, if time allows.** Write a guide on building a scalable, secure multi-agent system over confidential data in many formats, and publish it as a GitHub Pages site.