# Frontend handoff

Read this alongside the [route inventory](phase-1/api.md). Endpoints are implemented in source but await full integration verification. Use a React development proxy for `/api` to `http://localhost:8080`; there is no permissive cross-origin configuration.

## Authentication

Use browser credentials on requests. First call `GET /api/v1/auth/csrf`; it returns `{ "token": "...", "headerName": "X-CSRF-TOKEN" }` and establishes the session. Send that header on every POST/PATCH, including registration and login. Refresh it after login and logout. The official [Spring Security CSRF guide](https://docs.spring.io/spring-security/reference/servlet/exploits/csrf.html) explains token rotation.

Login intentionally uses Spring Security's form login:

```js
let csrf = await fetch('/api/v1/auth/csrf', {credentials: 'include'}).then(r => r.json());
const response = await fetch('/api/v1/auth/login', {
  method: 'POST', credentials: 'include',
  headers: {'Content-Type': 'application/x-www-form-urlencoded', [csrf.headerName]: csrf.token},
  body: new URLSearchParams({email, password})
});
if (!response.ok) throw new Error('Login failed');
csrf = await fetch('/api/v1/auth/csrf', {credentials: 'include'}).then(r => r.json());
const me = await fetch('/api/v1/auth/me', {credentials: 'include'}).then(r => r.json());
```

Registration uses JSON `{ "displayName": "Employee", "email": "employee@example.test", "password": "a-long-local-password" }`. Never send a role. Administrator provisioning uses `POST /admin/users` with the same fields plus `role: "TECHNICIAN"` or `"ADMIN"`. Registration does not log the user in automatically.

## Catalog setup payloads

All routes below have `/api/v1` prefix and require an administrator.

```text
POST /admin/skills
{"name":"Application support","active":true}

POST /admin/categories
{"name":"Application","active":true,"requirements":{"<skill UUID>":3}}

POST /admin/services
{"name":"Payments","description":"Checkout service","criticality":3,"active":true}

PATCH /admin/technicians/<user UUID>
{"available":true,"capacity":5,"experienceMonths":12,"skills":{"<skill UUID>":4}}

POST /admin/services/<service UUID>/sla-policies
{"targets":{"P1":{"responseSeconds":300,"resolutionSeconds":1800},"P2":{"responseSeconds":900,"resolutionSeconds":7200},"P3":{"responseSeconds":3600,"resolutionSeconds":28800},"P4":{"responseSeconds":14400,"resolutionSeconds":86400}}}
```

Catalog mutations return `{ "id": "..." }`; refresh the relevant GET list. PATCH catalog payloads replace the editable fields rather than accepting arbitrary partial JSON. User PATCH currently accepts `{ "active": false }`; roles are set at provisioning, not changed on existing accounts.

## Incident actions

Creation/list/detail payloads follow the original design. Always read the returned `version` after a mutation. A 409 means re-fetch the incident and let the user reconsider; do not blindly retry a state-changing action.

- Recommendations: `POST /incidents/{id}/assignment-recommendations` with `{ "strategy": "SKILL_FIRST" }`, or `{}` for configured default.
- Confirm assignment: `{ "version": 0, "technicianId": "...", "strategy": "SKILL_FIRST", "reason": "Best skill match" }` to `/assignments`.
- Acknowledge/start: `{ "version": 1 }` to `/acknowledge` or `/start-investigation`.
- Resolve: `{ "version": 3, "details": "Restored service and verified checkout" }` to `/resolutions`.
- Verify/close: `{ "version": 4, "note": "Verified checkout successfully" }`.
- Reject/reopen: `{ "version": 5, "reason": "Issue persists" }`.
- Priority override: `{ "version": 2, "priority": "P2", "reason": "Reduced business impact" }` to `/priority-overrides`.
- Reset override: `{ "version": 3, "reason": "Use calculated priority" }` to `/priority-overrides/reset`.
- Recalculate similar-report adjustment: `{ "version": 3, "reason": "Review confirmed reports" }` to `/priority-recalculation`.
- Correct classification before assignment: `{ "version": 0, "serviceId": "...", "categoryId": "...", "impact": 2, "urgency": 2, "reason": "Correct service" }` to `/classification`.
- Edit initial report text: PATCH incident with `{ "version": 0, "title": "...", "description": "..." }`.
- Comment: `{ "body": "Please retry", "kind": "INFORMATION_REQUEST", "visibility": "PUBLIC" }`; replies can add `replyToId`. Employees cannot create internal notes or information requests.
- Feedback: `{ "rating": 5, "text": "Resolved" }` to `/feedback`; one per cycle.
- Confirm relationship: `{ "version": 1, "targetIncidentId": "...", "type": "RELATED" }` to `/relationships`.

The current response contains resolution attempts but not password hashes or internal comments. Get comments/history separately. Closed incidents remain available to their reporter, their last assigned technician, and administrators.

## Lists and dashboards

Incident and notification lists use `{ items, page, size, totalElements, totalPages }`. Catalog/user/technician lists are currently simple arrays intended for the small course dataset. Sort fields: createdAt, updatedAt, reference; direction asc/desc. Incident filter dates are inclusive `createdFrom` and exclusive `createdTo`.

`/dashboards/me` returns role, byStatus, activeWorkload, capacity (technicians only; otherwise 0), and unreadNotifications. Use filtered incident lists for queues and `/reports/technician-workload`, `/reports/services`, `/reports/overview` for admin summaries. SLA risk filtering uses persisted warning events, so it may lag the warning threshold by one monitoring interval. Breach filters also inspect overdue deadlines directly.

Suggestions return `status: AVAILABLE` with a suggestions array on success. If unavailable, the current API uses HTTP 503 with the normal `{ code: "INTELLIGENCE_UNAVAILABLE", message, fieldErrors, requestId }` error shape; show a nonblocking message. This supersedes the earlier proposed 503 suggestions envelope. Employees and technicians receive generic duplicate notices, without another reporter's ticket IDs or text. Administrators receive candidate IDs.
