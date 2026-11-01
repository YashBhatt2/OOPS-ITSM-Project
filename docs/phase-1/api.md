# Frontend API contract draft

Base path `/api/v1`. Routes below are proposed, not implemented. IDs are UUID strings. Timestamps use ISO 8601 UTC. Enums are uppercase. Responses never expose persistence entities directly. Authentication mechanism remains pending; all routes except registration/login require authentication. Catalog reads require login. Permissions in requirements.md apply to every route and projection.

## Shared conventions

- Lists use zero-based `page`, `size` (default 20, maximum 100), and allowlisted `sort` such as `createdAt,desc`. Stable secondary ordering uses ID.
- PATCH/actions include the last observed `version` for optimistic concurrency; stale versions return 409. All mutations recheck authorization and current state.
- POST creates return 201 with Location; actions return 200 with the updated resource; logout/read-marker operations may return 204.
- 400 invalid input; 401 unauthenticated; 403 forbidden role/action; 404 nonexistent or inaccessible incident to avoid revealing its existence; 409 invalid transition, stale version, capacity conflict, or missing required SLA configuration; 503 unavailable optional recommendation capability.
- No generic writable `status`, `reporterId`, or arbitrary role fields on incident requests. Dedicated actions express intent.

Example error:

```json
{"code":"INVALID_TRANSITION","message":"Only verified incidents can be closed.","fieldErrors":[],"requestId":"request-123"}
```

Example list envelope:

```json
{"items":[],"page":0,"size":20,"totalElements":0,"totalPages":0}
```

## Route inventory

| Method/path | Purpose and access |
|---|---|
| POST /auth/register | Employee account; displayName, email, password; role is not accepted |
| POST /auth/login; POST /auth/logout; GET /auth/me | Login/session identity; frontend auth contract finalized in phase 3 |
| GET /services; GET /categories; GET /skills | Active catalog for authenticated users |
| POST/PATCH /admin/services, /admin/categories, /admin/skills | Admin create/update; PATCH includes /{id}; deactivate instead of delete |
| GET/POST /admin/users; PATCH /admin/users/{id} | Admin provisioning, roles and deactivation; no plaintext password response |
| GET /admin/technicians; PATCH /admin/technicians/{id} | Admin skill/profile/capacity/availability management |
| GET/POST /admin/services/{id}/sla-policies | Read/publish immutable policy versions; admin |
| GET/PATCH /admin/assignment-settings | Default SKILL_FIRST; admin can select LOAD_FIRST |
| POST /incidents | Employee reporting |
| GET /incidents; GET /incidents/{id} | Permission-filtered list/details |
| PATCH /incidents/{id} | Permitted report edits/corrections; field allowlist depends on role/state |
| GET/POST /incidents/{id}/comments | Permission-filtered comments and notes |
| GET /incidents/{id}/history | Role-filtered audit timeline |
| POST /incidents/{id}/assignment-recommendations | Admin requests ranking; strategy field optional |
| POST /incidents/{id}/assignments | Admin confirms technician or manually assigns; version, technicianId, strategy, reason |
| POST /incidents/{id}/priority-overrides | Admin; version, priority, reason |
| POST /incidents/{id}/priority-overrides/reset | Admin; version, reason; use current calculated priority |
| POST /incidents/{id}/acknowledge | Assigned technician; version |
| POST /incidents/{id}/start-investigation | Assigned technician; version |
| POST /incidents/{id}/resolutions | Assigned technician; version, details |
| POST /incidents/{id}/verify | Admin; version, note |
| POST /incidents/{id}/reject-resolution | Admin; version, reason |
| POST /incidents/{id}/close | Admin; version, note |
| POST /incidents/{id}/reopen | Reporter within seven days; version, reason |
| POST /incidents/{id}/feedback | Reporter; rating, text; current cycle |
| POST /incident-suggestions/duplicates | Employee draft suggestions; title, description, serviceId, categoryId |
| GET /incidents/{id}/resolution-suggestions | Assigned technician/admin; authorized historical suggestions |
| POST /incidents/{id}/relationships | Admin confirms related/duplicate link; targetIncidentId, type, version |
| GET /notifications; POST /notifications/{id}/read | Current recipient only |
| GET /dashboards/me | Role-appropriate counts, links to separately paginated lists |
| GET /reports/overview; /reports/technician-workload; /reports/services | Admin reports; date filters |

Detailed account provisioning and SLA configuration payloads will be finalized before phase 3, after auth and policy decisions. This inventory does not imply those decisions are approved.

## Incident creation example

`POST /incidents`

```json
{
  "title":"Payment application unavailable",
  "description":"Checkout fails for our department.",
  "serviceId":"00000000-0000-4000-8000-000000000001",
  "categoryId":"00000000-0000-4000-8000-000000000002",
  "impact":3,
  "urgency":3,
  "affectedUserCount":40
}
```

Representative response using proposed P1 policy targets (5-minute response, 30-minute resolution):

```json
{
  "id":"00000000-0000-4000-8000-000000000003",
  "reference":"INC-000001",
  "title":"Payment application unavailable",
  "description":"Checkout fails for our department.",
  "reporterId":"00000000-0000-4000-8000-000000000004",
  "serviceId":"00000000-0000-4000-8000-000000000001",
  "categoryId":"00000000-0000-4000-8000-000000000002",
  "impact":3,
  "urgency":3,
  "affectedUserCount":40,
  "status":"NEW",
  "calculatedPriority":"P1",
  "effectivePriority":"P1",
  "assignedTechnicianId":null,
  "cycleNumber":1,
  "responseDueAt":"2026-11-01T10:05:00Z",
  "resolutionDueAt":"2026-11-01T10:30:00Z",
  "createdAt":"2026-11-01T10:00:00Z",
  "version":0
}
```

The server obtains reporter identity and service criticality itself. Suggestion calls are separate so Python latency does not delay this operation.

Example resolution request:

```json
{"version":4,"details":"Restored the payment service connection and verified checkout."}
```

Example assignment recommendation response:

```json
{"strategy":"SKILL_FIRST","incidentVersion":0,"candidates":[{"technicianId":"00000000-0000-4000-8000-000000000005","rank":1,"reasons":["Meets required skills","Two active assignments"],"activeWorkload":2,"capacity":5}],"requiresConfirmation":true}
```

Recommendations are advisory snapshots. Confirmation checks eligibility/capacity again; an empty candidate list is a valid result. Assignment records the actual ranking strategy or MANUAL. Rank is not a probability.

## Filtering and dashboard definitions

`GET /incidents?status=IN_PROGRESS&priority=P1&serviceId=...&page=0&size=20&sort=createdAt,desc`

Supported criteria: exact reference/ID, createdFrom (inclusive), createdTo (exclusive), status, effective priority, categoryId, serviceId, technicianId, and slaStatus. Different criteria combine with AND. Proposed slaStatus values ON_TRACK, AT_RISK, BREACHED derive from current-cycle obligations; historical violations remain available in audit/reports. Access restrictions apply before counting/pagination. Employees cannot broaden their scope through reporter/technician filters.

Dashboard metrics:

- Employee: own total, active (NEW/ASSIGNED/ACKNOWLEDGED/IN_PROGRESS), awaiting verification (RESOLVED), verified awaiting closure, closed, unread notifications.
- Technician: active assigned workload, own capacity, assigned critical incidents, current-cycle SLA risks, unresolved information requests.
- Admin: counts by status/priority, unassigned NEW incidents, verification queue, current-cycle risk/breach counts, active workload by technician, incidents by service.
- Overview reports use creation date range for the incident cohort; distinct incident counts prevent joins from double counting. Historical breached incidents and number of breach events are separate metrics. Workload is current, not constrained by incident creation date unless explicitly requested.

Duplicate suggestions must not reveal another employee's private ticket details. Employee responses can show an opaque suggestion token and generic same-service notice; only authorized staff receive linked ticket details. Generic suggestions cannot be used to fetch restricted incidents.
