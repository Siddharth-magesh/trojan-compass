"""Create complete, token-bounded document passages and registry-driven record search entries."""

from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

from pydantic import BaseModel

from embedding_runtime import Encoder
from ingestion_models import (Category, Chunk, SourceFile, json_bytes, max_tokens,
                              model_name, model_revision, overlap_tokens, pipeline_version,
                              processed_root, read_json, sha256, target_tokens, write_json)


class PreparedFile(BaseModel):
    chunks: list[Chunk]
    headings: list[str] = []
    lookup: dict[str, dict] = {}


def sections(body: str) -> list[tuple[str, str]]:
    result, stack, lines = [], [], []
    current = 'Introduction'
    fenced = False
    for line in body.splitlines(keepends=True):
        if line.lstrip().startswith('```'):
            fenced = not fenced
        heading = re.match(r'^(#{1,6})\s+(.+?)\s*$', line) if not fenced else None
        if heading:
            if ''.join(lines).strip():
                result.append((current, ''.join(lines)))
            level, title = len(heading[1]), heading[2]
            stack = [(depth, name) for depth, name in stack if depth < level] + [(level, title)]
            current, lines = ' > '.join(name for _, name in stack), []
        lines.append(line)
    if ''.join(lines).strip():
        result.append((current, ''.join(lines)))
    return result


def atomic_ranges(text: str) -> list[tuple[int, int]]:
    ranges, offset, start, kind = [], 0, None, ''
    for line in text.splitlines(keepends=True):
        is_table = line.lstrip().startswith('|')
        is_ordered = bool(re.match(r'^\s*\d+[.)]\s', line))
        is_fence = line.lstrip().startswith('```')
        if start is not None:
            continues = (kind == 'code' or (kind == 'table' and is_table) or
                         (kind == 'list' and (is_ordered or not line.strip() or line.startswith(('  ', '\t')))))
            if not continues or (kind == 'code' and is_fence):
                end = offset + len(line) if kind == 'code' else offset
                ranges.append((start, end))
                start, kind = None, ''
                if is_fence:
                    offset += len(line)
                    continue
        if start is None and (is_table or is_ordered or is_fence):
            start, kind = offset, 'table' if is_table else 'list' if is_ordered else 'code'
        offset += len(line)
    if start is not None:
        ranges.append((start, len(text)))
    return ranges


def split_section(text: str, context: str, encoder: Encoder) -> list[str]:
    if encoder.token_count(context + text) <= max_tokens:
        return [text]
    atomic = atomic_ranges(text)
    for start, end in atomic:
        if encoder.token_count(context + text[start:end]) > max_tokens:
            raise ValueError('An indivisible table/list exceeds 450 tokens; source needs a reviewed topic split')
    paragraph_ends = [m.end() for m in re.finditer(r'\n\s*\n', text)]
    word_ends = [m.end() for m in re.finditer(r'\S+\s*', text)]
    allowed = [end for end in word_ends if not any(a < end < b for a, b in atomic)]
    result, start = [], 0
    while start < len(text):
        if encoder.token_count(context + text[start:]) <= max_tokens:
            result.append(text[start:])
            break
        candidates = [end for end in allowed if end > start]
        low, high = 0, len(candidates)
        while low < high:
            middle = (low + high) // 2
            if encoder.token_count(context + text[start:candidates[middle]]) <= target_tokens:
                low = middle + 1
            else:
                high = middle
        end = candidates[max(0, low - 1)]
        preferred = [p for p in paragraph_ends if start < p <= end and p in allowed]
        if preferred:
            end = preferred[-1]
        if encoder.token_count(context + text[start:end]) > max_tokens:
            raise ValueError('Cannot split section without breaking an atomic block or exceeding the token limit')
        result.append(text[start:end])
        offsets = encoder.tokenizer.encode(text[start:end], add_special_tokens=False).offsets
        overlap_start = start + offsets[max(0, len(offsets) - overlap_tokens)][0]
        if overlap_start <= start or any(a < overlap_start < b for a, b in atomic):
            overlap_start = end
        start = overlap_start
    return result


def base_metadata(source: SourceFile, sources: dict) -> dict:
    meta = source.meta
    return {'doc_id': source.doc_id, 'domain': source.domain, 'category': source.category,
            'title': meta.title, 'source_name': meta.source_name, 'source_url': meta.source_url,
            'authority': sources[meta.source_name]['authority'], 'academic_year': meta.academic_year,
            'version': meta.version, 'verified_date_num': int(meta.last_verified_date.replace('-', '')),
            'access_level': 'public', 'audience': meta.audience, 'tags': meta.tags,
            'data_origin': meta.data_origin, 'embed_model': model_name, 'model_revision': model_revision,
            'dataset_id': 'trojan_compass', 'pipeline_version': pipeline_version}


def make_chunk(source: SourceFile, suffix: str, raw: str, embedded: str, metadata: dict,
               encoder: Encoder) -> Chunk:
    digest = sha256(embedded.encode('utf-8'))
    metadata = {**metadata, 'text': raw, 'chunk_hash': digest}
    if len(json_bytes(metadata)) >= 40000:
        raise ValueError(f'Metadata exceeds 40 KB: {source.path}')
    return Chunk(id=f'{source.doc_id}#{suffix}', namespace=source.domain, doc_id=source.doc_id,
                 source_path=source.path, text=raw, embedded_text=embedded, chunk_hash=digest,
                 token_count=encoder.token_count(embedded), metadata=metadata,
                 source_urls=[str(metadata['source_url'])])


def document_chunks(source: SourceFile, sources: dict, encoder: Encoder) -> tuple[list[Chunk], list]:
    heading_sections = sections(source.body)
    headings = [heading for heading, _ in heading_sections]
    outline = source.meta.title + '\n' + source.meta.summary + '\n' + '\n'.join(headings)
    common = base_metadata(source, sources)
    chunks = [make_chunk(source, 'outline', outline, outline,
                        {**common, 'chunk_type': 'outline', 'section_path': 'Outline'}, encoder)]
    number = 0
    for heading, text in heading_sections:
        context = f'{source.meta.title} > {heading}\n{source.meta.summary}\n\n'
        for part in split_section(text, context, encoder):
            chunks.append(make_chunk(source, f'{number:03d}', part, context + part,
                                     {**common, 'chunk_type': 'chunk', 'section_path': heading,
                                      'chunk_no': number}, encoder))
            number += 1
    for position, chunk in enumerate(chunks[1:]):
        chunk.prev_id = chunks[position].id if position else ''
        chunk.next_id = chunks[position + 2].id if position + 2 < len(chunks) else ''
    return chunks, headings


def render_value(value: object) -> str:
    if isinstance(value, list):
        return ', '.join(render_value(v) for v in value) if value else 'none listed'
    if isinstance(value, dict):
        return json.dumps(value, ensure_ascii=False)
    if isinstance(value, bool):
        return 'yes' if value else 'no'
    return str(value)


def record_chunks(source: SourceFile, category: Category, sources: dict, encoder: Encoder) -> tuple[list[Chunk], dict]:
    chunks, index = [], {}
    common = base_metadata(source, sources)
    for position, record in enumerate(source.records):
        record_id = str(record[category.id_field])
        slug = record_id.lower().replace(' ', '_')
        text = category.search_template.format_map({k: render_value(v) for k, v in record.items()})
        metadata = {**common, 'chunk_type': 'record', 'record_slug': slug,
                    'title': str(record.get('title', record.get('name', record_id)))}
        for key in ['source_name', 'source_url']:
            if key in record:
                metadata[key] = record[key]
        metadata['authority'] = sources[metadata['source_name']]['authority']
        for key in category.filter_fields:
            if key in record:
                if key in metadata:
                    raise ValueError(f'Category filter cannot override protected metadata: {key}')
                value = record[key]
                if isinstance(value, dict) or (isinstance(value, list) and not all(isinstance(v, str) for v in value)):
                    raise ValueError(f'Non-flat filter field: {source.doc_id}/{key}')
                metadata[key] = value
        chunk = make_chunk(source, slug, text, text, metadata, encoder)
        chunks.append(chunk)
        index[chunk.id] = {'record_slug': slug, 'file': source.path, 'position': position,
                           'record_id': record_id, 'doc_id': source.doc_id,
                           'source_sha256': source.sha256, 'id_field': category.id_field,
                           'academic_year': source.meta.academic_year, 'access_level': 'public'}
    return chunks, index


def deduplicate(chunks: list[Chunk]) -> list[Chunk]:
    groups: dict[tuple, list[Chunk]] = defaultdict(list)
    rank = {'official': 0, 'third_party': 1, 'synthetic': 2}
    for chunk in chunks:
        # Do not erase domain or year routing boundaries when text is identical.
        groups[(chunk.namespace, chunk.metadata['academic_year'], chunk.chunk_hash)].append(chunk)
    winners = []
    for values in groups.values():
        values.sort(key=lambda c: (rank[c.metadata['authority']], c.id))
        winner = values[0]
        winner.also_in = sorted({c.doc_id for c in values[1:] if c.doc_id != winner.doc_id})
        winner.source_urls = sorted({url for c in values for url in c.source_urls})
        if winner.also_in:
            winner.metadata['also_in'] = winner.also_in[:5]
        winners.append(winner)
    return sorted(winners, key=lambda c: (c.namespace, c.id))


def prepare_file(source: SourceFile, category: Category, sources: dict, encoder: Encoder,
                 builder_hash: str) -> tuple[PreparedFile, bool]:
    fingerprint = sha256(json_bytes({'file': source.sha256, 'category': category.model_dump(),
                                    'sources': sources, 'model_revision': model_revision,
                                    'settings': [target_tokens, max_tokens, overlap_tokens],
                                    'pipeline_version': pipeline_version, 'builder_hash': builder_hash}))
    path = processed_root / 'file_cache' / f'{fingerprint}.json'
    if path.exists():
        return PreparedFile.model_validate(read_json(path)), True
    if category.file_type == 'document':
        chunks, headings = document_chunks(source, sources, encoder)
        prepared = PreparedFile(chunks=chunks, headings=headings)
    else:
        chunks, lookup = record_chunks(source, category, sources, encoder)
        prepared = PreparedFile(chunks=chunks, lookup=lookup)
    write_json(path, prepared.model_dump())
    return prepared, False


def build(files: list[SourceFile], categories: dict[str, Category], sources: dict, encoder: Encoder) -> tuple[list[Chunk], dict]:
    chunks, outlines, records_index, reused_files = [], {}, {}, 0
    builder_hash = sha256(Path(__file__).read_bytes())
    for source in files:
        if not source.eligible:
            continue
        category = categories[source.category]
        prepared, reused = prepare_file(source, category, sources, encoder, builder_hash)
        reused_files += int(reused)
        if prepared.headings:
            outlines[source.doc_id] = prepared.headings
        records_index.update(prepared.lookup)
        chunks.extend(prepared.chunks)
    if not chunks:
        raise ValueError('No public verified data: refusing an empty upload or bulk deletion')
    if len({c.id for c in chunks}) != len(chunks):
        raise ValueError('Duplicate vector ids')
    winners = deduplicate(chunks)
    by_slug: dict[str, list[str]] = defaultdict(list)
    for key, value in records_index.items():
        by_slug[value['record_slug']].append(key)
    processed_root.mkdir(parents=True, exist_ok=True)
    # Keep every local passage and citation, even when only one duplicate is uploaded.
    (processed_root / 'chunks.jsonl').write_text(''.join(c.model_dump_json() + '\n' for c in chunks), encoding='utf-8', newline='\n')
    write_json(processed_root / 'outlines.json', outlines)
    write_json(processed_root / 'records_index.json', {'records': records_index, 'by_slug': by_slug})
    summary = {'files': len(files), 'eligible_files': sum(f.eligible for f in files), 'reused_file_chunks': reused_files,
               'excluded_files': [f.path for f in files if not f.eligible], 'records': len(records_index),
               'local_entries': len(chunks), 'upload_entries': len(winners),
               'max_tokens': max(c.token_count for c in chunks),
               'namespaces': dict(sorted((name, sum(c.namespace == name for c in winners)) for name in {c.namespace for c in winners}))}
    write_json(processed_root / 'build_summary.json', summary)
    return winners, summary
