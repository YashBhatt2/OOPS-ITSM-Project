"""TF-IDF ranker (scikit-learn): word 1-2 grams + character 3-5 grams, cosine similarity.

Vectorizers are fitted per request on the query and the supplied candidates (optionally plus a
fixed background corpus that stabilises IDF weights when few candidates are sent). Terms that every
candidate shares, such as the service name, therefore carry little weight.
"""

from collections.abc import Sequence

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.rankers.base import Ranker, ScoredCandidate
from app.schemas import Candidate, Query, ResolutionCandidate
from app.text import tokens

WORD_WEIGHT = 0.6
CHAR_WEIGHT = 0.4
CATEGORY_WEIGHT = 0.1
PROBLEM_WEIGHT = 0.8  # resolutions: remainder compares the query with the resolution text


def problem_text(item: Query) -> str:
    """Normalised content words; the title is counted twice because it carries the most signal."""
    return " ".join(tokens(item.title) * 2 + tokens(item.description))


def _word_vectorizer() -> TfidfVectorizer:
    # Input is already normalised and tokenised by app.text, so split on whitespace only.
    return TfidfVectorizer(analyzer="word", token_pattern=r"\S+", lowercase=False,
                           ngram_range=(1, 2), sublinear_tf=True)


def _char_vectorizer() -> TfidfVectorizer:
    return TfidfVectorizer(analyzer="char_wb", lowercase=False, ngram_range=(3, 5), sublinear_tf=True)


def _similarities(vectorizer: TfidfVectorizer, texts: list[str], background: Sequence[str]):
    """Fit on texts + background, return (query-vs-rest cosine, matrix of the request texts)."""
    try:
        vectorizer.fit(list(texts) + list(background))
    except ValueError:  # empty vocabulary: every text was blank or punctuation only
        return np.zeros(len(texts) - 1), None
    matrix = vectorizer.transform(texts)
    return cosine_similarity(matrix[0], matrix[1:]).ravel(), matrix


def _explain(vectorizer: TfidfVectorizer, matrix, row: int) -> str | None:
    """Up to three shared single words, ranked by the product of their TF-IDF weights."""
    if matrix is None:
        return None
    product = matrix[0].multiply(matrix[row]).tocoo()
    names = vectorizer.get_feature_names_out()
    ranked = sorted(zip(product.col, product.data, strict=True), key=lambda p: (-p[1], names[p[0]]))
    words = [names[c] for c, _ in ranked if " " not in names[c]][:3]
    return f"Shared terms: {', '.join(words)}" if words else None


class TfidfRanker(Ranker):
    def __init__(self, background: Sequence[str] = ()):
        # Optional fixed corpus mixed into IDF fitting. Evaluated; it did not help on the synthetic
        # set, so the service runs without it.
        self._background = tuple(" ".join(tokens(t)) for t in background)

    @property
    def model_version(self) -> str:
        bg = "+bg" if self._background else ""
        return f"tfidf-wc-v1{bg}"

    def _text_scores(self, query: Query, candidates: Sequence[Query]):
        texts = [problem_text(query)] + [problem_text(c) for c in candidates]
        word_vec = _word_vectorizer()
        word, word_matrix = _similarities(word_vec, texts, self._background)
        char, _ = _similarities(_char_vectorizer(), texts, self._background)
        explanations = [_explain(word_vec, word_matrix, i + 1) for i in range(len(candidates))]
        return WORD_WEIGHT * word + CHAR_WEIGHT * char, explanations

    def score_duplicates(self, query: Query, candidates: list[Candidate]) -> list[ScoredCandidate]:
        text, explanations = self._text_scores(query, candidates)
        out = []
        for c, sim, why in zip(candidates, text, explanations, strict=True):
            same_category = c.category_id == query.category_id and sim > 0
            score = (1 - CATEGORY_WEIGHT) * sim + CATEGORY_WEIGHT * same_category
            out.append(ScoredCandidate(c.incident_id, float(score), why))
        return out

    def score_resolutions(
        self, query: Query, candidates: list[ResolutionCandidate]
    ) -> list[ScoredCandidate]:
        problem, explanations = self._text_scores(query, candidates)
        fixes = [problem_text(query)] + [" ".join(tokens(c.resolution_text)) for c in candidates]
        fix, _ = _similarities(_word_vectorizer(), fixes, self._background)
        scores = PROBLEM_WEIGHT * problem + (1 - PROBLEM_WEIGHT) * fix
        return [
            ScoredCandidate(c.incident_id, float(s), why)
            for c, s, why in zip(candidates, scores, explanations, strict=True)
        ]
