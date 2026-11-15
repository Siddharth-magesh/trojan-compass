"""Shared helpers for the data pipeline: paths, registry loading, file parsing, ids, tokens and sectioning.
Used by validate_data.py, build_chunks.py, push_to_pinecone.py and eval_retrieval.py."""

import json
import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
PROCESSED_DIR = ROOT / "processed"
REPO_ROOT = ROOT.parent

EMBED_MODEL = "BAAI/bge-small-en-v1.5"
QUERY_PREFIX = "Represent this sentence for searching relevant passages: "
TARGET_TOKENS = 350
CAP_TOKENS = 450
OVERLAP_TOKENS = 50
# Bump when chunking or templates change: forces a full rebuild and re-push.
PIPELINE_VERSION = 1
AUTHORITY_RANK = {"official": 3, "third_party": 2, "synthetic": 1}


@dataclass(frozen=True)
class DataFile:
    path: Path
    domain: str
    category: str

    @property
    def stem(self) -> str:
        return self.path.stem

    @property
    def doc_id(self) -> str:
        return f"{self.domain}.{self.category}.{self.stem}"

    @property
    def rel(self) -> str:
        return str(self.path.relative_to(ROOT))


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def categories() -> dict:
    return load_json(ROOT / "registry" / "categories.json")


def sources() -> dict:
    return load_json(ROOT / "registry" / "sources.json")


def iter_data_files() -> list[DataFile]:
    files = []
    for path in sorted(DATA_DIR.glob("*/*/*")):
        if path.suffix in (".md", ".json"):
            files.append(DataFile(path, path.parent.parent.name, path.parent.name))
    return files


class _StringDateLoader(yaml.SafeLoader):
    """SafeLoader that keeps 2026-11-14 as a string; the guide stores dates as ISO strings and validates them itself."""


_StringDateLoader.yaml_implicit_resolvers = {
    ch: [(tag, rx) for tag, rx in resolvers if tag != "tag:yaml.org,2002:timestamp"]
    for ch, resolvers in yaml.SafeLoader.yaml_implicit_resolvers.items()
}


def parse_document(path: Path) -> tuple[dict, str]:
    """Split a markdown file into (front matter dict, body)."""
    text = path.read_text(encoding="utf-8")
    match = re.match(r"^---\n(.*?)\n---\n?(.*)$", text, re.S)
    if not match:
        raise ValueError("missing front matter block")
    meta = yaml.load(match.group(1), Loader=_StringDateLoader) or {}
    return meta, match.group(2)


def parse_records(path: Path) -> tuple[dict, list[dict]]:
    data = load_json(path)
    return data.get("meta", {}), data.get("records", [])


def record_slug(record_id: str) -> str:
    return str(record_id).strip().lower().replace(" ", "_")


@lru_cache(maxsize=1)
def _tokenizer():
    from transformers import AutoTokenizer

    return AutoTokenizer.from_pretrained(EMBED_MODEL)


def count_tokens(text: str) -> int:
    return len(_tokenizer().encode(text, add_special_tokens=False))


def split_sections(body: str, title: str) -> list[tuple[list[str], str]]:
    """Split a markdown body by headings into (section_path, text) pairs; the H1 is the document title."""
    sections: list[tuple[list[str], str]] = []
    path = [title]
    lines: list[str] = []

    def flush():
        text = "\n".join(lines).strip()
        if text:
            sections.append((list(path), text))
        lines.clear()

    for line in body.splitlines():
        heading = re.match(r"^(#{1,6})\s+(.*)$", line)
        if not heading:
            lines.append(line)
            continue
        flush()
        level, name = len(heading.group(1)), heading.group(2).strip()
        if level == 1:
            path = [name]
        else:
            path = path[: level - 1] + [name]
    flush()
    return sections


def embed_text(section_path: list[str], summary: str, text: str) -> str:
    """Text that is embedded for a section chunk: breadcrumb + summary + section text."""
    parts = [" > ".join(section_path)]
    if summary:
        parts.append(summary)
    parts.append(text)
    return "\n".join(parts)


def blocks_of(text: str) -> list[str]:
    """Paragraph blocks, with consecutive table rows or list items merged so they are never split."""
    blocks: list[str] = []
    for para in re.split(r"\n\s*\n", text.strip()):
        para = para.strip()
        if not para:
            continue
        if blocks and is_atomic(para) and is_atomic(blocks[-1]) and _same_kind(para, blocks[-1]):
            blocks[-1] = f"{blocks[-1]}\n\n{para}"
        else:
            blocks.append(para)
    return blocks


def is_atomic(block: str) -> bool:
    first = block.lstrip().splitlines()[0]
    return first.startswith("|") or bool(re.match(r"^(\d+[.)]|[-*+])\s", first))


def _same_kind(a: str, b: str) -> bool:
    return a.lstrip().startswith("|") == b.lstrip().startswith("|")
