# IT Service Management backend

Spring Boot REST backend and PostgreSQL schema for incident reporting, administrator-confirmed assignment, SLA tracking, and resolution history. React and Python/scikit-learn are separate team components.

**Verification status:** 51 domain tests and 23 PostgreSQL/API integration tests pass against PostgreSQL 17.11. The application has started successfully, run its Flyway migration, and served an authenticated API session. Python model integration and a complete frontend workflow remain to be verified. See [validation results](docs/validation-results.md).

## Project layout

- `domain/`: plain Java priority, lifecycle, assignment, and SLA rules; independently testable.
- `backend/`: Spring HTTP/security, application services, JPA persistence, migrations, scheduler, and intelligence adapter.
- `docs/phase-1/`: original design package. [Implementation decisions](docs/implementation.md) records concrete choices and differences.
- `compose.yaml`: development PostgreSQL and an isolated optional test database.

The two Maven modules produce one deployable backend application; they are not microservices.

## Requirements and setup

Use Java 21 or newer supported by Spring Boot 4.1.1, Maven, and PostgreSQL 17.x. PostgreSQL 17 matches the Compose setup and remains supported. The project compiles to Java 21. Spring Boot 4.1.1 matches the parent/dependency metadata already present in this environment; dependencies are pinned by its BOM. See the official [Spring Boot installation guide](https://docs.spring.io/spring-boot/installing.html) for supported tooling. PostgreSQL's [macOS download page](https://www.postgresql.org/download/macosx/) links to the EDB installer, which includes the server and pgAdmin.

1. Install PostgreSQL 17.x for macOS and start the PostgreSQL server. The assignment app does not need pgAdmin, but it can make the first database setup easier.
2. In pgAdmin's Query Tool connected to the local server as its administrator, create an application login and two separate databases. Choose a strong local password in place of `choose-a-local-password`:

   ```sql
   CREATE ROLE itsm LOGIN PASSWORD 'choose-a-local-password';
   CREATE DATABASE itsm OWNER itsm;
   CREATE ROLE itsm_test LOGIN PASSWORD 'local-test-only';
   CREATE DATABASE itsm_test OWNER itsm_test;
   ```

   The test database is separate so automated tests cannot change development data. These local credentials are examples; choose your own for development.
3. Copy `.env.example` to `.env`, set `DB_PASSWORD` to the password chosen above, and replace the bootstrap administrator password. Never commit `.env`.
4. Export the variables in the terminal used to launch Java. Spring Boot does **not** read `.env` automatically. For a trusted shell-compatible `.env` file, `set -a; . ./.env; set +a` exports them.
5. Run `scripts/run.sh`. Maven needs internet access on its first build.
6. The API listens at `http://localhost:8080/api/v1`. Flyway creates the schema; Hibernate validates it rather than changing it automatically.

The bootstrap administrator is created only when no administrator exists and `BOOTSTRAP_ADMIN_EMAIL` is supplied. Its password must be at least 12 characters and at most 72 UTF-8 bytes. The bootstrap process does not reset existing passwords. There are no hard-coded production credentials.

A Maven Wrapper is not included yet: its distribution/plugin could not be downloaded. Use the installed `mvn` commands above.

## First use

Use [the frontend handoff](docs/frontend-handoff.md) for authentication and payloads.

1. Log in as the bootstrap administrator.
2. Create skills, a category with minimum skill requirements, and an IT service with criticality.
3. Publish SLA targets for all four priorities for that service.
4. Provision a technician and configure their skills, availability, and capacity.
5. Register an employee and report an incident.
6. As administrator, request skill-first recommendations and confirm an assignment.
7. As the assigned technician, acknowledge, start investigation, and resolve.
8. As administrator, verify and close. As employee, provide feedback or reopen within seven days.

Records are retained after closure. Normal lists exclude closed incidents; use `includeClosed=true` or `status=CLOSED` to see them.

## Testing

```sh
scripts/test.sh unit
```

For database/API integration tests, use the separate `itsm_test` database, never the development database:

```sh
export TEST_DB_PASSWORD=local-test-only
export TEST_DB_URL=jdbc:postgresql://localhost:5432/itsm_test
export TEST_DB_USER=itsm_test
scripts/test.sh integration
```

Start the local PostgreSQL service before running tests. Tests run migrations and use transaction rollback for isolation. To use the optional Docker test service instead, run `docker compose -f compose.test.yaml up -d db-test`, then leave `TEST_DB_URL` and `TEST_DB_USER` unset; that service listens on port 5433 and uses temporary storage.

`mvn test` runs unit tests; `mvn -Pintegration verify` runs the PostgreSQL-backed `BackendIT` tests through Maven Surefire. Integration tests are not silently skipped when the database is missing—they fail. Test results are under each module's `target/surefire-reports`.

## Optional Python service

Set `INTELLIGENCE_URL` and, if required, `INTELLIGENCE_TOKEN`. The adapter calls `/v1/duplicates/rank` and `/v1/resolutions/rank` using the contract in [intelligence.md](docs/phase-1/intelligence.md). Without that service, reporting and all deterministic workflows still work; suggestion endpoints return an unavailable error. No model or training dataset is included here.

## Operational defaults

- Session login with CSRF protection; use a React development proxy to keep requests same-origin.
- UTC elapsed-time SLAs, 80% warning point, periodic monitoring every 30 seconds.
- Persistent in-app notifications and a simulated email delivery log every 10 seconds. No real email is sent.
- Set `COOKIE_SECURE=true` behind HTTPS for deployment.
- Local/test scope: one application instance. Rate limiting, production mail, clustered scheduling, large-dataset query optimization, and deployment hardening remain future work.

The human reviews changes and makes commits. No commits were created as part of this implementation.
