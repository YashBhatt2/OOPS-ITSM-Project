from uuid import uuid4

from app.rankers import OverlapRanker
from app.rankers.base import ScoredCandidate, select_top
from app.schemas import Candidate, Query, ResolutionCandidate
from app.text import normalise, tokens

SERVICE, CATEGORY, OTHER_CATEGORY = uuid4(), uuid4(), uuid4()
ranker = OverlapRanker()


def query(title, description=""):
    return Query(title=title, description=description, service_id=SERVICE, category_id=CATEGORY)


def cand(title, description="", category=CATEGORY):
    return Candidate(incident_id=uuid4(), title=title, description=description,
                     service_id=SERVICE, category_id=category)


def scores(q, candidates):
    return [s.score for s in ranker.score_duplicates(q, candidates)]


def test_paraphrase_beats_unrelated():
    q = query("Cannot connect to VPN", "VPN connection drops when working from home")
    related, unrelated = scores(q, [
        cand("VPN not connecting", "Home VPN connection keeps dropping"),
        cand("Printer jam", "Paper stuck in the printer"),
    ])
    assert related > unrelated
    assert unrelated == 0.0


def test_synonyms_are_normalised():
    a, b = scores(query("Outlook pwd reset"), [cand("Email password reset"), cand("Monitor flicker")])
    assert a > 0.5 > b


def test_same_category_breaks_text_ties():
    same, other = scores(query("Wifi down"), [cand("Wifi down"), cand("Wifi down", category=OTHER_CATEGORY)])
    assert same > other


def test_scores_are_bounded_and_deterministic():
    q = query("Shared drive missing", "Mapped drive S: disappeared")
    candidates = [cand("Shared drive missing", "Mapped drive S: disappeared"), cand(""), cand("drive")]
    first = scores(q, candidates)
    assert first == scores(q, candidates)
    assert all(0.0 <= s <= 1.0 for s in first)
    assert first[0] == 1.0


def test_resolution_text_contributes():
    q = query("Error 0x80070005 installing update")
    with_fix, without_fix = ranker.score_resolutions(q, [
        ResolutionCandidate(incident_id=uuid4(), title="Update fails", description="", service_id=SERVICE,
                            category_id=CATEGORY, resolution_text="Fixed 0x80070005 by resetting permissions"),
        ResolutionCandidate(incident_id=uuid4(), title="Update fails", description="", service_id=SERVICE,
                            category_id=CATEGORY, resolution_text="Rebooted"),
    ])
    assert with_fix.score > without_fix.score


def test_explanation_lists_shared_terms():
    [result] = ranker.score_duplicates(query("Payment checkout failing"), [cand("Checkout payment error")])
    assert result.explanation.startswith("Shared terms:")
    assert "payment" in result.explanation and "checkout" in result.explanation


def test_select_top_filters_and_orders():
    a, b, c, d = uuid4(), uuid4(), uuid4(), uuid4()
    picked = select_top(
        [ScoredCandidate(a, 0.3), ScoredCandidate(b, 0.9), ScoredCandidate(c, 0.1),
         ScoredCandidate(d, float("nan")), ScoredCandidate(b, 0.95)],
        limit=5, min_score=0.25,
    )
    assert [m.incident_id for m in picked] == [b, a]


def test_normalise_masks_identifiers():
    text = normalise("Mail from bob@corp.example at 10.0.0.1 see https://x.example/a id 1234567")
    assert "bob@" not in text and "10.0.0.1" not in text and "https" not in text
    assert {"emailtoken", "iptoken", "urltoken", "numtoken"} <= set(tokens(text))
