"""Runtime settings loaded from environment variables and the repo-root .env file (keys are never logged)."""

import secrets
from pathlib import Path
from typing import Literal

from pydantic import SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=REPO_ROOT / ".env", extra="ignore")

    # live = call providers, mock = canned outputs, cache = replay from disk and call live only on a miss.
    llm_mode: Literal["live", "mock", "cache"] = "cache"
    groq_api_key: SecretStr | None = None
    gemini_api_key: SecretStr | None = None
    groq_base_url: str = "https://api.groq.com/openai/v1"
    gemini_base_url: str = "https://generativelanguage.googleapis.com/v1beta/openai/"
    primary_model: str = "openai/gpt-oss-120b"
    fallback_model: str = "gemini-3.8-flash"
    llm_timeout_s: float = 20.0
    llm_max_tokens: int = 900
    llm_synth_max_tokens: int = 1800  # Markdown answer + follow-ups + the reasoning model's own thinking tokens
    max_llm_calls_per_request: int = 8
    max_llm_calls_per_process: int = 300

    jwt_secret: SecretStr = SecretStr("")
    jwt_ttl_minutes: int = 120
    rate_limit_per_minute: int = 20
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:5173"]
    session_history_turns: int = 6
    max_message_chars: int = 2000
    freshness_days: int = 120

    academic_year: str = "2026-2027"
    default_term: Literal["Fall 2026", "Spring 2027"] = "Spring 2027"  # next registration term on 2026-11-14
    # auto = pinecone when processed/ artifacts, model and key are present, otherwise stub with a logged reason.
    retrieval_backend: Literal["stub", "pinecone", "auto"] = "auto"
    retrieval_strategy: Literal["hybrid", "hybrid_outline"] = "hybrid"
    retrieval_candidates: int = 20
    retrieval_top_n: int = 5
    # Tuned on golden queries (evaluation/retrieval_eval_report.json, 2026-11-14): dense-only MRR 0.915 vs hybrid 0.773,
    # because unnormalized BM25 query weights swamp cosine scores. Exact codes/ids are served by the structured route.
    retrieval_alpha: float = 1.0
    retrieval_keyword_alpha: float = 1.0
    retrieval_min_score: float | None = 0.62  # cosine; answers 97% of golden positives, abstains on 20% of negatives
    retrieval_max_query_chars: int = 500
    retrieval_timeout_s: float = 2.5
    retrieval_breaker_failures: int = 3
    retrieval_breaker_open_s: float = 30.0
    retrieval_cache_ttl_s: int = 300
    # none = score order; heuristic MRR 0.769 vs raw 0.773; hosted +0.014 MRR on 34 semantic queries (quota-limited)
    retrieval_reranker: Literal["none", "heuristic", "pinecone"] = "none"
    max_tool_calls_per_agent: int = 3
    max_cards: int = 10
    data_root: Path = REPO_ROOT / "local_database"
    llm_cache_dir: Path = REPO_ROOT / "backend" / ".llm_cache"

    @field_validator("jwt_secret")
    @classmethod
    def _strong_secret(cls, value: SecretStr) -> SecretStr:
        # HS256 needs >= 32 bytes; without a configured secret, use a random per-process one (mock auth only).
        return value if len(value.get_secret_value()) >= 32 else SecretStr(secrets.token_urlsafe(48))

    @field_validator("groq_api_key", "gemini_api_key")
    @classmethod
    def _empty_is_none(cls, value: SecretStr | None) -> SecretStr | None:
        return value if value and value.get_secret_value().strip() else None


settings = Settings()
