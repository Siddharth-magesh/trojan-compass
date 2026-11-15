"""Public-only hybrid search and exact local record lookup for verification and reuse."""

from __future__ import annotations

import argparse
import json

from embedding_runtime import Encoder, prepare_model
from ingestion_models import processed_root, query_prefix, read_json, repo_root, sha256
from pinecone_store import connect
from sparse_encoder import Bm25


def public_filter(academic_year: str, bm25_hash: str) -> dict:
    return {'$and': [{'access_level': {'$eq': 'public'}}, {'dataset_id': {'$eq': 'trojan_compass'}},
                     {'academic_year': {'$eq': academic_year}}, {'bm25_hash': {'$eq': bm25_hash}}]}


def hybrid_query(index: object, encoder: Encoder, bm25: Bm25, query: str, domain: str,
                 academic_year: str = '2026-2027', alpha: float = 0.75, top_k: int = 20) -> list[dict]:
    dense = encoder.encode([query_prefix + query])[0]
    sparse = bm25.encode(query, query=True)
    arguments = {'namespace': domain, 'vector': [alpha * value for value in dense],
                 'top_k': top_k, 'include_metadata': True,
                 'filter': public_filter(academic_year, bm25.fingerprint())}
    if sparse.indices:
        arguments['sparse_vector'] = {'indices': sparse.indices, 'values': [(1 - alpha) * value for value in sparse.values]}
    return [{'id': match.id, 'score': match.score, 'metadata': match.metadata}
            for match in index.query(**arguments).matches]


def exact_lookup(record_id: str, academic_year: str = '2026-2027') -> list[dict]:
    lookup = read_json(processed_root / 'records_index.json')
    keys = lookup['by_slug'].get(record_id.lower().replace(' ', '_'), [])
    result = []
    for key in keys:
        location = lookup['records'][key]
        if location['academic_year'] != academic_year:
            continue
        path = (repo_root / location['file']).resolve()
        if not path.is_relative_to(repo_root / 'local_database/data'):
            raise ValueError('Lookup path escaped canonical data')
        if location.get('source_sha256') and sha256(path.read_bytes()) != location['source_sha256']:
            raise ValueError('Source changed after indexing; rerun ingestion before using this lookup')
        source = read_json(path)
        if source['meta']['access_level'] != 'public' or source['meta']['status'] != 'verified':
            continue
        if location.get('id_field') and source['records'][location['position']][location['id_field']] != location['record_id']:
            raise ValueError('Record lookup identity mismatch')
        result.append({'doc_id': location['doc_id'], 'source_url': source['meta']['source_url'],
                       'verified_date': source['meta']['last_verified_date'],
                       'record': source['records'][location['position']]})
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('query')
    parser.add_argument('--domain', choices=['academic', 'career', 'student_services', 'housing'], default='academic')
    parser.add_argument('--exact', action='store_true')
    parser.add_argument('--year', default='2026-2027')
    parser.add_argument('--keyword', action='store_true')
    args = parser.parse_args()
    if args.exact:
        result = exact_lookup(args.query, args.year)
    else:
        manifest = read_json(processed_root / 'manifest.json')
        bm25 = Bm25.model_validate(read_json(processed_root / 'bm25_params.json'))
        if manifest['bm25_hash'] != bm25.fingerprint():
            raise ValueError('BM25 state differs from the last verified upload; rerun ingestion')
        index, _ = connect(manifest['index_name'])
        result = hybrid_query(index, Encoder(prepare_model()), bm25, args.query, args.domain, args.year,
                              alpha=0.25 if args.keyword else 0.75)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
