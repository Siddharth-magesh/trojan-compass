"""Fusion: dedupe (keeping also_in provenance), heuristic rerank of the candidates, and neighbour context expansion."""

from datetime import date

from backend.app.config.settings import settings
from backend.app.retrieval.runtime import Runtime
from backend.app.schemas.retrieval import EvidenceItem

MAX_EXPANDED_CHARS = 1500


def dedupe(items: list[EvidenceItem]) -> list[EvidenceItem]:
    """Same vector id or identical text (chunk_hash): keep the higher-scoring copy and merge provenance."""
    kept: dict[str, EvidenceItem] = {}
    for item in sorted(items, key=lambda i: -i.hybrid_score):
        key = item.chunk_hash or item.id
        if key in kept:
            winner = kept[key]
            winner.also_in = sorted((set(winner.also_in) | {item.doc_id} | set(item.also_in)) - {winner.doc_id})[:5]
        else:
            kept[key] = item
    return list(kept.values())


def _fresh(verified: str, today: date) -> bool:
    try:
        return (today - date.fromisoformat(verified)).days <= settings.freshness_days
    except ValueError:
        return False


def rerank(items: list[EvidenceItem], year: str, today: date | None = None) -> list[EvidenceItem]:
    """Heuristic: min-max hybrid score plus small priors for official sources, freshness and year match.
    Priors are small so they only reorder near-ties; outline vectors are coarse routing, so they rank lower."""
    today = today or date.today()
    if not items:
        return []
    scores = [i.hybrid_score for i in items]
    low, high = min(scores), max(scores)
    for item in items:
        base = (item.hybrid_score - low) / (high - low) if high > low else 1.0
        bonus = (0.10 if item.authority == "official" else 0.0) + (0.05 if _fresh(item.verified_date, today) else 0.0) \
            + (0.05 if item.academic_year == year else 0.0) - (0.10 if item.chunk_type == "outline" else 0.0)
        item.rerank_score = round(base + bonus, 4)
    return sorted(items, key=lambda i: (-i.rerank_score, -i.hybrid_score, i.id))


def expand(items: list[EvidenceItem], runtime: Runtime) -> list[EvidenceItem]:
    """Append the following passage of the same section from processed/chunks.jsonl; keep metadata text if absent."""
    for item in items:
        if item.chunk_type != "chunk":
            continue
        current = runtime.chunks.get(item.id)
        following = runtime.chunks.get(current["next_id"]) if current and current.get("next_id") else None
        if following and following["section_path"] == current["section_path"] and \
                len(item.text) + len(following["text"]) <= MAX_EXPANDED_CHARS:
            item.text = f"{item.text}\n{following['text']}"
            item.flags.append("expanded")
    return items


def rerank_hosted(items: list[EvidenceItem], query: str, top_n: int) -> list[EvidenceItem]:
    """Optional Pinecone-hosted bge-reranker-v2-m3 (Starter: 500 requests/month, shared by the team).
    Enabled only with RETRIEVAL_RERANKER=pinecone; the caller falls back to the heuristic on any error."""
    from dotenv import dotenv_values
    from pinecone import Pinecone

    from backend.app.config.settings import REPO_ROOT

    if not items:
        return []
    client = Pinecone(api_key=dotenv_values(REPO_ROOT / ".env")["PINECONE_API_KEY"])
    result = client.inference.rerank(model="bge-reranker-v2-m3", query=query, top_n=min(top_n, len(items)),
                                     documents=[{"id": i.id, "text": i.text[:2000]} for i in items],
                                     return_documents=False, parameters={"truncate": "END"})
    ranked = []
    for row in result.data:
        item = items[row.index]
        item.rerank_score = round(float(row.score), 4)
        ranked.append(item)
    return ranked
