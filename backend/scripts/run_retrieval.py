"""Retrieval-only CLI: `python -m backend.scripts.run_retrieval "query" --domain career [--strategy hybrid] [--alpha 0.75]`.
`--parity` re-embeds one stored chunk and compares it with the vector in Pinecone (one fetch call)."""

import argparse
import json
import os
import sys


def parity_check() -> None:
    import numpy as np

    from backend.app.retrieval.runtime import PROCESSED, get_runtime

    rt = get_runtime()
    with (PROCESSED / "chunks.jsonl").open(encoding="utf-8") as fh:
        chunk = next(c for c in map(json.loads, fh) if c["namespace"] == "student_services")
    from pinecone_store import response_dict  # ingestion helper that normalizes SDK fetch responses

    remote = response_dict(rt.index.fetch(ids=[chunk["id"]], namespace=chunk["namespace"]))["vectors"][chunk["id"]]
    dense = rt.encoder.encode([chunk["embedded_text"]])[0]  # passages are embedded without the query prefix
    sparse = rt.bm25.encode(chunk["embedded_text"])
    ok_dense = np.allclose(dense, remote["values"], rtol=1e-5, atol=1e-6)
    ok_sparse = sparse.indices == remote["sparse_values"]["indices"] and np.allclose(
        sparse.values, remote["sparse_values"]["values"], rtol=1e-5, atol=1e-6)
    print(json.dumps({"parity_chunk": chunk["id"], "dense_match": bool(ok_dense), "sparse_match": bool(ok_sparse),
                      "max_dense_diff": float(np.max(np.abs(np.array(dense) - np.array(remote["values"])))),
                      "bm25_hash_matches_manifest": rt.bm25.fingerprint() == rt.manifest["bm25_hash"]}))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("query", nargs="?")
    parser.add_argument("--domain", action="append", choices=["academic", "career", "student_services", "housing"])
    parser.add_argument("--strategy", choices=["hybrid", "hybrid_outline"])
    parser.add_argument("--alpha", type=float)
    parser.add_argument("--year")
    parser.add_argument("--parity", action="store_true")
    args = parser.parse_args()
    os.environ.setdefault("RETRIEVAL_BACKEND", "auto")
    if args.parity:
        parity_check()
        return
    if not args.query:
        parser.error("query is required unless --parity is used")

    from backend.app.retrieval.retrieval_client import get_retriever
    from backend.app.schemas.retrieval import AccessScope, RetrievalRequest

    retriever = get_retriever()
    package = retriever.retrieve(RetrievalRequest(query=args.query, domains=args.domain or ["student_services"],
                                                  scope=AccessScope(student_id="cli"), strategy=args.strategy,
                                                  alpha=args.alpha, academic_year=args.year))
    print(json.dumps({"backend": package.backend, "route": package.route, "alpha": package.alpha,
                      "year": package.academic_year, "sufficient": package.sufficient, "reason": package.reason,
                      "timings_ms": package.timings_ms, "flags": package.flags[:5],
                      "items": [{"id": i.id, "rerank": i.rerank_score, "hybrid": round(i.hybrid_score, 4),
                                 "title": i.title[:60], "section": i.section_path[:50], "flags": i.flags,
                                 "text": i.text[:140].replace("\n", " ")} for i in package.items]},
                     indent=1, ensure_ascii=False))
    sys.stdout.flush()


if __name__ == "__main__":
    main()
