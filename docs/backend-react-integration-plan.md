# Backend and React integration plan

## Goal

Make the React app on `feature/react-frontend` work with the existing Spring Boot API while preserving backend authorization, CSRF checks, incident lifecycle rules, and response privacy.

## Current state

The backend already provides routes for login, catalog data, incident reporting and lifecycle actions, assignment recommendations, reports, notifications, duplicate suggestions, and resolution suggestions. The React branch implements screens for these workflows, but several calls use different route names or payloads. The live Python ranker and complete UI-to-backend flow have not been verified.

Keep the existing backend routes as the canonical API. Update the React calls to match them instead of adding duplicate backend aliases.

Expected backend code changes are limited to API contract coverage and any behavior gaps that the coverage reveals. The current route mismatches are in the React calls; they do not require new backend controller routes.

## Steps, in order

1. **Align request paths and payloads.** Update both report forms to call `POST /api/v1/incident-suggestions/duplicates` with `title`, `description`, `serviceId`, and `categoryId`. Handle the returned `{ status, suggestions }` object and the standard HTTP 503 error. Align lifecycle actions to the routes below:

   | Feature | Canonical backend route | React branch currently calls |
   |---|---|---|
   | Technician acknowledges from incident detail | `POST /api/v1/incidents/{id}/acknowledge` | `/acknowledgments` |
   | Administrator verifies | `POST /api/v1/incidents/{id}/verify` | `/verifications` |
   | Administrator rejects a resolution | `POST /api/v1/incidents/{id}/reject-resolution` | `/resolution-rejections` |
   | Employee reopens | `POST /api/v1/incidents/{id}/reopen` | `/reopens` |

   Reopening also requires `{ version, reason }`; the current UI sends only `version`, so it must collect a reason. Other actions should keep sending the current incident `version` and required details, note, or reason.

2. **Check the rest of the API contract.** Compare each React request with `docs/frontend-handoff.md`, including method, role, request fields, response shape, pagination, CSRF token, and error handling. Keep cookies on same-origin requests through the Vite `/api` proxy. Do not expose other employees' incident data in duplicate suggestions.

3. **Check backend contract coverage.** Run the existing PostgreSQL/API integration suite after the React calls are aligned. Add tests only for uncovered UI-facing behavior, especially the duplicate suggestion request/response, required reopen reason, and a mock Python service returning valid rankings, empty results, unknown IDs or invalid scores, timeouts, and non-200 responses. Keep the current outage behavior: optional suggestions can fail without blocking core incidents.

4. **Validate local data initialization.** Apply the latest Flyway migrations to a fresh `itsm` database. Run `frontend-react/scripts/seed-demo.mjs` with the configured bootstrap admin credentials. It creates demo users and catalog/SLA setup, but not sample incidents; create incidents through the employee flow.

5. **Connect the real Python service.** Set `INTELLIGENCE_URL` and, if used, `INTELLIGENCE_TOKEN` for Spring Boot. Confirm both duplicate and resolution routes satisfy the contract in the README and test with useful similar and unrelated cases.

6. **Run the complete workflow through React.** Report as an employee, assign as an administrator, acknowledge/investigate/resolve as the technician, verify/close as the administrator, then check employee feedback/history and permitted reopening. Confirm records remain after a backend restart.

## Completion criteria

- Every React API call matches a backend route and DTO, and every mutation carries CSRF protection and the latest version where required.
- Each role can complete only its permitted actions; stale changes show a recoverable conflict.
- Duplicate and resolution suggestions work when Python is configured and fail gracefully when it is not.
- A fresh database can be initialized and the full demo workflow repeated using [RUNNING.md](../RUNNING.md).
