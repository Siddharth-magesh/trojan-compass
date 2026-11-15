<!-- Identifies inactive ingestion code preserved from the source branches. -->
# Inactive code archive

Prior local ingestion, embedding, scraping, upload and evaluation helpers are retained as hash-named `.source` files. Original paths, branches and commits are listed under `legacy_code` in `../registry/consolidation_provenance.json`.

These snapshots are not supported tools. Do not execute, import or ingest them. The only current data tool is `../scripts/audit_dataset.py`; it operates offline and produces no vectors or remote writes. Follow root `DATA_GUIDE.md` when implementing the future pipeline.
