"""Build local outlines, heading chunks, and exact-record indexes; never contact Pinecone."""

import argparse
import hashlib
import json
import re
from datetime import date

from pydantic import JsonValue
from tokenizers import Tokenizer

from dataset_io import database_root, document_id, load_document, load_records, read_json, record_slug, record_text, registries, sections, write_json
from validate_data import validate

pipeline_version = "career_collection_1"
embed_model = "BAAI/bge-small-en-v1.5"


def text_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def build(as_of: date) -> dict[str, JsonValue]:
    validation = validate(as_of)
    categories, sources = registries()
    processed = database_root / "processed"
    tokenizer = Tokenizer.from_file(str(processed / "tokenizer.json"))
    tokenizer.no_truncation()
    chunks: list[dict[str, JsonValue]] = []
    outlines: dict[str, JsonValue] = {}
    records_index: dict[str, JsonValue] = {}
    manifest_files: dict[str, JsonValue] = {}
    previous_path = processed / "manifest.json"
    previous = read_json(previous_path) if previous_path.exists() else {}
    for path in sorted((database_root / "data").rglob("*")):
        if not path.is_file():
            continue
        domain, category_name = path.relative_to(database_root / "data").parts[:2]
        category = categories[category_name]
        doc_id = document_id(path)
        relative = path.relative_to(database_root.parent).as_posix()
        if category.file_type == "document":
            meta, body, _ = load_document(path)
            entries = sections(body)
            heading_list = re.findall(r"^(#{1,6}) (.+)$", body, re.M)
            if meta.status == "verified" and meta.access_level == "public":
                outlines[doc_id] = [{"level": len(level), "title": title} for level, title in heading_list]
            items = [("outline", "outline", [meta.title], meta.title + "\n" + meta.summary + "\n" + "\n".join(title for _, title in heading_list), {})]
            items += [(f"{index:03d}", "chunk", parts, " > ".join(parts) + "\n" + meta.summary + "\n" + content, {})
                      for index, (parts, content) in enumerate(entries)]
        else:
            payload = load_records(path)
            meta = payload.meta
            items = []
            for position, record in enumerate(payload.records):
                slug = record_slug(record[category.id_field])
                # Exact lookups share the same public/verified boundary as passage retrieval.
                if meta.status == "verified" and meta.access_level == "public":
                    records_index[slug] = {"file": relative, "position": position, "doc_id": doc_id,
                                           "category": category_name, "id_field": category.id_field}
                items.append((slug, "record", [record["title"]], record_text(record, category), record))
        if meta.status != "verified" or meta.access_level != "public":
            continue
        file_vector_ids: list[str] = []
        section_chunks: list[dict[str, JsonValue]] = []
        for chunk_no, (suffix, chunk_type, section_path, embedded_text, record) in enumerate(items):
            vector_id = f"{doc_id}#{suffix}"
            file_vector_ids.append(vector_id)
            metadata = {"doc_id": doc_id, "chunk_type": chunk_type, "domain": domain,
                        "category": category_name, "title": record.get("title", meta.title),
                        "section_path": " > ".join(section_path), "chunk_no": chunk_no,
                        "source_name": meta.source_name, "source_url": str(meta.source_url),
                        "authority": sources[meta.source_name].authority, "also_in": [],
                        "academic_year": meta.academic_year, "version": meta.version,
                        "verified_date_num": int(meta.last_verified_date.strftime("%Y%m%d")),
                        "access_level": "public", "audience": meta.audience, "tags": meta.tags,
                        "data_origin": meta.data_origin, "embed_model": embed_model, "text": embedded_text}
            if record:
                metadata["record_slug"] = suffix
                for field in category.filter_fields:
                    if field in record:
                        metadata[field] = record[field]
            source_urls = sorted({str(meta.source_url)} | {entry["source_url"] for entry in record.get("evidence", [])}
                                 | set(re.findall(r"\]\((https?://[^)]+)\)", embedded_text)))
            chunk = {"id": vector_id, "doc_id": doc_id, "text": embedded_text,
                     "chunk_hash": text_hash(embedded_text), "source_urls": source_urls,
                     "section_path": section_path, "metadata": metadata,
                     "token_count": len(tokenizer.encode(embedded_text, add_special_tokens=True).ids)}
            if chunk["token_count"] > 450 or len(json.dumps(metadata).encode("utf-8")) >= 40000:
                raise ValueError(f"Oversized chunk or metadata: {vector_id}")
            chunks.append(chunk)
            if chunk_type == "chunk":
                section_chunks.append(chunk)
        for index, chunk in enumerate(section_chunks):
            if index:
                chunk["prev_id"] = section_chunks[index - 1]["id"]
            if index + 1 < len(section_chunks):
                chunk["next_id"] = section_chunks[index + 1]["id"]
        manifest_files[relative] = {"file_hash": hashlib.sha256(path.read_bytes()).hexdigest(), "vector_ids": file_vector_ids}
    groups: dict[str, list[dict[str, JsonValue]]] = {}
    for chunk in chunks:
        groups.setdefault(chunk["chunk_hash"], []).append(chunk)
    ranks = {"official": 0, "third_party": 1, "synthetic": 2}
    index_ids: list[str] = []
    for group in groups.values():
        group.sort(key=lambda chunk: (ranks[chunk["metadata"]["authority"]], chunk["id"]))
        primary = group[0]
        index_ids.append(primary["id"])
        primary["metadata"]["also_in"] = sorted({entry["doc_id"] for entry in group[1:]})[:5]
        for duplicate in group[1:]:
            duplicate["duplicate_of"] = primary["id"]
    old_ids = set(previous.get("index_vector_ids", []))
    manifest = {"pipeline_version": pipeline_version, "as_of": as_of.isoformat(), "embed_model": embed_model,
                "tokenizer_sha256": hashlib.sha256((processed / "tokenizer.json").read_bytes()).hexdigest(),
                "registry_sha256": text_hash(json.dumps(read_json(database_root / "registry/categories.json"), sort_keys=True)),
                "chunker_settings": {"target_tokens": 350, "hard_cap_tokens": 450, "overlap_tokens": 50,
                                     "mode": "heading_sections_fail_if_oversized"},
                "files": manifest_files, "index_vector_ids": sorted(index_ids),
                "removed_vector_ids": sorted(old_ids - set(index_ids)),
                "embedding_status": "not_run", "pinecone_status": "not_run"}
    processed.mkdir(parents=True, exist_ok=True)
    (processed / "chunks.jsonl").write_text("".join(json.dumps(chunk, ensure_ascii=False) + "\n" for chunk in chunks), encoding="utf-8")
    write_json(processed / "outlines.json", outlines)
    write_json(processed / "records_index.json", records_index)
    write_json(processed / "manifest.json", manifest)
    validation.update({"chunks": len(chunks), "index_vectors": len(index_ids), "indexed_records": len(records_index)})
    write_json(processed / "validation_report.json", validation)
    return validation


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--as-of", type=date.fromisoformat, required=True)
    print(json.dumps(build(parser.parse_args().as_of), indent=2))
