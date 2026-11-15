"""Shared configuration and validated boundaries for the local ingestion pipeline."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, JsonValue, RootModel

repo_root = Path(__file__).resolve().parents[2]
database_root = repo_root / 'local_database'
processed_root = database_root / 'processed'
model_name = 'BAAI/bge-small-en-v1.5'
model_revision = '5c38ec7c405ec4b44b94cc5a9bb96e735b38267a'
pipeline_version = 'pinecone_ingestion_1'
target_tokens, max_tokens, overlap_tokens = 350, 450, 50
query_prefix = 'Represent this sentence for searching relevant passages: '
MetadataValue = str | int | float | bool | list[str]


class JsonObject(RootModel[dict[str, JsonValue]]):
    """Retain all fields while validating the JSON input boundary."""


class FileMeta(BaseModel):
    model_config = ConfigDict(extra='allow')
    title: str
    summary: str = ''
    source_name: str
    source_url: str
    collected_by: str
    collected_date: str
    last_verified_date: str
    academic_year: str
    version: int = Field(ge=1)
    status: Literal['draft', 'verified', 'deprecated']
    data_origin: Literal['public_copy', 'synthetic']
    access_level: Literal['public', 'synthetic_private']
    audience: list[str]
    tags: list[str]


class Category(BaseModel):
    model_config = ConfigDict(extra='forbid')
    domain: str
    file_type: Literal['document', 'records']
    schema_name: str = Field(default='', alias='schema')
    id_field: str = ''
    search_template: str = ''
    filter_fields: list[str] = Field(default_factory=list)


class SourceFile(BaseModel):
    path: str
    sha256: str
    doc_id: str
    domain: str
    category: str
    meta: FileMeta
    records: list[dict[str, JsonValue]] = Field(default_factory=list)
    body: str = ''

    @property
    def eligible(self) -> bool:
        return self.meta.status == 'verified' and self.meta.access_level == 'public'


class Chunk(BaseModel):
    id: str
    namespace: str
    doc_id: str
    source_path: str
    text: str
    embedded_text: str
    chunk_hash: str
    token_count: int = Field(ge=1, le=max_tokens)
    metadata: dict[str, MetadataValue]
    source_urls: list[str]
    also_in: list[str] = Field(default_factory=list)
    prev_id: str = ''
    next_id: str = ''


class SparseVector(BaseModel):
    indices: list[int]
    values: list[float]


class VectorPayload(BaseModel):
    id: str = Field(max_length=512)
    values: list[float] = Field(min_length=384, max_length=384)
    sparse_values: SparseVector
    metadata: dict[str, MetadataValue]


def sha256(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def read_json(path: Path) -> dict[str, JsonValue]:
    return JsonObject.model_validate_json(path.read_text(encoding='utf-8-sig')).root


def json_bytes(value: object) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'), allow_nan=False).encode('utf-8')


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + '\n', encoding='utf-8', newline='\n')
    temporary.replace(path)
