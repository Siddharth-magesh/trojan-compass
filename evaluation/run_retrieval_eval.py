"""Retrieval evaluation on evaluation/golden_queries.jsonl: recall@5 and MRR (doc-level) for dense-only, hybrid and
hybrid_outline; raw vs heuristic rerank; negatives scored on abstention; exact/filter queries via the structured path;
and calibration of the sufficiency threshold on dense similarity. Run from the repo root:
    python evaluation/run_retrieval_eval.py [--hosted-rerank]
Pinecone budget: 4 queries per golden query (dense 1 + hybrid 1 + outline 2) = 316 for 79 queries, plus at most
34 hosted rerank requests with --hosted-rerank (semantic queries only).
"""

import argparse
import json
import statistics
import sys
import time
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.app.data_store.loader import get_store  # noqa: E402
from backend.app.retrieval import fusion, hybrid_engine, query_parser, router, structured_lookup, validation  # noqa: E402
from backend.app.retrieval.filters import build_filter  # noqa: E402
from backend.app.retrieval.runtime import get_runtime, readiness  # noqa: E402
from backend.app.schemas.retrieval import AccessScope, RetrievalRequest  # noqa: E402

GOLDEN = Path(__file__).resolve().parent / "golden_queries.jsonl"
REPORT = Path(__file__).resolve().parent / "retrieval_eval_report.json"
TOP_N = 5


def doc_ranking(items: list) -> list[str]:
    return list(dict.fromkeys(i.doc_id for i in items))


def score(expected: list[str], ranked_docs: list[str]) -> tuple[float, float]:
    """(recall@5 over expected docs, reciprocal rank of the first relevant doc)."""
    top = ranked_docs[:TOP_N]
    recall = len(set(expected) & set(top)) / len(expected)
    rr = next((1 / (k + 1) for k, d in enumerate(top) if d in expected), 0.0)
    return recall, rr


def finish(items: list, year: str, ordering: str) -> list:
    """Mirror the pipeline after search: dedupe -> order -> top 5 chunks -> validation."""
    items = fusion.dedupe([i.model_copy(deep=True) for i in items])
    ordered = sorted(items, key=lambda i: -i.hybrid_score) if ordering == "raw" else fusion.rerank(items, year)
    kept, _, _ = validation.validate(ordered[:TOP_N], year, date.today())
    return kept


def calibrate(pos: list[float], neg: list[float]) -> dict:
    """Threshold on max dense similarity that maximizes balanced accuracy (answer positives, abstain on negatives)."""
    best = {"threshold": None, "balanced_accuracy": 0.0}
    for t in sorted(set(pos + neg)):
        tpr = sum(s >= t for s in pos) / len(pos)
        tnr = sum(s < t for s in neg) / len(neg)
        if (tpr + tnr) / 2 > best["balanced_accuracy"]:
            best = {"threshold": round(t, 4), "balanced_accuracy": round((tpr + tnr) / 2, 3),
                    "answer_rate_on_positives": round(tpr, 3), "abstain_rate_on_negatives": round(tnr, 3)}
    return best


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--hosted-rerank", action="store_true", help="also test Pinecone bge-reranker-v2-m3 (<=34 requests)")
    args = parser.parse_args()
    ready, reason = readiness()
    if not ready:
        raise SystemExit(f"retrieval not ready: {reason}")
    rt, store = get_runtime(), get_store()
    rows = [json.loads(line) for line in GOLDEN.read_text(encoding="utf-8").splitlines() if line.strip()]
    metrics: dict[str, dict[str, list[float]]] = {}
    pos_sim, neg_sim, latencies, structured, pinecone_calls, rerank_calls = [], [], [], [], 0, 0
    per_query = []

    def add(config: str, recall: float, rr: float) -> None:
        bucket = metrics.setdefault(config, {"recall": [], "rr": []})
        bucket["recall"].append(recall)
        bucket["rr"].append(rr)

    for row in rows:
        request = RetrievalRequest(query=row["query"], domains=[row["domain"]], scope=AccessScope(student_id="eval"))
        parsed = query_parser.parse(row["query"])
        year = parsed.academic_year
        route = router.choose(parsed, request, store)
        expected = row["expected_doc_ids"]
        if row["type"] in ("exact", "filter") and route.kind == "structured":
            hits = doc_ranking(structured_lookup.lookup(parsed, route, request.domains, store, rt, year))
            structured.append({"query": row["query"], "hit": bool(set(hits) & set(expected)), "docs": hits[:3]})

        def filter_for(ns, chunk_types, doc_ids, _r=request, _y=year):
            return build_filter(_r, _r.scope, _y, rt.manifest["bm25_hash"], chunk_types, doc_ids)

        dense, sparse = hybrid_engine.encode_query(rt, parsed.text)
        start = time.perf_counter()
        hybrid = hybrid_engine.search(rt, dense, sparse, [row["domain"]], filter_for, route.alpha, 20)
        latencies.append((time.perf_counter() - start) * 1000)
        dense_only = hybrid_engine.search(rt, dense, sparse, [row["domain"]], filter_for, 1.0, 20)
        outline = hybrid_engine.search(rt, dense, sparse, [row["domain"]], filter_for, route.alpha, 20, "hybrid_outline")
        pinecone_calls += 4
        production = finish(hybrid, year, "heuristic")
        best_sim = max((i.dense_score for i in production), default=0.0)
        result = {"query": row["query"], "type": row["type"], "domain": row["domain"], "best_similarity": round(best_sim, 4)}
        if not expected:
            neg_sim.append(best_sim)
        else:
            pos_sim.append(best_sim)
            for config, items in [("dense_only", finish(dense_only, year, "raw")), ("hybrid_raw", finish(hybrid, year, "raw")),
                                  ("hybrid_heuristic", production), ("hybrid_outline", finish(outline, year, "heuristic"))]:
                recall, rr = score(expected, doc_ranking(items))
                add(config, recall, rr)
                result[config] = round(rr, 3)
            if args.hosted_rerank and row["type"] == "semantic":
                ranked = fusion.rerank_hosted(fusion.dedupe([i.model_copy(deep=True) for i in hybrid]), parsed.text, TOP_N)
                rerank_calls += 1
                recall, rr = score(expected, doc_ranking(ranked))
                add("hybrid_hosted_rerank(semantic)", recall, rr)
                add("hybrid_heuristic(semantic)", *score(expected, doc_ranking(production)))
        per_query.append(result)

    summary = {config: {"n": len(v["recall"]), "recall@5": round(statistics.mean(v["recall"]), 3),
                        "mrr": round(statistics.mean(v["rr"]), 3)} for config, v in metrics.items()}
    latencies.sort()
    report = {
        "date": date.today().isoformat(), "queries": len(rows), "positives": len(pos_sim), "negatives": len(neg_sim),
        "pinecone_queries": pinecone_calls, "hosted_rerank_requests": rerank_calls, "metrics": summary,
        "structured_path": {"routed": len(structured), "hit": sum(s["hit"] for s in structured), "cases": structured},
        "calibration_dense_similarity": calibrate(pos_sim, neg_sim),
        "similarity_stats": {"positives_median": round(statistics.median(pos_sim), 4),
                             "negatives_median": round(statistics.median(neg_sim), 4), "negatives": sorted(round(s, 4) for s in neg_sim)},
        "hybrid_query_latency_ms": {"p50": round(latencies[len(latencies) // 2]), "p95": round(latencies[int(len(latencies) * 0.95) - 1])},
        "per_query": per_query,
    }
    REPORT.write_text(json.dumps(report, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({k: report[k] for k in report if k != "per_query" and k != "structured_path"}, indent=1))
    print(json.dumps({"structured_path": {k: report["structured_path"][k] for k in ("routed", "hit")}}))


if __name__ == "__main__":
    main()
