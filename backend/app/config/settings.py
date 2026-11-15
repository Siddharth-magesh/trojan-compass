"""Runtime settings loaded from environment variables and the repo-root .env file (keys are never logged)."""

from pathlib import Path
from typing import Literal

from pydantic import SecretStr
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
    max_llm_calls_per_request: int = 8
    max_llm_calls_per_process: int = 300

    jwt_secret: SecretStr = SecretStr("dev-only-not-a-secret")
    jwt_ttl_minutes: int = 120
    rate_limit_per_minute: int = 20
    session_history_turns: int = 6
    max_message_chars: int = 2000
    freshness_days: int = 120

    academic_year: str = "2026-2027"
    default_term: Literal["Fall 2026", "Spring 2027"] = "Spring 2027"  # next registration term on 2026-11-14
    retrieval_backend: Literal["stub", "pinecone"] = "stub"
    max_tool_calls_per_agent: int = 3
    max_cards: int = 10
    data_root: Path = REPO_ROOT / "local_database"
    llm_cache_dir: Path = REPO_ROOT / "backend" / ".llm_cache"


settings = Settings()
