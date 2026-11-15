"""Create a compatible index, synchronize owned vectors, and verify remote contents."""

from __future__ import annotations

import time
from collections import defaultdict
from typing import Iterable

import numpy as np
from dotenv import dotenv_values
from pinecone import FetchResponse, Pinecone, ServerlessSpec

from ingestion_models import Chunk, VectorPayload, json_bytes, repo_root, sha256
from sparse_encoder import Bm25


def response_dict(response: FetchResponse) -> dict:
    return {'vectors': {key: vector.to_dict() for key, vector in response.vectors.items()}}


def connect(index_name: str, create: bool = False) -> tuple[object, dict]:
    secret = dotenv_values(repo_root / '.env').get('PINECONE_API_KEY')
    if not secret:
        raise ValueError('PINECONE_API_KEY is missing from the local .env file')
    client = Pinecone(api_key=secret)
    if index_name not in client.list_indexes().names():
        if not create:
            raise ValueError(f'Index does not exist: {index_name}')
        client.create_index(name=index_name, dimension=384, metric='dotproduct',
                            spec=ServerlessSpec(cloud='aws', region='us-east-1'),
                            deletion_protection='enabled', tags={'dataset': 'trojan_compass'})
    deadline = time.monotonic() + 180
    while True:
        description = client.describe_index(index_name).to_dict()
        if description['dimension'] != 384 or description['metric'] != 'dotproduct':
            raise ValueError('Existing index is incompatible; it will not be modified or recreated')
        if description['status']['ready']:
            return client.Index(host=description['host']), description
        if time.monotonic() > deadline:
            raise TimeoutError('Pinecone index did not become ready within 180 seconds')
        time.sleep(2)


def payloads(chunks: list[Chunk], dense: dict[str, list[float]], bm25: Bm25) -> dict[str, list[VectorPayload]]:
    result: dict[str, list[VectorPayload]] = defaultdict(list)
    bm25_hash = bm25.fingerprint()
    for chunk in chunks:
        metadata = {**chunk.metadata, 'bm25_hash': bm25_hash}
        signature = sha256(json_bytes({'metadata': metadata, 'text': chunk.embedded_text}))
        metadata['payload_hash'] = signature
        vector = VectorPayload(id=chunk.id, values=dense[chunk.embedded_text],
                               sparse_values=bm25.encode(chunk.embedded_text), metadata=metadata)
        if not vector.sparse_values.indices or len(vector.sparse_values.indices) > 2048:
            raise ValueError(f'Invalid sparse vector size: {vector.id}')
        if abs(float(np.linalg.norm(vector.values)) - 1.0) > 0.0001:
            raise ValueError(f'Dense vector is not normalized: {vector.id}')
        if len(json_bytes(metadata)) >= 40000:
            raise ValueError(f'Vector metadata exceeds 40 KB: {vector.id}')
        result[chunk.namespace].append(vector)
    return dict(result)


def batches(values: list, size: int = 100) -> Iterable[list]:
    for offset in range(0, len(values), size):
        yield values[offset:offset + size]


def inspect_remote(index: object, namespaces: set[str]) -> dict[str, dict]:
    result = {}
    for namespace in sorted(namespaces):
        remote = {}
        for ids in index.list(namespace=namespace):
            for batch in batches(ids):
                fetched = response_dict(index.fetch(ids=batch, namespace=namespace))['vectors']
                remote.update(fetched)
        result[namespace] = remote
    return result


def synchronize(index: object, desired: dict[str, list[VectorPayload]], remote: dict[str, dict]) -> dict:
    changed, skipped, removed = 0, 0, 0
    for namespace, vectors in desired.items():
        pending = []
        for vector in vectors:
            old = remote.get(namespace, {}).get(vector.id)
            if old and old.get('metadata', {}).get('dataset_id') != 'trojan_compass':
                raise ValueError(f'Refusing to overwrite a vector owned by another dataset: {vector.id}')
            if old and matches_payload(old, vector):
                skipped += 1
            else:
                pending.append(vector.model_dump())
        for batch in batches(pending):
            if len(json_bytes(batch)) >= 1_900_000:
                raise ValueError('Upsert batch exceeds the safe request size')
            response = index.upsert(vectors=batch, namespace=namespace)
            if response.upserted_count != len(batch):
                raise RuntimeError('Pinecone acknowledged an incomplete upsert batch')
            changed += len(batch)
            print(f'Uploaded {changed} changed vectors; namespace={namespace}', flush=True)
    # Delete only this dataset's obsolete vectors, after all new writes succeeded.
    for namespace, rows in remote.items():
        wanted = {v.id for v in desired.get(namespace, [])}
        stale = [key for key, row in rows.items() if key not in wanted and
                 row.get('metadata', {}).get('dataset_id') == 'trojan_compass']
        for batch in batches(stale):
            index.delete(ids=batch, namespace=namespace)
            removed += len(batch)
    return {'upserted': changed, 'unchanged': skipped, 'deleted_owned_stale': removed}


def matches_payload(remote: dict, expected: VectorPayload) -> bool:
    if remote.get('metadata') != expected.metadata:
        return False
    dense = remote.get('values', [])
    sparse = remote.get('sparse_values', {})
    return (len(dense) == 384 and np.allclose(dense, expected.values, rtol=1e-5, atol=1e-6) and
            sparse.get('indices') == expected.sparse_values.indices and
            len(sparse.get('values', [])) == len(expected.sparse_values.values) and
            np.allclose(sparse['values'], expected.sparse_values.values, rtol=1e-5, atol=1e-6))


def verify_remote(index: object, desired: dict[str, list[VectorPayload]], namespaces: set[str]) -> dict:
    deadline = time.monotonic() + 180
    while True:
        missing, mismatched = [], []
        for namespace, vectors in desired.items():
            for batch in batches(vectors):
                fetched = response_dict(index.fetch(ids=[v.id for v in batch], namespace=namespace))['vectors']
                for vector in batch:
                    if vector.id not in fetched:
                        missing.append(vector.id)
                    elif not matches_payload(fetched[vector.id], vector):
                        mismatched.append(vector.id)
        if not missing and not mismatched:
            remote = inspect_remote(index, namespaces)
            owned = {name: {key for key, row in rows.items() if row.get('metadata', {}).get('dataset_id') == 'trojan_compass'}
                     for name, rows in remote.items()}
            wanted = {name: {v.id for v in desired.get(name, [])} for name in namespaces}
            if owned == wanted:
                stats = index.describe_index_stats().to_dict()
                return {'all_dense_sparse_metadata_verified': True, 'owned_ids_exact_match': True,
                        'verified_vectors': sum(len(v) for v in desired.values()),
                        'namespaces': {name: len(values) for name, values in sorted(owned.items()) if values},
                        'pinecone_stats': stats}
        if time.monotonic() > deadline:
            raise RuntimeError(f'Remote verification timed out: {len(missing)} missing, {len(mismatched)} mismatched')
        time.sleep(3)
