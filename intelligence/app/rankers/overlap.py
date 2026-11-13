"""Day-1 baseline: weighted token overlap. Dependency-free and deterministic, so the HTTP
contract can be integrated and tested before the scikit-learn TF-IDF ranker replaces it."""

from collections import Counter

from app.rankers.base import Ranker, ScoredCandidate
from app.schemas import Candidate, Query, ResolutionCandidate
from app.text import tokens

_CATEGORY_WEIGHT = 0.1


def _problem_tokens(item: Query) -> Counter[str]:
    # Title counted twice: titles carry the most signal.
    return Counter(tokens(item.title) * 2 + tokens(item.description))


def _overlap(a: Counter[str], b: Counter[str]) -> float:
    """Weighted Jaccard (sum of minimums over sum of maximums), in [0, 1]."""
    keys = a.keys() | b.keys()
    if not keys:
        return 0.0
    high = sum(max(a[k], b[k]) for k in keys)
    return sum(min(a[k], b[k]) for k in keys) / high


def _explain(a: Counter[str], b: Counter[str]) -> str | None:
    shared = sorted(a.keys() & b.keys(), key=lambda k: (-(a[k] + b[k]), k))[:3]
    return f"Shared terms: {', '.join(shared)}" if shared else None


class OverlapRanker(Ranker):
    @property
    def model_version(self) -> str:
        return "overlap-baseline-v1"

    def score_duplicates(self, query: Query, candidates: list[Candidate]) -> list[ScoredCandidate]:
        q = _problem_tokens(query)
        out = []
        for c in candidates:
            ct = _problem_tokens(c)
            text = _overlap(q, ct)
            same_category = 1.0 if c.category_id == query.category_id else 0.0
            score = (1 - _CATEGORY_WEIGHT) * text + _CATEGORY_WEIGHT * same_category * (text > 0)
            out.append(ScoredCandidate(c.incident_id, score, _explain(q, ct)))
        return out

    def score_resolutions(
        self, query: Query, candidates: list[ResolutionCandidate]
    ) -> list[ScoredCandidate]:
        q = _problem_tokens(query)
        out = []
        for c in candidates:
            ct = _problem_tokens(c)
            problem = _overlap(q, ct)
            fix = _overlap(q, Counter(tokens(c.resolution_text)))
            out.append(ScoredCandidate(c.incident_id, 0.8 * problem + 0.2 * fix, _explain(q, ct)))
        return out
