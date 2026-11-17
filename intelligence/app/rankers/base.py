"""Ranker abstraction (Strategy pattern): routes depend on this, not on a concrete model."""

import math
from abc import ABC, abstractmethod
from dataclasses import dataclass
from uuid import UUID

from app.schemas import MAX_RESULTS, Candidate, Match, Query, ResolutionCandidate


@dataclass(frozen=True)
class ScoredCandidate:
    incident_id: UUID
    score: float
    explanation: str | None = None


class Ranker(ABC):
    """Scores supplied candidates against a query. Implementations must be stateless per call."""

    @property
    @abstractmethod
    def model_version(self) -> str: ...

    @abstractmethod
    def score_duplicates(self, query: Query, candidates: list[Candidate]) -> list[ScoredCandidate]:
        """Return one score in [0, 1] per candidate, in candidate order."""

    @abstractmethod
    def score_resolutions(
        self, query: Query, candidates: list[ResolutionCandidate]
    ) -> list[ScoredCandidate]:
        """Return one score in [0, 1] per candidate, in candidate order."""

    def warm_up(self) -> None:
        """Load anything expensive before the first request (Spring times out after 2 s)."""
        return None


def select_top(scored: list[ScoredCandidate], limit: int, min_score: float) -> list[Match]:
    """Apply the contract rules: finite scores in [0, 1], unique IDs, above threshold,
    highest first (ties keep candidate order, i.e. most recent first), at most `limit` (<= 5)."""
    seen: set[UUID] = set()
    kept: list[tuple[int, ScoredCandidate]] = []
    for position, item in enumerate(scored):
        if item.incident_id in seen or not math.isfinite(item.score):
            continue
        seen.add(item.incident_id)
        score = round(min(max(item.score, 0.0), 1.0), 4)
        if score >= min_score and score > 0.0:
            kept.append((position, ScoredCandidate(item.incident_id, score, item.explanation)))
    kept.sort(key=lambda pair: (-pair[1].score, pair[0]))
    return [
        Match(
            incident_id=item.incident_id,
            similarity_score=item.score,
            explanation=(item.explanation or None) and item.explanation[:200],
        )
        for _, item in kept[: min(limit, MAX_RESULTS)]
    ]
