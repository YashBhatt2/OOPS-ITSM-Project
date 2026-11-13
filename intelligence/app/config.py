"""Runtime settings, read from environment variables (or a local .env file)."""

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Shared secret with Spring Boot (INTELLIGENCE_TOKEN). Empty = no auth (local dev only).
    intelligence_token: str = ""
    # Results scoring below these are not returned. Defaults are the F1-best thresholds for the
    # TF-IDF ranker on the synthetic evaluation set (python -m scripts.evaluate).
    duplicate_min_score: float = Field(default=0.15, ge=0.0, le=1.0)
    resolution_min_score: float = Field(default=0.08, ge=0.0, le=1.0)
    # "tfidf" (default) or "overlap" (dependency-free baseline).
    ranker: Literal["tfidf", "overlap"] = "tfidf"
    # Expose /docs and /openapi.json only in development.
    enable_docs: bool = True


@lru_cache
def get_settings() -> Settings:
    return Settings()
