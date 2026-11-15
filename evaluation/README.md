<!-- Describes the merged query corpus and its validation boundary. -->
# Golden queries

`golden_queries.jsonl` preserves 36 student-services and 28 career questions and adds 15 academic queries. Existing expected document IDs were remapped when canonical filenames gained their registered source name or academic-year suffix; question text and meaning were retained. JSONL has no comment row.

Document-ID references were checked during data preparation; retrieval quality has not been measured. Exact/filter questions require local JSON access. Semantic questions require the future retrieval pipeline. Negative queries have no expected IDs. Multiple expected IDs denote relevant sources, not a promise that all fit within five results. Recall@5, MRR and dense/hybrid comparisons have not been measured.
