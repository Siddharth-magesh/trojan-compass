"""Embed indexable chunks (dense BGE-small + sparse BM25) and sync them to Pinecone, one namespace per domain.
Upserts new or changed vectors in batches of 100 and deletes vectors that no longer exist. --dry-run skips Pinecone."""

import argparse
import json
import os
from collections import defaultdict

from dotenv import load_dotenv

from data_common import EMBED_MODEL, PIPELINE_VERSION, PROCESSED_DIR, REPO_ROOT, categories
from embedding import BM25_PATH, embed_passages, fit_bm25, load_bm25

# Pinecone index names allow only lowercase letters, digits and hyphens.
INDEX_NAME = "trojan-compass"
DIMENSION = 384
BATCH_SIZE = 100
REFIT_GROWTH = 0.25
MAX_METADATA_BYTES = 40_000
STATE_PATH = PROCESSED_DIR / "push_state.json"
METADATA_FIELDS = [
    "doc_id", "record_slug", "chunk_type", "domain", "category", "title", "section_path", "chunk_no", "source_name",
    "source_url", "authority", "also_in", "academic_year", "version", "verified_date_num", "access_level",
    "owner_student_id", "audience", "tags", "data_origin", "embed_model", "text",
]


def load_chunks() -> list[dict]:
    lines = (PROCESSED_DIR / "chunks.jsonl").read_text(encoding="utf-8").splitlines()
    chunks = [json.loads(line) for line in lines]
    # Only public data, or synthetic private data tied to a student, is ever indexed.
    return [c for c in chunks if c["indexed"] and (c["access_level"] == "public" or c.get("owner_student_id"))]


def metadata_for(chunk: dict, filter_fields: list[str]) -> dict:
    meta = {k: chunk[k] for k in METADATA_FIELDS + filter_fields if k in chunk}
    meta = {k: v for k, v in meta.items() if v is not None and v != "" and v != []}
    size = len(json.dumps(meta).encode())
    if size > MAX_METADATA_BYTES:
        raise ValueError(f"{chunk['id']}: metadata is {size} bytes (limit {MAX_METADATA_BYTES})")
    return meta


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="embed and count, but do not call Pinecone")
    parser.add_argument("--refit", action="store_true", help="refit BM25 and re-upsert everything")
    args = parser.parse_args()

    cats = categories()
    chunks = load_chunks()
    state = json.loads(STATE_PATH.read_text()) if STATE_PATH.exists() else {}
    pushed: dict[str, dict[str, str]] = state.get("namespaces", {})

    old_size = state.get("bm25_corpus_size", 0)
    refit = args.refit or not BM25_PATH.exists() or not old_size or len(chunks) >= old_size * (1 + REFIT_GROWTH)
    texts = [c["embed_text"] for c in chunks]
    bm25 = fit_bm25(texts) if refit else load_bm25()
    full_push = refit or state.get("pipeline_version") != PIPELINE_VERSION or state.get("embed_model") != EMBED_MODEL

    dense, newly_embedded = embed_passages(chunks)
    current: dict[str, dict[str, str]] = defaultdict(dict)
    to_upsert: dict[str, list[dict]] = defaultdict(list)
    for chunk in chunks:
        ns = chunk["domain"]
        current[ns][chunk["id"]] = chunk["chunk_hash"]
        if not full_push and pushed.get(ns, {}).get(chunk["id"]) == chunk["chunk_hash"]:
            continue
        to_upsert[ns].append(chunk)
    to_delete = {ns: sorted(set(ids) - set(current.get(ns, {}))) for ns, ids in pushed.items()}

    print(f"chunks to index: {len(chunks)} (newly embedded {newly_embedded}, BM25 {'refit' if refit else 'loaded'})")
    for ns in sorted(set(current) | set(to_delete)):
        print(f"  namespace {ns}: {len(current.get(ns, {}))} current, {len(to_upsert.get(ns, []))} to upsert, "
              f"{len(to_delete.get(ns, []))} to delete")

    vectors: dict[str, list[dict]] = defaultdict(list)
    for ns, items in to_upsert.items():
        sparse = bm25.encode_documents([c["embed_text"] for c in items])
        for chunk, sp in zip(items, sparse):
            filters = cats[chunk["category"]].get("filter_fields", [])
            vectors[ns].append({"id": chunk["id"], "values": dense[chunk["chunk_hash"]],
                                "sparse_values": sp, "metadata": metadata_for(chunk, filters)})
    if args.dry_run:
        print("dry run: Pinecone not called, push state not saved")
        return

    from pinecone import Pinecone, ServerlessSpec

    load_dotenv(REPO_ROOT / ".env")
    pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
    if not pc.has_index(INDEX_NAME):
        pc.create_index(INDEX_NAME, dimension=DIMENSION, metric="dotproduct",
                        spec=ServerlessSpec(cloud="aws", region="us-east-1"))
    index = pc.Index(INDEX_NAME)
    for ns, items in vectors.items():
        for i in range(0, len(items), BATCH_SIZE):
            index.upsert(vectors=items[i:i + BATCH_SIZE], namespace=ns)
    for ns, ids in to_delete.items():
        for i in range(0, len(ids), BATCH_SIZE):
            index.delete(ids=ids[i:i + BATCH_SIZE], namespace=ns)

    STATE_PATH.write_text(json.dumps({
        "pipeline_version": PIPELINE_VERSION, "embed_model": EMBED_MODEL,
        "bm25_corpus_size": len(chunks) if refit else old_size, "namespaces": current,
    }, indent=2))
    print("push complete")


if __name__ == "__main__":
    main()
