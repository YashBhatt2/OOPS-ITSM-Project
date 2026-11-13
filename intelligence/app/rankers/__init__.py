from app.rankers.base import Ranker, ScoredCandidate
from app.rankers.overlap import OverlapRanker
from app.rankers.tfidf import TfidfRanker


def build_ranker(name: str) -> Ranker:
    return {"tfidf": TfidfRanker, "overlap": OverlapRanker}[name]()


__all__ = ["Ranker", "ScoredCandidate", "OverlapRanker", "TfidfRanker", "build_ranker"]
