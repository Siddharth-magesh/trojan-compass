"""Deterministic query processing: sanitize, normalize and extract course codes, ids, money comparisons, years and acronyms."""

import hashlib
import re
import unicodedata
from dataclasses import dataclass, field

from backend.app.agents.academic_agent import course_ids_in
from backend.app.config.settings import settings

ACADEMIC_YEAR = re.compile(r"\b(20\d{2})\s*[-–/]\s*(20\d{2})\b")
TERM = re.compile(r"\b(spring|summer|fall)\b(?:\W+[a-z]+){0,3}?\W+(20\d{2})\b", re.IGNORECASE)
COMPARISON = re.compile(r"\b(under|below|less than|at most|up to|max(?:imum)?|over|above|more than|at least|min(?:imum)?)\s+"
                        r"\$?\s?(\d[\d,]*(?:\.\d+)?)", re.IGNORECASE)
RECORD_ID = re.compile(r"\b[a-z0-9]+(?:_[a-z0-9]+){1,}\b")
ACRONYMS = {"cpt", "opt", "i-20", "i20", "ssn", "f-1", "j-1", "ship", "sevis", "ead", "itin", "ois", "uscard",
            "myshr", "stem", "fafsa", "ta", "ra", "gpa", "netid"}
LOWER_OPS = {"under", "below", "less than", "at most", "up to", "max", "maximum"}


@dataclass
class ParsedQuery:
    text: str                                   # sanitized original casing, used for embedding and BM25
    normalized: str                             # lowercase, single spaces, used for cache keys and matching
    course_codes: list[str] = field(default_factory=list)
    record_ids: list[str] = field(default_factory=list)
    comparisons: list[tuple[str, float]] = field(default_factory=list)  # ("$lte"|"$gte", value)
    academic_year: str = ""
    acronyms: list[str] = field(default_factory=list)

    @property
    def keyword_heavy(self) -> bool:
        """Codes and acronyms carry the meaning, so lexical (BM25) matching should dominate."""
        return bool(self.course_codes or self.acronyms) and len(self.normalized.split()) <= 10

    @property
    def query_hash(self) -> str:
        return hashlib.sha256(self.normalized.encode("utf-8")).hexdigest()[:16]


def sanitize(raw: str) -> str:
    text = "".join(ch for ch in unicodedata.normalize("NFKC", raw) if ch.isprintable() or ch == " ")
    return re.sub(r"\s+", " ", text).strip()[: settings.retrieval_max_query_chars]


def resolve_year(text: str, override: str | None) -> str:
    """Explicit academic year wins; Fall Y -> Y-(Y+1); Spring/Summer Y -> (Y-1)-Y; otherwise the current year."""
    if override:
        return override
    if match := ACADEMIC_YEAR.search(text):
        return f"{match.group(1)}-{match.group(2)}"
    if match := TERM.search(text):
        season, year = match.group(1).lower(), int(match.group(2))
        return f"{year}-{year + 1}" if season == "fall" else f"{year - 1}-{year}"
    return settings.academic_year


def parse(raw: str, year_override: str | None = None) -> ParsedQuery:
    text = sanitize(raw)
    normalized = text.lower()
    comparisons = [("$lte" if op.lower() in LOWER_OPS else "$gte", float(value.replace(",", "")))
                   for op, value in COMPARISON.findall(text)]
    words = set(re.findall(r"[a-z0-9]+(?:-[a-z0-9]+)?", normalized))
    return ParsedQuery(text=text, normalized=normalized, course_codes=course_ids_in(text),
                       record_ids=RECORD_ID.findall(normalized), comparisons=comparisons,
                       academic_year=resolve_year(text, year_override), acronyms=sorted(words & ACRONYMS))
