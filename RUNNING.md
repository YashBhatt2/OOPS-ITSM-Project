# Run the project locally

## Requirements

- Java 21 or newer
- Maven
- PostgreSQL 17.x
- Node.js 20 or newer with npm
- Python service only if testing duplicate or resolution suggestions

## 1. Start and prepare PostgreSQL

Start the PostgreSQL service. Create the application role and database if they do not already exist, using a PostgreSQL administration client:

```sql
CREATE ROLE itsm LOGIN PASSWORD 'choose-a-local-password';
CREATE DATABASE itsm OWNER itsm;
```

For integration tests, create the separate `itsm_test` database and role. Do not point integration tests at `itsm`.

## 2. Configure the backend

Copy `.env.example` to `.env` and set these values:

| Variable | Purpose |
|---|---|
| `DB_PASSWORD` | Password for the `itsm` PostgreSQL role |
| `BOOTSTRAP_ADMIN_EMAIL` | Email for the first administrator |
| `BOOTSTRAP_ADMIN_PASSWORD` | Initial administrator password, 12–72 UTF-8 bytes |
| `INTELLIGENCE_URL` | Optional Python service base URL; leave blank if unavailable |
| `INTELLIGENCE_TOKEN` | Optional shared service token |

Spring Boot does not load `.env` automatically. Set these variables in the environment or IDE run configuration used to start Java.

## 3. Build and start Spring Boot

From the repository root:

```sh
mvn -DskipTests package
java -jar backend/target/itsm-backend-0.1.0-SNAPSHOT.jar
```

Keep this process running. On first startup, Flyway creates or updates the database schema. The backend listens at `http://localhost:8080`.

## 4. Create demo setup and accounts

With the backend running and the bootstrap administrator credentials set in the root `.env`, run this from the repository root:

```sh
node frontend-react/scripts/seed-demo.mjs
```

The script creates demo skills, categories, services, SLA policies, technicians, and employees. It uses the bootstrap administrator configured in `.env`. It does not create incident records; report one after signing in as an employee.

## 5. Start the React app

In another terminal:

```sh
cd frontend-react
npm install
npm run dev
```

Open `http://localhost:5173`. Vite forwards `/api` requests to the backend on port 8080. Sign in as the bootstrap administrator or with a demo employee/technician account created by the seed script. The seed script uses `Password12345!` for its demo employee and technician accounts.

## 6. Optional: run the Python intelligence service

Start the Python service on a reachable local port, such as `8000`. Set `INTELLIGENCE_URL=http://localhost:8000` and the optional `INTELLIGENCE_TOKEN` in the backend environment, then restart Spring Boot. Suggestions are returned through Spring Boot; the browser does not call Python directly.

Without the Python service, core reporting and incident lifecycle actions remain usable. Suggestion requests return an unavailable response. The React branch still needs the API path and payload alignment listed in [the integration plan](docs/backend-react-integration-plan.md) before all suggestion and lifecycle controls work.

## Stop

Stop the React development server, Spring Boot process, and PostgreSQL service when finished. The database contents persist independently of these application processes.
