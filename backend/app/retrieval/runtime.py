"""Loads processed/ artifacts once (manifest, BM25, pinned BGE encoder, chunk neighbours, record index) and reports readiness.

Embedding, BM25 and the Pinecone connection are the ingestion pipeline's own code, so query vectors match stored vectors.
"""

import json
import logging
from dataclasses import dataclass, field
from functools import lru_cache
from typing import Any

from backend.app.config.settings import REPO_ROOT, settings
from backend.app.data_store import loader  # noqa: F401  (adds local_database/scripts to sys.path)

log = logging.getLogger(__name__)
PROCESSED = settings.data_root / "processed"
REQUIRED = ["manifest.json", "bm25_params.json", "model/model.onnx", "model/tokenizer.json"]
REGENERATE = "run `cd local_database/scripts && python push_to_pinecone.py --verify-only` (read-only on Pinecone)"


@dataclass
class Runtime:
    manifest: dict[str, Any]
    bm25: Any
    encoder: Any
    index: Any
    namespaces: dict[str, int]                                          # namespace -> vector count (from the manifest)
    chunks: dict[str, dict[str, Any]] = field(default_factory=dict)     # vector id -> text, neighbours, section
    records_index: dict[str, Any] = field(default_factory=dict)


def readiness() -> tuple[bool, str]:
    """(ready, reason). Never raises; the reason is safe to show in /api/health and logs."""
    from dotenv import dotenv_values

    missing = [name for name in REQUIRED if not (PROCESSED / name).exists()]
    if missing:
        return False, f"processed/ is missing {', '.join(missing)}; {REGENERATE}"
    if not dotenv_values(REPO_ROOT / ".env").get("PINECONE_API_KEY"):
        return False, "PINECONE_API_KEY is not set in .env"
    from ingestion_models import read_json
    from sparse_encoder import Bm25

    manifest = read_json(PROCESSED / "manifest.json")
    if Bm25.model_validate(read_json(PROCESSED / "bm25_params.json")).fingerprint() != manifest.get("bm25_hash"):
        return False, f"BM25 parameters differ from the verified upload; {REGENERATE}"
    return True, "ready"


def _load_chunks() -> dict[str, dict[str, Any]]:
    path = PROCESSED / "chunks.jsonl"
    if not path.exists():
        return {}
    out = {}
    with path.open(encoding="utf-8") as fh:
        for line in fh:
            c = json.loads(line)
            out[c["id"]] = {"text": c["text"], "prev_id": c.get("prev_id", ""), "next_id": c.get("next_id", ""),
                            "section_path": c["metadata"].get("section_path", ""), "doc_id": c["doc_id"]}
    return out


@lru_cache(maxsize=1)
def get_runtime() -> Runtime:
    """Raises if not ready; callers check readiness() first. Connecting only describes the index (no writes)."""
    from embedding_runtime import Encoder, prepare_model
    from ingestion_models import read_json
    from pinecone_store import connect
    from sparse_encoder import Bm25

    manifest = read_json(PROCESSED / "manifest.json")
    index, _ = connect(manifest["index_name"], create=False)
    records_path = PROCESSED / "records_index.json"
    runtime = Runtime(manifest=manifest, bm25=Bm25.model_validate(read_json(PROCESSED / "bm25_params.json")),
                      encoder=Encoder(prepare_model()), index=index,
                      namespaces={ns: len(ids) for ns, ids in manifest.get("vector_ids", {}).items()},
                      chunks=_load_chunks(), records_index=read_json(records_path) if records_path.exists() else {})
    runtime.encoder.encode(["warmup"])  # load the ONNX session now so the first student query is not slow
    log.info("retrieval runtime ready: namespaces=%s chunks=%s", runtime.namespaces, len(runtime.chunks))
    return runtime
