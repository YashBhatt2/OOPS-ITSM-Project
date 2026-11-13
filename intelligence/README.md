# ITSM intelligence service (FastAPI)

Internal HTTP service that ranks duplicate-incident and historical-resolution candidates for the Spring Boot backend. It implements the contract in the root [README](../README.md#integrate-the-python-intelligence-service) and [intelligence.md](../docs/phase-1/intelligence.md).

- Stateless: no database access. Spring sends up to 100 candidates per request; this service only scores them.
- Only Spring Boot calls it. Keep it bound to `127.0.0.1` and never expose it to browsers.
- Spring times out after 2 seconds and treats any non-200 or malformed response as `INTELLIGENCE_UNAVAILABLE`. Core incident workflows keep working when this service is down.

## Run

Requires Python 3.11+ (developed on 3.13).

```sh
cd intelligence
py -3.13 -m venv .venv            # Windows; use python3 -m venv .venv elsewhere
.venv/Scripts/python -m pip install -r requirements-dev.txt
.venv/Scripts/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

On macOS/Linux use `.venv/bin/python` instead of `.venv/Scripts/python`.

Then start Spring Boot with `INTELLIGENCE_URL=http://localhost:8000` and the same `INTELLIGENCE_TOKEN` (see `.env.example`).

## Settings (environment variables or `intelligence/.env`)

| Variable | Default | Meaning |
|---|---|---|
| `INTELLIGENCE_TOKEN` | empty | Shared secret with Spring (`Authorization: Bearer …`). Empty disables auth; a warning is logged. |
| `DUPLICATE_MIN_SCORE` | `0.15` | Duplicate candidates scoring below this are not returned. |
| `RESOLUTION_MIN_SCORE` | `0.08` | Resolution candidates scoring below this are not returned. |
| `RANKER` | `tfidf` | `tfidf` or `overlap` (dependency-free baseline, for comparison). |
| `ENABLE_DOCS` | `true` | Serve `/docs` and `/openapi.json`. Set `false` outside development. |

## Endpoints

| Route | Auth | Purpose |
|---|---|---|
| `GET /health` | none | Liveness; returns no data |
| `GET /v1/model-info` | token | Model version and thresholds |
| `POST /v1/duplicates/rank` | token | Rank open incidents similar to a draft report |
| `POST /v1/resolutions/rank` | token | Rank closed incidents whose accepted resolution may help |

Request and response shapes: see `tests/fixtures/*.json` and `app/schemas.py`. Responses echo `requestId` and `schemaVersion`, return at most `min(limit, 5)` results ordered by `similarityScore` (0–1, a ranking signal, not a probability), with ties kept in the candidate order Spring sent (most recent first).

## Model

`app/rankers/` uses the Strategy pattern: routes depend on the abstract `Ranker`, so models can be swapped without touching the API.

All rankers share the same preprocessing (`app/text.py`): Unicode normalisation, lower case, emails/IPs/URLs/UUIDs/long numbers masked, a small IT synonym map (`pwd→password`, `outlook→email`, `logon→login`…), stop words removed. The title is counted twice.

| `modelVersion` | Status | Method |
|---|---|---|
| `tfidf-wc-v1` | **default** | scikit-learn TF-IDF fitted per request on query + candidates. Text similarity = 0.6 × cosine(word 1–2-grams) + 0.4 × cosine(char_wb 3–5-grams). Duplicates: 0.9 × text + 0.1 if same category. Resolutions: 0.8 × problem similarity + 0.2 × word similarity between the query and the resolution text. |
| `overlap-baseline-v1` | baseline | Weighted token overlap (Jaccard) with the same weighting scheme. No scikit-learn. |

Change `modelVersion` whenever preprocessing, weights or ranking behaviour change.

### Evaluation

`python -m scripts.evaluate` runs a leave-one-out test on `data/synthetic_incidents.json`: 68 **synthetic** incidents (10 clusters of 6 paraphrases with typos and abbreviations, plus 8 singletons with no true match). Each incident is ranked against all the others in one service; same cluster = relevant. `--pool 20` simulates smaller candidate sets.

| Route | Ranker | P@1 | MRR | Recall@5 | Precision / recall at default threshold | Singletons with a false suggestion |
|---|---|---|---|---|---|---|
| duplicates | overlap | 0.983 | 0.984 | 0.853 | 0.89 / 0.85 (best t=0.13) | 4 of 8 |
| duplicates | **tfidf** | **1.000** | **1.000** | **0.917** | **0.94 / 0.88** (t=0.15) | **1 of 8** |
| resolutions | overlap | 0.967 | 0.973 | 0.827 | 0.84 / 0.79 (best t=0.05) | 5 of 8 |
| resolutions | **tfidf** | 0.950 | 0.972 | **0.867** | **0.89 / 0.82** (t=0.08) | 1 of 8 |

Also tried: word unigrams only, other word/char weights (TF-IDF settings above had the best duplicate F1 and fewest false alarms), and a fixed background corpus for IDF (no improvement). Latency: about 140 ms p95 for 100 long candidates, versus Spring's 2-second timeout. `tests/test_evaluation.py` fails if quality drops below these levels.

### What scores mean (`tfidf-wc-v1`)

Scores are cosine-based ranking signals, **not probabilities**, and are naturally low for short paraphrased reports.

| Duplicate score | Meaning on the synthetic set |
|---|---|
| ≥ 0.30 | Strong match; usually the same issue described with shared key terms |
| 0.15 – 0.30 | Likely related; typical range for paraphrases (median for true duplicates ≈ 0.25) |
| < 0.15 | Not returned. 99% of unrelated pairs score below 0.15 |

For resolutions, true matches have a median of about 0.16 and unrelated pairs are below 0.09 in 99% of cases; the cut-off is 0.08.

Limits: the evaluation data is small and written by the team, so these numbers show the method works, not production accuracy. Re-run the evaluation and revisit thresholds once real (approved) incident history exists.

## Privacy

Logs record only request ID, kind, candidate/result counts, top score and latency, never titles, descriptions or resolution text. Explanations are short shared-term lists; Spring shows them only to administrators.

## Test

```sh
.venv/Scripts/python -m pytest -q
.venv/Scripts/python -m ruff check .
```

Tests cover the contract Spring enforces (echoed IDs, ordering, limits, unique supplied IDs, score bounds, size, camelCase, validation errors), bearer auth, and ranker behaviour.

## End-to-end with Spring Boot (Docker only)

`compose.e2e.yaml` in the repository root runs a throwaway PostgreSQL, this service, and Spring Boot (built in a JDK 21 / Maven container), so no Java, Maven or PostgreSQL install is needed. Put throwaway values in an env file outside the repository, for example:

```text
INTELLIGENCE_TOKEN=<random string>
BOOTSTRAP_ADMIN_EMAIL=e2e-admin@example.test
BOOTSTRAP_ADMIN_PASSWORD=<random, 12+ characters>
```

From the repository root:

```sh
docker compose -p itsm-e2e --env-file <your e2e.env> -f compose.e2e.yaml up -d --build
```

When `http://localhost:8080/api/v1/auth/csrf` answers (about 45 s; longer the first time while Maven downloads), run the checks from `intelligence/` with the same variables exported:

```sh
.venv/Scripts/python -m scripts.e2e_spring
docker compose -p itsm-e2e --env-file <your e2e.env> -f compose.e2e.yaml stop intelligence
.venv/Scripts/python -m scripts.e2e_spring --outage
docker compose -p itsm-e2e --env-file <your e2e.env> -f compose.e2e.yaml down
```

The script seeds synthetic incidents through the REST API only, then checks duplicate and resolution suggestions for each role and the behaviour when Python is down. The database is in memory, so `down` (or recreating the `db` container) discards it. The seeded stack is also usable for the demo recording.
