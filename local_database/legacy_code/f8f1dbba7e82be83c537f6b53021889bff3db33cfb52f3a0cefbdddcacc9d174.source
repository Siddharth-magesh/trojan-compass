"""Dense (BGE-small, cached by chunk_hash) and sparse (BM25) encoders shared by push_to_pinecone.py and eval_retrieval.py."""

import json
from functools import lru_cache

from data_common import EMBED_MODEL, PROCESSED_DIR, QUERY_PREFIX

CACHE_DIR = PROCESSED_DIR / "embedding_cache"
BM25_PATH = PROCESSED_DIR / "bm25_params.json"


@lru_cache(maxsize=1)
def dense_model():
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(EMBED_MODEL)


def _cache_path():
    return CACHE_DIR / f"{EMBED_MODEL.replace('/', '__')}.json"


def embed_passages(chunks: list[dict]) -> tuple[dict[str, list[float]], int]:
    """Return {chunk_hash: vector} for the chunks and how many were newly embedded. Passages get no prefix."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache = json.loads(_cache_path().read_text()) if _cache_path().exists() else {}
    missing = {c["chunk_hash"]: c["embed_text"] for c in chunks if c["chunk_hash"] not in cache}
    if missing:
        vectors = dense_model().encode(list(missing.values()), normalize_embeddings=True, batch_size=32)
        cache.update({h: v.tolist() for h, v in zip(missing, vectors)})
        _cache_path().write_text(json.dumps(cache))
    return {c["chunk_hash"]: cache[c["chunk_hash"]] for c in chunks}, len(missing)


def embed_query(query: str) -> list[float]:
    return dense_model().encode(QUERY_PREFIX + query, normalize_embeddings=True).tolist()


def fit_bm25(texts: list[str]):
    from pinecone_text.sparse import BM25Encoder

    encoder = BM25Encoder()
    encoder.fit(texts)
    encoder.dump(str(BM25_PATH))
    return encoder


def load_bm25():
    from pinecone_text.sparse import BM25Encoder

    return BM25Encoder().load(str(BM25_PATH))
