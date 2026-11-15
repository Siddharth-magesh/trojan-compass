"""Deterministic BM25 sparse vectors with persisted vocabulary and corpus statistics."""

from __future__ import annotations

import math
import re
from collections import Counter

from pydantic import BaseModel, Field

from ingestion_models import SparseVector, json_bytes, processed_root, read_json, sha256, write_json


def terms(text: str) -> list[str]:
    return re.findall(r'[a-z0-9]+(?:[-_][a-z0-9]+)*', text.lower())


class Bm25(BaseModel):
    tokenizer_version: str = 'lowercase_alphanumeric_hyphen_underscore_1'
    k1: float = 1.2
    b: float = 0.75
    corpus_size: int = Field(gt=0)
    average_length: float = Field(gt=0)
    vocabulary: dict[str, int]
    document_frequency: dict[str, int]

    def fingerprint(self) -> str:
        return sha256(json_bytes(self.model_dump()))

    def encode(self, text: str, query: bool = False) -> SparseVector:
        counts = Counter(terms(text))
        length, pairs = sum(counts.values()), []
        for term, count in counts.items():
            if term not in self.vocabulary:
                continue
            if query:
                frequency = self.document_frequency[term]
                weight = count * math.log1p((self.corpus_size - frequency + 0.5) / (frequency + 0.5))
            else:
                weight = count * (self.k1 + 1) / (count + self.k1 * (1 - self.b + self.b * length / self.average_length))
            pairs.append((self.vocabulary[term], weight))
        pairs.sort()
        return SparseVector(indices=[p[0] for p in pairs], values=[p[1] for p in pairs])


def fit_or_load(texts: list[str], refit: bool) -> tuple[Bm25, bool]:
    path = processed_root / 'bm25_params.json'
    if path.exists():
        existing = Bm25.model_validate(read_json(path))
        if not refit and len(texts) < existing.corpus_size * 1.25:
            return existing, False
    frequencies: Counter[str] = Counter()
    total_length = 0
    for text in texts:
        words = terms(text)
        total_length += len(words)
        frequencies.update(set(words))
    model = Bm25(corpus_size=len(texts), average_length=total_length / len(texts),
                 vocabulary={term: i for i, term in enumerate(sorted(frequencies))},
                 document_frequency=dict(frequencies))
    write_json(path, model.model_dump())
    return model, True
