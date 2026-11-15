<!-- Career retrieval questions and the boundaries of current validation. -->
# Career golden queries

`golden_queries.jsonl` contains 28 questions in DATA_GUIDE's required format. JSONL deliberately has no comment/header row. Document IDs are derived from dataset paths. Negative queries have no expected source IDs.

The data validator checks format and referential integrity. It does not measure retrieval quality. Exact/filter questions should be evaluated through local JSON access; semantic questions require the future retrieval pipeline. Multiple expected IDs mean relevant sources, not necessarily that every listed source must fit in five results. Agree on recall semantics before reporting metrics.
