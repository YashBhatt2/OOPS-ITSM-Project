"""Quality regression gates on the synthetic set; a model change that drops below these fails CI."""

import pytest

from app.config import Settings
from app.rankers import TfidfRanker
from scripts.dataset import load
from scripts.evaluate import latency_ms, ranking_metrics, run, threshold_metrics

EXAMPLES = load()
SETTINGS = Settings(_env_file=None)


@pytest.fixture(scope="module")
def duplicates():
    return run(TfidfRanker(), EXAMPLES, "duplicates", None)


@pytest.fixture(scope="module")
def resolutions():
    return run(TfidfRanker(), EXAMPLES, "resolutions", None)


def test_dataset_shape():
    assert len(EXAMPLES) <= 100  # Spring sends at most 100 candidates
    assert sum(e.cluster is None for e in EXAMPLES) >= 5


def test_duplicate_ranking_quality(duplicates):
    m = ranking_metrics(duplicates)
    assert m["P@1"] >= 0.95
    assert m["Recall@5"] >= 0.85


def test_duplicate_threshold_quality(duplicates):
    m = threshold_metrics(duplicates, SETTINGS.duplicate_min_score)
    assert m["precision"] >= 0.9
    assert m["recall"] >= 0.8
    assert m["singleton_false_alarm"] <= 0.25


def test_resolution_quality(resolutions):
    assert ranking_metrics(resolutions)["P@1"] >= 0.9
    m = threshold_metrics(resolutions, SETTINGS.resolution_min_score)
    assert m["precision"] >= 0.85
    assert m["recall"] >= 0.75


def test_latency_well_under_spring_timeout():
    assert latency_ms(TfidfRanker(), EXAMPLES, n=100, repeats=5) < 1000
