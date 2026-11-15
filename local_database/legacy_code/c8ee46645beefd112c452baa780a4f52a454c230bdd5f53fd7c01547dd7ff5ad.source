"""Fetch the pinned BGE tokenizer once; validation and chunk building remain offline."""

import hashlib
from urllib.request import urlopen

from dataset_io import database_root

tokenizer_url = "https://huggingface.co/BAAI/bge-small-en-v1.5/resolve/main/tokenizer.json"
tokenizer_sha256 = "d241a60d5e8f04cc1b2b3e9ef7a4921b27bf526d9f6050ab90f9267a1f9e5c66"


def prepare_tokenizer() -> None:
    path = database_root / "processed/tokenizer.json"
    content = path.read_bytes() if path.exists() else urlopen(tokenizer_url, timeout=30).read()
    if hashlib.sha256(content).hexdigest() != tokenizer_sha256:
        raise ValueError("Tokenizer changed; review and update the pin before ingestion")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)
    print("BGE tokenizer verified locally")


if __name__ == "__main__":
    prepare_tokenizer()
