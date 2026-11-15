"""Turn verified data files into outline, section and record chunks for retrieval.
Rebuilds only files whose hash changed and writes processed/ (chunks, outlines, records index, manifest)."""

import hashlib
import json
import re
from collections import defaultdict

from data_common import (
    AUTHORITY_RANK, CAP_TOKENS, EMBED_MODEL, OVERLAP_TOKENS, PIPELINE_VERSION, PROCESSED_DIR, TARGET_TOKENS,
    DataFile, blocks_of, categories, count_tokens, embed_text, iter_data_files, load_json, parse_document,
    parse_records, record_slug, sources, split_sections,
)

CHUNKER_SETTINGS = {"target_tokens": TARGET_TOKENS, "cap_tokens": CAP_TOKENS, "overlap_tokens": OVERLAP_TOKENS}
MAX_ALSO_IN = 5
URL_RE = re.compile(r"https?://[^\s)\]>\"']+")


def sha256(data: bytes | str) -> str:
    return hashlib.sha256(data.encode() if isinstance(data, str) else data).hexdigest()


def tail_overlap(text: str) -> str:
    """Last ~OVERLAP_TOKENS tokens of text, cut on a word boundary."""
    words = text.split()
    taken: list[str] = []
    while words and count_tokens(" ".join(taken)) < OVERLAP_TOKENS:
        taken.insert(0, words.pop())
    return " ".join(taken)


def split_oversized(section_path: list[str], summary: str, text: str) -> list[str]:
    """Pack paragraph blocks up to TARGET_TOKENS; tables and lists stay whole. Sentences split only if one block alone exceeds the cap."""
    header_tokens = count_tokens(embed_text(section_path, summary, ""))
    budget = TARGET_TOKENS - header_tokens
    units: list[str] = []
    for block in blocks_of(text):
        if count_tokens(block) + header_tokens > CAP_TOKENS and not block.lstrip().startswith(("|", "-", "*")) \
                and not re.match(r"^\d+[.)]\s", block):
            units += re.split(r"(?<=[.!?])\s+", block)
        else:
            units.append(block)
    pieces: list[str] = []
    current: list[str] = []
    for unit in units:
        candidate = "\n\n".join(current + [unit])
        if current and count_tokens(candidate) > budget:
            pieces.append("\n\n".join(current))
            current = [tail_overlap(pieces[-1]), unit]
        else:
            current.append(unit)
    if current:
        pieces.append("\n\n".join(current))
    return pieces


def base_fields(f: DataFile, meta: dict, authority: str) -> dict:
    fields = {
        "doc_id": f.doc_id, "domain": f.domain, "category": f.category, "file": f.rel,
        "title": meta["title"], "source_name": meta["source_name"], "source_url": meta["source_url"],
        "authority": authority, "academic_year": meta.get("academic_year"), "version": meta["version"],
        "verified_date_num": int(meta["last_verified_date"].replace("-", "")),
        "access_level": meta.get("access_level", "public"), "owner_student_id": meta.get("owner_student_id"),
        "audience": meta["audience"], "tags": meta["tags"], "data_origin": meta["data_origin"], "embed_model": EMBED_MODEL,
    }
    return {k: v for k, v in fields.items() if v is not None}


def make_chunk(base: dict, vid: str, chunk_type: str, text: str, embedded: str, **extra) -> dict:
    urls = list(dict.fromkeys([base["source_url"]] + URL_RE.findall(text)))
    return {"id": vid, "chunk_type": chunk_type, **base, **extra, "text": text, "embed_text": embedded,
            "chunk_hash": sha256(embedded), "source_urls": urls}


def document_chunks(f: DataFile, authority: str) -> tuple[list[dict], dict]:
    meta, body = parse_document(f.path)
    base = base_fields(f, meta, authority)
    summary = meta.get("summary", "")
    sections = split_sections(body, meta["title"])
    headings = [" > ".join(p) for p, _ in sections]
    outline_text = "\n".join([meta["title"], summary, "Sections:"] + [f"- {h}" for h in headings])
    chunks = [make_chunk(base, f"{f.doc_id}#outline", "outline", outline_text, outline_text, section_path=meta["title"])]
    chunk_no = 0
    for section_path, text in sections:
        if count_tokens(embed_text(section_path, summary, text)) > CAP_TOKENS:
            pieces = split_oversized(section_path, summary, text)
        else:
            pieces = [text]
        for piece in pieces:
            chunk_no += 1
            chunks.append(make_chunk(
                base, f"{f.doc_id}#{chunk_no:03d}", "chunk", piece, embed_text(section_path, summary, piece),
                section_path=" > ".join(section_path), chunk_no=chunk_no,
            ))
    section_chunks = [c for c in chunks if c["chunk_type"] == "chunk"]
    for i, c in enumerate(section_chunks):
        if i > 0:
            c["prev_id"] = section_chunks[i - 1]["id"]
        if i < len(section_chunks) - 1:
            c["next_id"] = section_chunks[i + 1]["id"]
    outline = {"title": meta["title"], "summary": summary, "file": f.rel, "sections": headings}
    return chunks, outline


def render_template(template: str, record: dict) -> str:
    def value(match: re.Match) -> str:
        v = record.get(match.group(1), "")
        return ", ".join(map(str, v)) if isinstance(v, list) else str(v)

    return re.sub(r"\{(\w+)\}", value, template)


def record_chunks(f: DataFile, cat: dict, authority: str) -> tuple[list[dict], dict]:
    meta, records = parse_records(f.path)
    base = base_fields(f, meta, authority)
    chunks, index = [], {}
    for position, record in enumerate(records):
        slug = record_slug(record[cat["id_field"]])
        text = render_template(cat["search_template"], record)
        filters = {k: record[k] for k in cat.get("filter_fields", []) if record.get(k) is not None}
        chunks.append(make_chunk(base, f"{f.doc_id}#{slug}", "record", text, text,
                                 record_slug=slug, section_path=meta["title"], **filters))
        index[slug] = {"file": f.rel, "position": position, "doc_id": f.doc_id, "category": f.category}
    return chunks, index


def dedup(chunks: list[dict]) -> None:
    """Index one vector per identical chunk_hash: keep the most authoritative, list the rest in also_in."""
    by_hash: dict[str, list[dict]] = defaultdict(list)
    for c in chunks:
        c.pop("also_in", None)
        c["indexed"] = c.get("status") == "verified"
        by_hash[c["chunk_hash"]].append(c)
    for group in by_hash.values():
        group = [c for c in group if c["indexed"]]
        if len(group) < 2:
            continue
        group.sort(key=lambda c: (-AUTHORITY_RANK.get(c["authority"], 0), c["doc_id"]))
        keep, dupes = group[0], group[1:]
        keep["also_in"] = [d["doc_id"] for d in dupes][:MAX_ALSO_IN]
        keep["source_urls"] = list(dict.fromkeys(keep["source_urls"] + [u for d in dupes for u in d["source_urls"]]))
        for d in dupes:
            d["indexed"] = False
            d["duplicate_of"] = keep["id"]


def main() -> None:
    PROCESSED_DIR.mkdir(exist_ok=True)
    manifest_path, chunks_path = PROCESSED_DIR / "manifest.json", PROCESSED_DIR / "chunks.jsonl"
    old_manifest = load_json(manifest_path) if manifest_path.exists() else {}
    full_rebuild = (old_manifest.get("pipeline_version") != PIPELINE_VERSION
                    or old_manifest.get("embed_model") != EMBED_MODEL
                    or old_manifest.get("chunker") != CHUNKER_SETTINGS)
    old_chunks: dict[str, list[dict]] = defaultdict(list)
    if chunks_path.exists() and not full_rebuild:
        for line in chunks_path.read_text(encoding="utf-8").splitlines():
            c = json.loads(line)
            old_chunks[c["file"]].append(c)
    old_outlines = load_json(PROCESSED_DIR / "outlines.json") if not full_rebuild and (PROCESSED_DIR / "outlines.json").exists() else {}
    old_records = load_json(PROCESSED_DIR / "records_index.json") if not full_rebuild and (PROCESSED_DIR / "records_index.json").exists() else {}

    cats, srcs = categories(), sources()
    all_chunks: list[dict] = []
    outlines, records_index, files_manifest = {}, {}, {}
    rebuilt = reused = skipped = 0
    for f in iter_data_files():
        file_hash = sha256(f.path.read_bytes())
        cat = cats[f.category]
        meta = parse_document(f.path)[0] if cat["file_type"] == "document" else parse_records(f.path)[0]
        status = meta.get("status")
        entry = {"hash": file_hash, "doc_id": f.doc_id, "status": status, "vector_ids": []}
        if status != "verified":
            skipped += 1
            files_manifest[f.rel] = entry
            continue
        previous = old_manifest.get("files", {}).get(f.rel, {})
        if previous.get("hash") == file_hash and old_chunks.get(f.rel):
            chunks = old_chunks[f.rel]
            if f.doc_id in old_outlines:
                outlines[f.doc_id] = old_outlines[f.doc_id]
            records_index.update({k: v for k, v in old_records.items() if v["file"] == f.rel})
            reused += 1
        else:
            authority = srcs[meta["source_name"]]["authority"]
            if cat["file_type"] == "document":
                chunks, outline = document_chunks(f, authority)
                outlines[f.doc_id] = outline
            else:
                chunks, index = record_chunks(f, cat, authority)
                records_index.update(index)
            rebuilt += 1
        for c in chunks:
            c["status"] = status
        entry["vector_ids"] = [c["id"] for c in chunks]
        files_manifest[f.rel] = entry
        all_chunks += chunks

    dedup(all_chunks)
    with chunks_path.open("w", encoding="utf-8") as out:
        for c in all_chunks:
            out.write(json.dumps(c, ensure_ascii=False) + "\n")
    (PROCESSED_DIR / "outlines.json").write_text(json.dumps(outlines, indent=2, ensure_ascii=False), encoding="utf-8")
    (PROCESSED_DIR / "records_index.json").write_text(json.dumps(records_index, indent=2), encoding="utf-8")
    manifest = {"pipeline_version": PIPELINE_VERSION, "embed_model": EMBED_MODEL, "chunker": CHUNKER_SETTINGS,
                "files": files_manifest}
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    print(f"{'full rebuild' if full_rebuild else 'incremental'}: {rebuilt} rebuilt, {reused} unchanged, {skipped} not verified")
    per_file = defaultdict(lambda: defaultdict(int))
    for c in all_chunks:
        per_file[c["file"]][c["chunk_type"]] += 1
    for file, counts in sorted(per_file.items()):
        print(f"  {file}: " + ", ".join(f"{n} {t}" for t, n in sorted(counts.items())))
    indexed = sum(c["indexed"] for c in all_chunks)
    print(f"total {len(all_chunks)} chunks, {indexed} to index, {len(all_chunks) - indexed} duplicates")


if __name__ == "__main__":
    main()
