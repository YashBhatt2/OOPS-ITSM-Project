"""Offline evaluation on the synthetic set (leave-one-out).

Each incident in turn is the query; every other incident is a candidate. A candidate is relevant when
it belongs to the same cluster. Singletons have no relevant candidate, so anything returned for them
is a false alarm.

    python -m scripts.evaluate                # all rankers, thresholds sweep, latency
    python -m scripts.evaluate --pool 20      # smaller random candidate pools, like Spring's 7-day window
"""

import argparse
import random
import statistics
import time
import uuid
from dataclasses import dataclass, field

from app.rankers import OverlapRanker, Ranker, TfidfRanker
from app.schemas import ResolutionCandidate
from scripts.dataset import Example, load


@dataclass
class Run:
    # (query cluster, [(score, relevant)] sorted by score desc) per query
    rankings: list[tuple[str | None, list[tuple[float, bool]]]] = field(default_factory=list)


def _pool(query: Example, examples: list[Example], size: int | None, rng: random.Random) -> list[Example]:
    others = [e for e in examples if e is not query]
    if not size or size >= len(others):
        return others
    relevant = [e for e in others if query.cluster and e.cluster == query.cluster]
    rest = [e for e in others if e not in relevant]
    keep = relevant[: max(1, size // 4)]
    return keep + rng.sample(rest, size - len(keep))


def run(ranker: Ranker, examples: list[Example], kind: str, pool: int | None, seed: int = 7) -> Run:
    rng = random.Random(seed)
    result = Run()
    for q in examples:
        candidates = _pool(q, examples, pool, rng)
        objs = [c.incident for c in candidates]
        if kind == "duplicates":
            scored = ranker.score_duplicates(q.as_query(), objs)
        else:
            scored = ranker.score_resolutions(q.as_query(), objs)
        rel = {c.incident.incident_id: bool(q.cluster) and c.cluster == q.cluster for c in candidates}
        pairs = sorted(((s.score, rel[s.incident_id]) for s in scored), key=lambda p: -p[0])
        result.rankings.append((q.cluster, pairs))
    return result


def ranking_metrics(r: Run) -> dict[str, float]:
    p1, mrr, r5 = [], [], []
    for cluster, pairs in r.rankings:
        if not cluster:
            continue
        flags = [rel for _, rel in pairs]
        p1.append(float(flags[0]))
        first = next((i for i, f in enumerate(flags) if f), None)
        mrr.append(0.0 if first is None else 1 / (first + 1))
        r5.append(sum(flags[:5]) / min(5, sum(flags)))
    return {"P@1": statistics.mean(p1), "MRR": statistics.mean(mrr), "Recall@5": statistics.mean(r5)}


def threshold_metrics(r: Run, t: float) -> dict[str, float]:
    """What Spring would actually show: top 5 with score >= t."""
    shown = tp = possible = 0
    singleton_alarms = singletons = 0
    for cluster, pairs in r.rankings:
        top = [rel for s, rel in pairs[:5] if s >= t]
        shown += len(top)
        tp += sum(top)
        if cluster:
            possible += min(5, sum(rel for _, rel in pairs))
        else:
            singletons += 1
            singleton_alarms += bool(top)
    precision = tp / shown if shown else 1.0
    recall = tp / possible if possible else 0.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    return {"t": t, "precision": precision, "recall": recall, "F1": f1,
            "singleton_false_alarm": singleton_alarms / singletons if singletons else 0.0}


def score_bands(r: Run) -> tuple[list[float], list[float]]:
    pos = [s for _, pairs in r.rankings for s, rel in pairs if rel]
    neg = [s for _, pairs in r.rankings for s, rel in pairs if not rel]
    return pos, neg


def _q(values: list[float], p: float) -> float:
    values = sorted(values)
    return values[min(len(values) - 1, int(p * len(values)))]


def latency_ms(ranker: Ranker, examples: list[Example], n: int = 100, repeats: int = 20) -> float:
    base = [e.incident for e in examples]
    candidates = [
        ResolutionCandidate(**{**base[i % len(base)].model_dump(), "incident_id": uuid.uuid4(),
                               "description": base[i % len(base)].description * 8})
        for i in range(n)
    ]
    q = examples[0].as_query()
    times = []
    for _ in range(repeats):
        start = time.perf_counter()
        ranker.score_duplicates(q, candidates)
        times.append((time.perf_counter() - start) * 1000)
    return _q(times, 0.95)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pool", type=int, default=None, help="candidate pool size (default: all others)")
    args = parser.parse_args()
    examples = load()
    texts = [f"{e.incident.title} {e.incident.description}" for e in examples]
    rankers: list[tuple[str, Ranker]] = [
        ("overlap", OverlapRanker()),
        ("tfidf", TfidfRanker()),
        ("tfidf+bg", TfidfRanker(background=texts)),
    ]
    print(f"{len(examples)} synthetic incidents, pool={args.pool or 'all others'}\n")
    for kind in ("duplicates", "resolutions"):
        print(f"== {kind} ==")
        for name, ranker in rankers:
            r = run(ranker, examples, kind, args.pool)
            m = ranking_metrics(r)
            pos, neg = score_bands(r)
            print(f"{name:9} P@1={m['P@1']:.3f} MRR={m['MRR']:.3f} R@5={m['Recall@5']:.3f}  "
                  f"relevant p10/p50={_q(pos, .1):.3f}/{_q(pos, .5):.3f}  "
                  f"irrelevant p50/p99/max={_q(neg, .5):.3f}/{_q(neg, .99):.3f}/{max(neg):.3f}")
            best = max((threshold_metrics(r, t / 100) for t in range(5, 80)), key=lambda x: x["F1"])
            print(f"          best t={best['t']:.2f} precision={best['precision']:.3f} "
                  f"recall={best['recall']:.3f} F1={best['F1']:.3f} "
                  f"singleton_false_alarm={best['singleton_false_alarm']:.3f}")
        print()
    print("== latency, 100 long candidates, p95 ms ==")
    for name, ranker in rankers:
        print(f"{name:9} {latency_ms(ranker, examples):.1f}")


if __name__ == "__main__":
    main()
