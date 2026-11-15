"""Hybrid dense+sparse search per namespace, run in parallel, with the exact query encoding used at ingestion.

The alpha scaling mirrors query_store.hybrid_query (dense * alpha, sparse * (1 - alpha)); it is re-implemented only
because that helper accepts no extra filters. The parity check in run_retrieval.py guards against drift.
"""

from concurrent.futures import ThreadPoolExecutor
from typing import Any

from backend.app.data_store import loader  # noqa: F401  (adds local_database/scripts to sys.path)
from backend.app.retrieval.runtime import Runtime
from backend.app.schemas.retrieval import EvidenceItem
from ingestion_models import query_prefix  # noqa: E402


def encode_query(runtime: Runtime, text: str) -> tuple[list[float], Any]:
    """Dense: BGE with the query prefix (passages never had it). Sparse: BM25 query weights from the persisted params."""
    return runtime.encoder.encode([query_prefix + text])[0], runtime.bm25.encode(text, query=True)


def _query(runtime: Runtime, dense: list[float], sparse: Any, namespace: str, flt: dict, alpha: float,
           top_k: int) -> list[dict[str, Any]]:
    args: dict[str, Any] = {"namespace": namespace, "vector": [alpha * v for v in dense], "top_k": top_k,
                            "include_metadata": True, "filter": flt}
    if sparse.indices and alpha < 1:
        args["sparse_vector"] = {"indices": sparse.indices, "values": [(1 - alpha) * v for v in sparse.values]}
    return [{"id": m.id, "score": m.score, "metadata": m.metadata or {}} for m in runtime.index.query(**args).matches]


def to_item(match: dict[str, Any], namespace: str) -> EvidenceItem:
    meta = match["metadata"]
    date = str(meta.get("verified_date_num", ""))
    also_in = meta.get("also_in", [])
    return EvidenceItem(
        id=match["id"], doc_id=str(meta.get("doc_id", match["id"].split("#")[0])), namespace=namespace,
        chunk_type=str(meta.get("chunk_type", "unknown")), record_slug=str(meta.get("record_slug", "")),
        title=str(meta.get("title", "")), section_path=str(meta.get("section_path", "")), text=str(meta.get("text", "")),
        hybrid_score=float(match["score"]), source_name=str(meta.get("source_name", "unknown")),
        source_url=str(meta.get("source_url", "")), also_in=also_in if isinstance(also_in, list) else [],
        authority=str(meta.get("authority", "unknown")), academic_year=str(meta.get("academic_year", "unknown")),
        verified_date=f"{date[:4]}-{date[4:6]}-{date[6:]}" if len(date) == 8 else "unknown",
        access_level=str(meta.get("access_level", "unknown")), chunk_hash=str(meta.get("chunk_hash", "")))


def search(runtime: Runtime, dense: list[float], sparse: Any, namespaces: list[str], filters: dict[str, dict],
           alpha: float, top_k: int) -> list[EvidenceItem]:
    """One Pinecone query per namespace, in parallel. Scores are comparable: same query vector, BM25 and alpha."""
    with ThreadPoolExecutor(max_workers=max(1, len(namespaces))) as pool:
        futures = {ns: pool.submit(_query, runtime, dense, sparse, ns, filters[ns], alpha, top_k) for ns in namespaces}
        return [to_item(m, ns) for ns, f in futures.items() for m in f.result()]
