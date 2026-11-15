"""Hybrid dense+sparse search per namespace (parallel), plus a STAIR-inspired outline-first strategy.

Query encoding is the ingestion pipeline's own (BGE with query prefix, persisted BM25). The alpha scaling mirrors
query_store.hybrid_query (dense * alpha, sparse * (1 - alpha)); it is re-implemented only because that helper accepts
no extra filters. `run_retrieval.py --parity` guards the stored-vector side against drift.
"""

from concurrent.futures import ThreadPoolExecutor
from typing import Any, Callable

import numpy as np

from backend.app.data_store import loader  # noqa: F401  (adds local_database/scripts to sys.path)
from backend.app.retrieval import reliability
from backend.app.retrieval.runtime import Runtime
from backend.app.schemas.retrieval import EvidenceItem
from ingestion_models import query_prefix  # noqa: E402

OUTLINE_DOCS = 3


def encode_query(runtime: Runtime, text: str) -> tuple[list[float], Any]:
    """Dense: BGE with the query prefix (passages never had it). Sparse: BM25 query weights from the persisted params."""
    return runtime.encoder.encode([query_prefix + text])[0], runtime.bm25.encode(text, query=True)


def _query(runtime: Runtime, dense: list[float], sparse: Any, namespace: str, flt: dict, alpha: float,
           top_k: int) -> list[dict[str, Any]]:
    args: dict[str, Any] = {"namespace": namespace, "vector": [alpha * v for v in dense], "top_k": top_k,
                            "include_metadata": True, "include_values": True, "filter": flt}
    if sparse.indices and alpha < 1:
        args["sparse_vector"] = {"indices": sparse.indices, "values": [(1 - alpha) * v for v in sparse.values]}
    matches = reliability.call(lambda: runtime.index.query(**args).matches)
    query_vec = np.asarray(dense)
    # Stored dense vectors are L2-normalized, so the dot product is the cosine: an alpha-independent confidence.
    return [{"id": m.id, "score": m.score, "metadata": m.metadata or {},
             "dense": float(np.dot(query_vec, np.asarray(m.values))) if m.values else 0.0} for m in matches]


def to_item(match: dict[str, Any], namespace: str) -> EvidenceItem:
    meta = match["metadata"]
    date = str(meta.get("verified_date_num", ""))
    also_in = meta.get("also_in", [])
    return EvidenceItem(
        id=match["id"], doc_id=str(meta.get("doc_id", match["id"].split("#")[0])), namespace=namespace,
        chunk_type=str(meta.get("chunk_type", "unknown")), record_slug=str(meta.get("record_slug", "")),
        title=str(meta.get("title", "")), section_path=str(meta.get("section_path", "")), text=str(meta.get("text", "")),
        hybrid_score=float(match["score"]), dense_score=round(match["dense"], 4),
        source_name=str(meta.get("source_name", "unknown")), source_url=str(meta.get("source_url", "")),
        also_in=also_in if isinstance(also_in, list) else [], authority=str(meta.get("authority", "unknown")),
        academic_year=str(meta.get("academic_year", "unknown")),
        verified_date=f"{date[:4]}-{date[4:6]}-{date[6:]}" if len(date) == 8 else "unknown",
        access_level=str(meta.get("access_level", "unknown")), chunk_hash=str(meta.get("chunk_hash", "")))


FilterFor = Callable[[str, list[str] | None, list[str] | None], dict]  # (namespace, chunk_types, doc_ids) -> filter


def _hybrid_ns(runtime: Runtime, dense: list[float], sparse: Any, ns: str, filter_for: FilterFor, alpha: float,
               top_k: int) -> list[EvidenceItem]:
    return [to_item(m, ns) for m in _query(runtime, dense, sparse, ns, filter_for(ns, None, None), alpha, top_k)]


def _outline_ns(runtime: Runtime, dense: list[float], sparse: Any, ns: str, filter_for: FilterFor, alpha: float,
                top_k: int) -> list[EvidenceItem]:
    """Outline vectors (title + summary + headings) pick the top documents, then chunks are searched only inside them.
    Record-only namespaces have no outlines, so they fall back to plain hybrid. Inspired by STAIR; not a reproduction."""
    outlines = _query(runtime, dense, sparse, ns, filter_for(ns, ["outline"], None), alpha, OUTLINE_DOCS * 2)
    doc_ids = list(dict.fromkeys(str(m["metadata"].get("doc_id", "")) for m in outlines))[:OUTLINE_DOCS]
    if not doc_ids:
        return _hybrid_ns(runtime, dense, sparse, ns, filter_for, alpha, top_k)
    return [to_item(m, ns) for m in _query(runtime, dense, sparse, ns, filter_for(ns, None, doc_ids), alpha, top_k)]


def search(runtime: Runtime, dense: list[float], sparse: Any, namespaces: list[str], filter_for: FilterFor,
           alpha: float, top_k: int, strategy: str = "hybrid") -> list[EvidenceItem]:
    """One (hybrid) or two (hybrid_outline) Pinecone queries per namespace, namespaces in parallel.
    Scores across namespaces are comparable: same query vector, same BM25 params, same alpha."""
    run = _outline_ns if strategy == "hybrid_outline" else _hybrid_ns
    with ThreadPoolExecutor(max_workers=max(1, len(namespaces))) as pool:
        futures = [pool.submit(run, runtime, dense, sparse, ns, filter_for, alpha, top_k) for ns in namespaces]
        return [item for f in futures for item in f.result()]
