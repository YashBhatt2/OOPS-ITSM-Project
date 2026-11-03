# IT Service Management backend

Spring Boot REST backend and PostgreSQL schema for incident reporting, administrator-confirmed assignment, SLA tracking, and resolution history. React and Python/scikit-learn are separate team components.

**Verification status:** 51 domain tests and 23 PostgreSQL/API integration tests previously passed against PostgreSQL 17.11. The starter-catalog migration was added after those test runs and still needs validation. Python model integration and the complete React workflow also remain. See [validation results](docs/validation-results.md).

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

For a simple local interface, start the backend first, then run `node frontend/server.cjs` in a second terminal and open `http://localhost:3000`. Node.js is required; no frontend packages need installing. The local server forwards `/api` requests to the backend on port 8080. The interface supports sign-in, employee registration and reporting, incident status actions, administrator assignment and quick setup, and notifications. It is a basic feature-checking interface; the full React frontend and Python integration remain to be completed.

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

## Integrate the Python intelligence service

The Spring Boot backend has an HTTP adapter for duplicate and resolution suggestions. The Python service supplies rankings; it does not connect to PostgreSQL or change incidents. The request path is:

```text
React app → Spring Boot API → Python ranker → Spring validates and filters the result → React app
```

The Python service is optional. If it is stopped or unavailable, incident reporting, priority, assignment, and SLA workflows continue to work. The suggestion API returns HTTP 503 with `code: "INTELLIGENCE_UNAVAILABLE"`; the frontend should show a non-blocking message.

### 1. Agree on the model service contract

Before integrating the model, have the Python and backend teammates confirm these routes, JSON fields, score meaning, and model versioning. The Python framework and hosting are up to the team; the current backend expects this HTTP contract.

Both Python routes accept the same request envelope. The backend calls one of:

```text
POST /v1/duplicates/rank
POST /v1/resolutions/rank
```

Example duplicate request (IDs below are examples; real values are UUIDs):

```json
{
  "requestId": "75d7f34a-3ca9-4d74-82d7-c084438b3935",
  "schemaVersion": "1",
  "query": {
    "title": "Payment service unavailable",
    "description": "Checkout fails when submitting a payment",
    "serviceId": "7c2db402-8772-4520-946a-e2e08e2e75ca",
    "categoryId": "1cf73b70-a76d-4c45-9901-8172356add1d"
  },
  "candidates": [
    {
      "incidentId": "50226b5b-d2e3-4eb2-b275-843a8d17f60b",
      "title": "Checkout error",
      "description": "Payment request fails during checkout",
      "serviceId": "7c2db402-8772-4520-946a-e2e08e2e75ca",
      "categoryId": "1cf73b70-a76d-4c45-9901-8172356add1d"
    }
  ],
  "limit": 5
}
```

Resolution requests use the same `query` and envelope. Their candidate objects also include `resolutionText` from the accepted historical resolution. Keep these fields camelCase in JSON.

Return HTTP 200 and this response shape, echoing the request ID and schema version:

```json
{
  "requestId": "75d7f34a-3ca9-4d74-82d7-c084438b3935",
  "schemaVersion": "1",
  "modelVersion": "tfidf-cosine-v1",
  "results": [
    {
      "incidentId": "50226b5b-d2e3-4eb2-b275-843a8d17f60b",
      "similarityScore": 0.84,
      "explanation": "The reports describe a payment failure during checkout."
    }
  ]
}
```

Return at most five results, ordered from highest to lowest score. Each result must refer to a candidate in that request, appear only once, and have a finite `similarityScore` from 0 through 1. The score is a ranking signal, not a calibrated probability. `explanation` is optional. For no useful match, return `"results": []`. Do not return incident text or other fields in the response; Spring retrieves and authorizes any text shown to the user.

### 2. Implement and run the Python service

Use FastAPI, Flask, or another HTTP framework agreed by the team. Implement both routes against the envelope above, then replace the ranking function with the team's scikit-learn model. Test with a small set of clearly similar and unrelated examples; record what score ranges mean for that model. The model version should change when its preprocessing or ranking behavior changes.

Run the Python service on the same machine as the backend for local development. For example, if the team runs it on port `8000`, set the backend base URL to `http://localhost:8000`. Do not add `/v1/...` to this setting; Spring appends the route itself.

The backend sends only the fields shown in the contract. It does not send reporter names/emails, internal comments, or audit history. Do not export real incident data for training without a separate team decision. Keep the Python service internal to the application environment.

### 3. Configure and start Spring Boot

Add these optional settings to the environment used to launch the backend. They are also listed in `.env.example`:

```sh
export INTELLIGENCE_URL=http://localhost:8000
export INTELLIGENCE_TOKEN=local-shared-token
```

`INTELLIGENCE_TOKEN` is optional. If set, Spring sends it as `Authorization: Bearer ...`; configure the Python service to require the same value. Keep real tokens out of source control. Restart Spring Boot after changing either variable. The adapter uses a two-second request timeout and does not retry a slow request.

### 4. Connect the React features to Spring, not Python

The browser should call the authenticated backend API. Keep the React development proxy pointed at `http://localhost:8080` so session cookies and CSRF protection remain same-origin.

- Duplicate suggestions: `POST /api/v1/incident-suggestions/duplicates` with `{ "title", "description", "serviceId", "categoryId" }`. This is a state-free POST but still requires the current CSRF header.
- Resolution suggestions: `GET /api/v1/incidents/{id}/resolution-suggestions`. Employees are forbidden; administrators and technicians who can view the incident may request them.

For duplicates, the backend considers up to 100 recent active incidents from the same service from the last seven days. For resolution suggestions, it considers closed incidents from the same service and category that have an accepted resolution. Technicians receive suggestions only from incidents assigned to them; administrators can use the broader eligible history.

On success, Spring returns `status: "AVAILABLE"` and `suggestions`. Employees and technicians see a generic duplicate notice without another incident's ID or text; administrators receive the matching incident IDs. Resolution suggestions contain an authorized incident ID, score, and the accepted resolution text. Suggestions are advisory: a person decides whether to link a duplicate or use a resolution.

### 5. Verify the end-to-end integration

1. Start PostgreSQL and the Python service.
2. Export `DB_PASSWORD`, `INTELLIGENCE_URL`, and the optional `INTELLIGENCE_TOKEN` in the backend terminal; start the backend with `scripts/run.sh`.
3. Start the React app with its `/api` proxy aimed at the backend.
4. Create one active incident, then submit a similar draft as an employee with duplicate suggestions enabled. Confirm similar reports are suggested without exposing another employee's incident details. With no matching candidates, an empty successful result is expected and Python is not called.
5. Complete and accept a resolution for an incident. As the assigned technician, open an incident and request resolution suggestions. Confirm only accepted historical resolutions are shown.
6. Stop the Python service and repeat a normal report and deterministic incident actions. They should still work; suggestion calls should display a non-blocking unavailable message.

For API authentication, CSRF examples, and the full frontend request conventions, see [the frontend handoff](docs/frontend-handoff.md). For the contract proposal and its current limitations, see [intelligence.md](docs/phase-1/intelligence.md).

## Operational defaults

- Session login with CSRF protection; use a React development proxy to keep requests same-origin.
- UTC elapsed-time SLAs, 80% warning point, periodic monitoring every 30 seconds.
- Persistent in-app notifications and a simulated email delivery log every 10 seconds. No real email is sent.
- Set `COOKIE_SECURE=true` behind HTTPS for deployment.
- Local/test scope: one application instance. Rate limiting, production mail, clustered scheduling, large-dataset query optimization, and deployment hardening remain future work.
