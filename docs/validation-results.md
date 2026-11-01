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
