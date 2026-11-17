"""Wire contract shared with the Spring Boot IntelligenceClient (schemaVersion "1").

JSON uses camelCase; Python code uses snake_case. See README.md "Integrate the Python
intelligence service" and docs/phase-1/intelligence.md.
"""

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

SCHEMA_VERSION = "1"
MAX_CANDIDATES = 100
MAX_RESULTS = 5


class ApiModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class Query(ApiModel):
    title: str = Field(max_length=200)
    description: str = Field(max_length=10_000)
    service_id: UUID
    category_id: UUID


class Candidate(Query):
    incident_id: UUID


class ResolutionCandidate(Candidate):
    resolution_text: str = Field(max_length=20_000)


class _RankRequest(ApiModel):
    request_id: str = Field(min_length=1, max_length=100)
    schema_version: Literal["1"]
    query: Query
    limit: int = Field(default=MAX_RESULTS, ge=1, le=MAX_RESULTS)


class DuplicateRankRequest(_RankRequest):
    candidates: list[Candidate] = Field(max_length=MAX_CANDIDATES)


class ResolutionRankRequest(_RankRequest):
    candidates: list[ResolutionCandidate] = Field(max_length=MAX_CANDIDATES)


class Match(ApiModel):
    incident_id: UUID
    similarity_score: float = Field(ge=0.0, le=1.0, allow_inf_nan=False)
    explanation: str | None = Field(default=None, max_length=200)


class RankResponse(ApiModel):
    request_id: str
    schema_version: Literal["1"] = SCHEMA_VERSION
    model_version: str
    results: list[Match] = Field(max_length=MAX_RESULTS)
