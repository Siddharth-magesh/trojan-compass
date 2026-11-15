"""Pinned BGE-small ONNX embeddings, tokenizer limits and content-addressed vector cache."""

from __future__ import annotations

from pathlib import Path
from urllib.request import urlopen

import numpy as np
import onnxruntime as ort
from tokenizers import Tokenizer

from ingestion_models import model_name, model_revision, processed_root, read_json, sha256, write_json

model_files = {
    'tokenizer.json': ('tokenizer.json', 'd241a60d5e8f04cc1b2b3e9ef7a4921b27bf526d9f6050ab90f9267a1f9e5c66'),
    'model.onnx': ('onnx/model.onnx', '828e1496d7fabb79cfa4dcd84fa38625c0d3d21da474a00f08db0f559940cf35'),
}


def prepare_model() -> Path:
    folder = processed_root / 'model'
    folder.mkdir(parents=True, exist_ok=True)
    for name, (remote_path, expected) in model_files.items():
        path = folder / name
        if not path.exists():
            temporary = path.with_suffix(path.suffix + '.download')
            url = f'https://huggingface.co/{model_name}/resolve/{model_revision}/{remote_path}'
            print(f'Downloading pinned embedding artifact: {name}', flush=True)
            with urlopen(url, timeout=60) as response, temporary.open('wb') as output:
                while block := response.read(1024 * 1024):
                    output.write(block)
            if sha256(temporary.read_bytes()) != expected:
                raise ValueError(f'Model checksum mismatch: {name}')
            temporary.replace(path)
        if sha256(path.read_bytes()) != expected:
            raise ValueError(f'Model checksum mismatch: {name}')
    return folder


class Encoder:
    def __init__(self, folder: Path) -> None:
        self.folder = folder
        self.tokenizer = Tokenizer.from_file(str(folder / 'tokenizer.json'))
        self.tokenizer.no_truncation()
        self.tokenizer.no_padding()
        self.session: ort.InferenceSession | None = None

    def token_count(self, text: str) -> int:
        return len(self.tokenizer.encode(text).ids)

    def encode(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        encodings = self.tokenizer.encode_batch(texts)
        if any(len(item.ids) > 512 for item in encodings):
            raise ValueError('Embedding input exceeds 512 tokens; truncation is prohibited')
        if self.session is None:
            options = ort.SessionOptions()
            options.intra_op_num_threads = 4
            self.session = ort.InferenceSession(str(self.folder / 'model.onnx'), sess_options=options,
                                               providers=['CPUExecutionProvider'])
        width = max(len(item.ids) for item in encodings)
        arrays = {name: np.zeros((len(texts), width), dtype=np.int64)
                  for name in ['input_ids', 'attention_mask', 'token_type_ids']}
        for position, item in enumerate(encodings):
            arrays['input_ids'][position, :len(item.ids)] = item.ids
            arrays['attention_mask'][position, :len(item.ids)] = 1
            arrays['token_type_ids'][position, :len(item.ids)] = item.type_ids
        inputs = {item.name: arrays[item.name] for item in self.session.get_inputs()}
        output = self.session.run(None, inputs)[0]
        # BGE uses the CLS token, not mean pooling; normalize for hybrid dot-product search.
        vectors = output[:, 0, :] if output.ndim == 3 else output
        vectors = vectors / np.linalg.norm(vectors, axis=1, keepdims=True)
        if vectors.shape[1] != 384 or not np.isfinite(vectors).all():
            raise ValueError('Invalid BGE embedding output')
        return vectors.tolist()

    def cached_passages(self, texts: list[str]) -> dict[str, list[float]]:
        vectors: dict[str, list[float]] = {}
        missing = []
        folder = processed_root / 'embedding_cache' / model_revision
        for text in dict.fromkeys(texts):
            key = sha256((model_name + '\n' + text).encode('utf-8'))
            path = folder / f'{key}.json'
            if path.exists():
                row = read_json(path)
                if row['model'] != model_name or row['text_hash'] != sha256(text.encode('utf-8')):
                    raise ValueError('Embedding cache identity mismatch')
                vectors[text] = row['values']
            else:
                missing.append((text, path))
        for offset in range(0, len(missing), 32):
            batch = missing[offset:offset + 32]
            for (text, path), values in zip(batch, self.encode([t for t, _ in batch]), strict=True):
                write_json(path, {'model': model_name, 'revision': model_revision,
                                 'text_hash': sha256(text.encode('utf-8')), 'values': values})
                vectors[text] = values
            print(f'Embedded {min(offset + 32, len(missing))}/{len(missing)} uncached passages', flush=True)
        return vectors
