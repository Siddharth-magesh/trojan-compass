"""Sufficiency decision for an evidence package: the agent abstains, asks or reports missing data when insufficient."""

from backend.app.config.settings import settings
from backend.app.schemas.retrieval import EvidenceItem

BLOCKING_FLAGS = {"stale", "wrong_year", "instruction_like"}


def decide(items: list[EvidenceItem], empty_namespaces: list[str], year: str) -> tuple[bool, str]:
    usable = [i for i in items if not set(i.flags) & BLOCKING_FLAGS]
    if not items:
        if empty_namespaces:
            return False, f"no data has been collected for: {', '.join(empty_namespaces)}"
        return False, f"no matching verified {year} sources"
    if not usable:
        return False, "only stale, wrong-year or untrusted sources matched"
    # dense_score is cosine similarity, so one threshold works for every alpha; structured hits are exact (1.0).
    best = max(i.dense_score for i in usable)
    if settings.retrieval_min_score is not None and best < settings.retrieval_min_score:
        return False, f"low confidence (best similarity {best:.3f} below {settings.retrieval_min_score})"
    return True, "ok" if settings.retrieval_min_score is not None else "ok (confidence threshold uncalibrated)"
