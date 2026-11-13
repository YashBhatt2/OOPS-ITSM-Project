# Validation results

Recorded on October 31, 2026.

| Check | Result |
|---|---|
| Domain Maven build and tests | PASS: 51 executed, 0 failures, 0 errors, 0 skipped |
| Full reactor Maven build | PASS after dependencies downloaded; application package builds successfully |
| Network prerequisite | `curl` to Maven Central failed DNS resolution |
| PostgreSQL prerequisite | Docker Desktop context exists, but the execution environment cannot access its socket; no local psql installation |
| PostgreSQL/API integration tests | PASS: 23 executed, 0 failures, 0 errors, 0 skipped against local PostgreSQL |
| Java syntax parsing | PASS: 52 Java source files; not equivalent to type checking or full compilation |
| Compose configuration | PASS: `docker compose --profile test config --quiet` (configuration-only check, no daemon required) |
| Maven XML, shell syntax, documentation links/JSON | PASS |
| Live HTTP workflow | PASS: app started, Flyway migrated PostgreSQL 17.11, CSRF endpoint returned JSON, administrator login was confirmed |
| Fresh test database migration / restart persistence | Migration ran for application DB; integration tests applied schema to isolated `itsm_test`. Full app restart persistence workflow not separately exercised |

The executed domain command used a writable copy of the existing Maven cache because the user's global cache is outside the writable workspace:

```sh
mvn -o -Dmaven.repo.local=/private/tmp/oops-m2 -pl domain test
```

It covered 51 invocations: priority thresholds and factors, invalid scales, bounded related-report adjustment, legal/illegal state transitions, seven-day reopening boundaries, exact SLA boundaries and delayed monitoring, both assignment strategies, availability/skill/capacity exclusion, deterministic ties, and immutable candidate skills.

The full reactor was initially blocked while dependencies were unavailable. After the user installed PostgreSQL 17.11 and downloaded Maven dependencies, startup and login succeeded. The first host integration run uncovered an order-of-operations bug: a service cycle was persisted before its SLA deadlines were set. The code was fixed to calculate deadlines before persisting the cycle. The subsequent host run passed all 23 `BackendIT` cases; the report files show 23/23 integration tests and 51/51 domain tests passing. The Maven build completed successfully.

Reproduce full verification once dependencies and Docker are available:

```sh
export TEST_DB_PASSWORD=local-test-only
docker compose -f compose.test.yaml up -d db-test
mvn -Pintegration verify
```

Keep `.env` configured for the Compose development service as described in README. Record the actual integration results here after execution, including any fixes required. See [planned validation](phase-1/validation.md) for the larger submission checklist.

## Python intelligence service (2026-11-13)

Run from `intelligence/` with Python 3.13, FastAPI 0.115.6 and scikit-learn 1.6.1:

```sh
.venv/Scripts/python -m pytest -q     # 59 passed
.venv/Scripts/python -m scripts.evaluate
```

| Area | Result |
|---|---|
| Contract rules Spring enforces (echoed IDs, ≤5 results sorted by score, only supplied unique IDs, finite 0–1 scores, <100 KB, camelCase, 422 on invalid input) | PASS |
| Bearer token (missing/wrong → 401, correct → 200, `/health` open) | PASS |
| Live uvicorn smoke test with the README example requests | PASS: 200, related candidate returned, unrelated filtered, logs contain no incident text |
| Duplicate ranking, TF-IDF, 68 synthetic incidents leave-one-out | P@1 1.000, Recall@5 0.917; at threshold 0.15: precision 0.94, recall 0.88 |
| Resolution ranking, same set | P@1 0.950, Recall@5 0.867; at threshold 0.08: precision 0.89, recall 0.82 |
| Latency, 100 long candidates | ~140 ms p95 (Spring timeout 2 s) |

Metrics come from synthetic data written by the team; see `intelligence/README.md` for method and limits.

### End-to-end: Spring Boot → Python (2026-11-14)

Run in Docker with `compose.e2e.yaml` (PostgreSQL 17 on temporary storage, the Python service image, Spring Boot built in `maven:3.9.9-eclipse-temurin-21`). `intelligence/scripts/e2e_spring.py` seeds data only through the REST API: 18 closed incidents with accepted resolutions and 5 active incidents from the synthetic set.

| Check | Result |
|---|---|
| Admin duplicate check for a VPN draft | PASS: exactly the two open VPN incidents (0.36, 0.36), `modelVersion` tfidf-wc-v1 |
| Employee / technician duplicate check | PASS: generic notice with score only; no incident IDs, text or explanation |
| Unrelated draft | PASS: empty suggestions |
| Technician resolution suggestions on an open VPN ticket | PASS: top result is the closed VPN incident with its accepted resolution text |
| Admin resolution suggestions / employee request | PASS: available / 403 |
| Closed incident asking for resolution suggestions | PASS after fix (previously returned itself) |
| Python stopped: duplicate and resolution suggestions | PASS: 503 `INTELLIGENCE_UNAVAILABLE` |
| Python stopped: report incident, assignment recommendations | PASS: 201 / 200 |
| Backend logs contain incident text | PASS: none found |
| Domain + PostgreSQL integration tests after the fixes (`mvn -Pintegration verify`) | PASS: 51/51 and 23/23 |

Bugs found and fixed during this run:

1. **Admin create endpoints failed on a fresh database.** `POST /admin/skills`, `/admin/categories` and `/admin/services` returned 409 `CONFLICT`. `CatalogService` persisted an empty entity before setting `name`; Hibernate builds the INSERT from the state at persist time, so it violated the NOT NULL constraint. Fields are now set before persisting. The existing integration tests did not catch this because they create catalog rows directly rather than through these endpoints.
2. **A closed incident suggested itself as a resolution.** The resolution candidate query now excludes the incident itself (`i.id <> :self`).

Not yet verified: React/simple-frontend display of suggestions.
