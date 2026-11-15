"""Validate, embed, synchronize and verify the public USC dataset in Pinecone.
Use --dry-run for local preparation or --verify-only for remote checks without writes.
"""

from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone

from build_chunks import build
from embedding_runtime import Encoder, prepare_model
from ingestion_models import (json_bytes, model_name, model_revision, pipeline_version, processed_root,
                              repo_root, sha256, write_json)
from pinecone_store import connect, inspect_remote, payloads, synchronize, verify_remote
from query_store import exact_lookup, hybrid_query
from source_data import load_dataset
from sparse_encoder import fit_or_load


def smoke_queries(index: object, encoder: Encoder, bm25: object) -> list[dict]:
    checks = [('academic', 'What are the prerequisites for CSCI 104?', 'csci_104', 0.25),
              ('career', 'F-1 on-campus employment weekly hours limit', 'usc_ois', 0.25),
              ('student_services', 'How do I pay my tuition bill using USCe.pay?', 'epay', 0.75)]
    results = []
    for domain, query, expected, alpha in checks:
        matches = hybrid_query(index, encoder, bm25, query, domain, alpha=alpha)
        matched = any(expected in (m['id'] + ' ' + m['metadata'].get('text', '')).lower() for m in matches[:5])
        if not matched:
            raise RuntimeError(f'Realistic search failed to retrieve the expected source in top five: {domain}')
        results.append({'domain': domain, 'query': query, 'expected_source_in_top_5': matched,
                        'top_ids': [m['id'] for m in matches[:5]]})
    exact = exact_lookup('CSCI 104')
    if not exact or exact[0]['record']['course_id'] != 'CSCI 104':
        raise RuntimeError('Full-record exact lookup failed')
    return results


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--index', default='trojan-compass')
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--dry-run', action='store_true')
    mode.add_argument('--verify-only', action='store_true')
    parser.add_argument('--refit', action='store_true', help='Refit BM25 on the complete eligible corpus')
    args = parser.parse_args()
    if not re.fullmatch(r'[a-z0-9](?:[a-z0-9-]{0,43}[a-z0-9])?', args.index):
        raise ValueError('Pinecone index names require lowercase letters, digits and hyphens')
    encoder = Encoder(prepare_model())
    files, categories, sources = load_dataset()
    chunks, summary = build(files, categories, sources, encoder)
    print(json.dumps({key: value for key, value in summary.items() if key != 'excluded_files'}), flush=True)
    if args.dry_run:
        print('Dry run passed; no embedding computation or Pinecone access performed.')
        return
    bm25, refitted = fit_or_load([c.embedded_text for c in chunks], args.refit)
    dense = encoder.cached_passages([c.embedded_text for c in chunks])
    desired = payloads(chunks, dense, bm25)
    if any(sha256((repo_root / source.path).read_bytes()) != source.sha256 for source in files):
        raise ValueError('Source data changed during preparation; rerun ingestion')
    index, description = connect(args.index, create=not args.verify_only)
    namespaces = {'academic', 'career', 'student_services', 'housing'}
    changes = {'upserted': 0, 'unchanged': 0, 'deleted_owned_stale': 0}
    if not args.verify_only:
        remote = inspect_remote(index, namespaces)
        changes = synchronize(index, desired, remote)
    verification = verify_remote(index, desired, namespaces)
    searches = smoke_queries(index, encoder, bm25)
    manifest = {'pipeline_version': pipeline_version, 'index_name': args.index, 'index_host': description['host'],
                'embed_model': model_name, 'model_revision': model_revision, 'dimension': 384,
                'metric': 'dotproduct', 'bm25_hash': bm25.fingerprint(), 'bm25_refitted': refitted,
                'chunker': {'target_tokens': 350, 'hard_cap_tokens': 450, 'overlap_tokens': 50},
                'registry_hash': sha256(json_bytes({name: cat.model_dump() for name, cat in categories.items()})),
                'files': [{'path': f.path, 'sha256': f.sha256, 'version': f.meta.version, 'eligible': f.eligible,
                           'vector_ids': [c.id for c in chunks if c.doc_id == f.doc_id]} for f in files],
                'vector_ids': {name: [v.id for v in values] for name, values in desired.items()},
                'verified_at_utc': datetime.now(timezone.utc).isoformat()}
    report = {'ready': True, 'index_name': args.index, 'build': summary, 'changes': changes,
              'verification': verification, 'search_checks': searches, 'student_profiles_uploaded': False}
    write_json(processed_root / 'manifest.json', manifest)
    write_json(processed_root / 'upload_report.json', report)
    print(json.dumps({'ready': True, 'index': args.index, 'vectors': verification['verified_vectors'],
                      'namespaces': verification['namespaces'], 'changes': changes,
                      'search_checks_passed': len(searches), 'report': str(processed_root / 'upload_report.json')}))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        # Do not print SDK request objects or headers, which may contain credentials.
        message = str(error) if isinstance(error, (ValueError, RuntimeError, TimeoutError)) else type(error).__name__
        print(f'Ingestion did not finish: {message}')
        raise SystemExit(1)
