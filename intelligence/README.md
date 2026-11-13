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
| `DUPLICATE_MIN_SCORE` | `0.25` | Duplicate candidates scoring below this are not returned. |
| `RESOLUTION_MIN_SCORE` | `0.15` | Resolution candidates scoring below this are not returned. |
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

| `modelVersion` | Status | Method |
|---|---|---|
| `overlap-baseline-v1` | current (Day 1) | Weighted token overlap after normalisation (IT synonyms, identifiers masked, stop words removed); title counted twice; +0.1 for the same category. Resolutions: 0.8 × problem similarity + 0.2 × similarity to the resolution text. |
| TF-IDF word + char n-grams | next | scikit-learn; better with paraphrases and word forms ("fails"/"failing") |

Score bands will be documented here after the evaluation set is built.

## Privacy

Logs record only request ID, kind, candidate/result counts, top score and latency, never titles, descriptions or resolution text. Explanations are short shared-term lists; Spring shows them only to administrators.

## Test

```sh
.venv/Scripts/python -m pytest -q
.venv/Scripts/python -m ruff check .
```

Tests cover the contract Spring enforces (echoed IDs, ordering, limits, unique supplied IDs, score bounds, size, camelCase, validation errors), bearer auth, and ranker behaviour.
