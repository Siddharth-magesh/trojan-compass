"""Read the registry-driven local dataset without network or private-platform access."""

import json
import re
from pathlib import Path

import yaml
from pydantic import JsonValue, TypeAdapter

from data_models import Category, Meta, RecordFile, Source

database_root = Path(__file__).resolve().parents[1]
json_adapter = TypeAdapter(dict[str, JsonValue])


def read_json(path: Path) -> dict[str, JsonValue]:
    return json_adapter.validate_json(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: JsonValue) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def registries() -> tuple[dict[str, Category], dict[str, Source]]:
    categories = read_json(database_root / "registry/categories.json")
    sources = read_json(database_root / "registry/sources.json")
    return ({key: Category.model_validate(value) for key, value in categories.items() if key != "_comment"},
            {key: Source.model_validate(value) for key, value in sources.items() if key != "_comment"})


def load_document(path: Path) -> tuple[Meta, str, dict[str, JsonValue]]:
    content = path.read_text(encoding="utf-8")
    if not content.startswith("---\n"):
        raise ValueError(f"{path}: missing front matter")
    _, header, body = content.split("---", 2)
    raw_meta = json_adapter.validate_python(yaml.safe_load(header))
    return Meta.model_validate(raw_meta), body.strip(), raw_meta


def load_records(path: Path) -> RecordFile:
    return RecordFile.model_validate(read_json(path))


def document_id(path: Path) -> str:
    relative = path.relative_to(database_root / "data")
    return ".".join(relative.with_suffix("").parts)


def record_slug(value: str) -> str:
    return value.lower().replace(" ", "_")


def sections(body: str) -> list[tuple[list[str], str]]:
    result: list[tuple[list[str], str]] = []
    headings: list[str] = []
    lines: list[str] = []
    for line in body.splitlines():
        match = re.match(r"^(#{1,6}) (.+)$", line)
        if match:
            if lines:
                result.append((headings.copy(), "\n".join(lines).strip()))
            level, title = len(match[1]), match[2]
            headings = headings[:level - 1] + [title]
            lines = []
        else:
            lines.append(line)
    if lines:
        result.append((headings.copy(), "\n".join(lines).strip()))
    return [(path, text) for path, text in result if text]


def record_text(record: dict[str, JsonValue], category: Category) -> str:
    values = {key: ", ".join(map(str, value)) if isinstance(value, list) else str(value)
              for key, value in record.items()}
    return category.search_template.format_map(values)
