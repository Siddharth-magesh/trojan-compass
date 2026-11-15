"""Deterministic output guard: redacts PII patterns and removes URLs outside the allow-list (usc.edu + verified source URLs)."""

import re
from urllib.parse import urlparse

from backend.app.data_store.loader import DataStore
from backend.app.schemas.response import StructuredResponse

URL = re.compile(r"https?://[^\s)\]>\"']+")
SSN = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")
CARD_NUMBER = re.compile(r"\b(?:\d[ -]?){13,16}\b")
EMAIL = re.compile(r"\b[\w.+-]+@([\w-]+\.)+[a-z]{2,}\b", re.IGNORECASE)
URL_FIELDS = {"official_url", "apply_url", "url"}


def _usc(url: str) -> bool:
    host = urlparse(url).hostname or ""
    return host == "usc.edu" or host.endswith(".usc.edu")


def allowed_urls(store: DataStore) -> set[str]:
    """usc.edu is always allowed; other URLs only if they appear in verified records or documents."""
    record_urls = {str(r[k]) for records in store.by_id.values() for r in records.values() for k in URL_FIELDS if k in r}
    return {c.url for c in store.citations.values()} | {d.citation.url for d in store.documents} | record_urls


def _clean_text(text: str, allow: set[str], events: list[str]) -> str:
    def url_sub(m: re.Match[str]) -> str:
        if _usc(m.group(0)) or m.group(0) in allow:
            return m.group(0)
        events.append("url_removed")
        return "[link removed]"

    def email_sub(m: re.Match[str]) -> str:
        if m.group(0).lower().endswith("usc.edu"):
            return m.group(0)
        events.append("email_redacted")
        return "[email removed]"

    text = URL.sub(url_sub, text)
    if SSN.search(text) or CARD_NUMBER.search(text):
        events.append("number_redacted")
        text = CARD_NUMBER.sub("[number removed]", SSN.sub("[number removed]", text))
    return EMAIL.sub(email_sub, text)


def _clean_urls(node: object, allow: set[str], events: list[str]) -> None:
    """Card URL fields must be usc.edu or a URL that came from a verified record/document."""
    if isinstance(node, dict):
        for key, value in node.items():
            if key in URL_FIELDS and isinstance(value, str) and value.startswith("http") and not (_usc(value) or value in allow):
                node[key] = "not_listed"
                events.append("card_url_removed")
            else:
                _clean_urls(value, allow, events)
    elif isinstance(node, list):
        for item in node:
            _clean_urls(item, allow, events)


def check_output(response: StructuredResponse, store: DataStore) -> tuple[StructuredResponse, list[str]]:
    events: list[str] = []
    allow = allowed_urls(store)
    data = response.model_dump()
    data["answer"] = _clean_text(data["answer"], allow, events)
    _clean_urls(data["cards"], allow, events)
    data["citations"] = [c for c in data["citations"] if _usc(c["url"]) or c["url"] in allow]
    return StructuredResponse.model_validate(data), events
