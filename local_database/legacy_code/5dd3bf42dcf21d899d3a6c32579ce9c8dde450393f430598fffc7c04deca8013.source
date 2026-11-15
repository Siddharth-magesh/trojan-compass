"""Score retrieval on evaluation/golden_queries.jsonl: recall@5 and MRR per domain, dense-only vs hybrid.
Queries Pinecone by default; --local scores the same hybrid formula over processed/ without Pinecone."""

import argparse
import json
import os
from collections import defaultdict

from data_common import PROCESSED_DIR, REPO_ROOT
from embedding import embed_passages, embed_query, load_bm25
from push_to_pinecone import INDEX_NAME, load_chunks

TOP_K = 20
RECALL_AT = 5
SKIPPED_TYPES = {"exact", "filter"}  # answered by JSON lookup tools, not vector search


def scale(dense: list[float], sparse: dict, alpha: float) -> tuple[list[float], dict]:
    """Convex hybrid weighting: alpha on dense, 1 - alpha on sparse (dotproduct index)."""
    return [v * alpha for v in dense], {"indices": sparse["indices"], "values": [v * (1 - alpha) for v in sparse["values"]]}


def unique_doc_ids(hits: list[str]) -> list[str]:
    return list(dict.fromkeys(hits))


class LocalSearch:
    def __init__(self) -> None:
        import numpy as np

        self.np = np
        self.chunks = load_chunks()
        dense, _ = embed_passages(self.chunks)
        self.matrix = np.array([dense[c["chunk_hash"]] for c in self.chunks])
        self.bm25 = load_bm25()
        self.sparse = [dict(zip(s["indices"], s["values"]))
                       for s in self.bm25.encode_documents([c["embed_text"] for c in self.chunks])]

    def search(self, query: str, domain: str, alpha: float) -> list[str]:
        q_dense, q_sparse = scale(embed_query(query), self.bm25.encode_queries(query), alpha)
        scores = self.matrix @ self.np.array(q_dense)
        for i, doc in enumerate(self.sparse):
            scores[i] += sum(doc.get(t, 0.0) * w for t, w in zip(q_sparse["indices"], q_sparse["values"]))
        order = [i for i in self.np.argsort(-scores) if self.chunks[i]["domain"] == domain][:TOP_K]
        return [self.chunks[i]["doc_id"] for i in order]


class PineconeSearch:
    def __init__(self) -> None:
        from dotenv import load_dotenv
        from pinecone import Pinecone

        load_dotenv(REPO_ROOT / ".env")
        self.index = Pinecone(api_key=os.environ["PINECONE_API_KEY"]).Index(INDEX_NAME)
        self.bm25 = load_bm25()

    def search(self, query: str, domain: str, alpha: float) -> list[str]:
        q_dense, q_sparse = scale(embed_query(query), self.bm25.encode_queries(query), alpha)
        kwargs = {"sparse_vector": q_sparse} if alpha < 1 and q_sparse["indices"] else {}
        res = self.index.query(vector=q_dense, top_k=TOP_K, namespace=domain, include_metadata=True,
                               filter={"access_level": {"$eq": "public"}}, **kwargs)
        return [m["metadata"]["doc_id"] for m in res["matches"]]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--local", action="store_true", help="score locally instead of querying Pinecone")
    parser.add_argument("--alpha", type=float, default=0.75, help="dense weight for hybrid retrieval")
    args = parser.parse_args()

    lines = (REPO_ROOT / "evaluation" / "golden_queries.jsonl").read_text(encoding="utf-8").splitlines()
    queries = [q for q in map(json.loads, filter(None, lines))
               if q["type"] not in SKIPPED_TYPES and q["expected_doc_ids"]]
    searcher = LocalSearch() if args.local else PineconeSearch()
    modes = {"dense": 1.0, f"hybrid(a={args.alpha})": args.alpha}
    results: dict[tuple[str, str], list[tuple[float, float]]] = defaultdict(list)
    misses = []
    for q in queries:
        for mode, alpha in modes.items():
            ranked = unique_doc_ids(searcher.search(q["query"], q["domain"], alpha))
            expected = set(q["expected_doc_ids"])
            recall = len(expected & set(ranked[:RECALL_AT])) / len(expected)
            rank = next((i + 1 for i, d in enumerate(ranked) if d in expected), None)
            results[(q["domain"], mode)].append((recall, 1 / rank if rank else 0.0))
            if mode != "dense" and recall < 1:
                misses.append(f"  {q['query']!r} -> top: {ranked[:3]}")

    print(f"{len(queries)} semantic queries scored ({'local' if args.local else 'pinecone'}); exact/filter/negative skipped")
    for (domain, mode), rows in sorted(results.items()):
        recall = sum(r for r, _ in rows) / len(rows)
        mrr = sum(m for _, m in rows) / len(rows)
        print(f"  {domain:18} {mode:16} recall@{RECALL_AT}={recall:.3f}  MRR={mrr:.3f}")
    if misses:
        print("hybrid misses:")
        print("\n".join(misses))


if __name__ == "__main__":
    main()
