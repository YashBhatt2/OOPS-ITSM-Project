# IT Service Management Backend Plan

## Status and scope

The Java domain and Spring Boot backend are implemented in `domain/` and `backend/`, with PostgreSQL migrations, setup scripts, and API documentation. The 51 domain tests and 23 PostgreSQL/API integration tests previously passed against PostgreSQL 17.11. The starter-catalog migration was added afterward and still needs to be exercised against a fresh/local database. Python service integration and a complete React workflow remain. See [implementation decisions](docs/implementation.md) and [validation results](docs/validation-results.md).

The project is based on `OOP S1 2026-2027 Project.pdf` and the team's meeting notes. Component ownership: Java/Spring Boot and PostgreSQL for the backend, React for the frontend, and Python/scikit-learn for intelligence features.

Team targets: backend/database by November 10, 2026; feature cutoff November 15; recording/submission target November 16. The assignment deadline is November 22. These are targets, not promises; preserve integration and demonstration time when prioritizing work.

## Current phase checkpoints

| Phase | Current status |
|---|---|
| 1 — requirements/contracts | Design package prepared; implementation defaults recorded in docs/implementation.md |
| 2 — foundation/persistence | Project, migration, catalog flow, and successful PostgreSQL startup verified |
| 3 — identity/catalog | Session security, accounts, skills, services/categories, and SLA policy APIs covered by integration tests |
| 4 — incident workflow | Workflow, history, comments, feedback, reopening, and permission cases covered by integration tests |
| 5 — priority/assignment | Both strategies pass domain tests; core assignment and priority workflows are covered in integration tests |
| 6 — SLA/notifications | Timing rules and SLA/notification integration cases pass; simulated email only |
| 7 — intelligence/reports | Java adapter, filters, dashboards, and reports implemented. Python service and React feature integration remain pending. |
| 8 — submission readiness | 51 domain and 23 backend integration tests previously passed; validate the latest migration, complete the React workflow and Python integration, then finish report and demo. |

## Accepted decisions

1. Retain closed incidents for audit history, reporting, reopening, and historical resolution suggestions. Hide them through dashboard filters rather than deleting them.
2. Automatically calculate initial priority using impact, urgency, and service business criticality. Allow administrator overrides with a recorded reason; preserve calculated and effective priorities.
3. Provide two distinct assignment strategies. Skill-first is the default and is implemented in a later phase, not phase 1. Load-first is the second strategy needed for the assignment.
4. Similar-incident counts may provide a bounded priority adjustment within a defined time window. Repeated reports must not cause unlimited priority escalation.
5. Implement SLA calculations, monitoring, and escalation as deterministic Spring Boot rules. Intelligence features provide recommendations rather than owning lifecycle operations.

## Architecture

One Spring Boot application, organized by feature, with one PostgreSQL database:

`React -> REST controllers -> services/domain objects -> repositories -> PostgreSQL`

Controllers handle HTTP input/output. Services coordinate permissions, transactions, and collaborating objects. Domain operations enforce business rules. Repositories retrieve and persist data. Request/response DTOs keep API contracts independent of database entities.

Proposed features: users, service catalog, incidents, assignment, SLA, notifications, audit, reporting, and intelligence integration.

Use Spring Web, Spring Data JPA, Spring Security, validation, and versioned SQL migrations. Select compatible stable versions and a Java version after checking the development environment. Avoid additional infrastructure unless a concrete requirement justifies it.

Spring Boot owns application writes. Agree on a Python integration contract before choosing its transport or framework. Supply intelligence features with the necessary authorized inputs and receive ranked suggestions, reference IDs, and scores. Do not allow intelligence failures to block core incident operations.

## Phase 1: Requirements, domain model, and API contracts

Purpose: make implementation decisions concrete without starting with assignment algorithms.

- Map every assignment requirement to an implementation phase and demonstration/test evidence.
- Define employee, technician, and administrator permissions, including ownership checks.
- Agree on incident fields and lifecycle: report, classify, assign, acknowledge, investigate, resolve, verify, close. Define rejection/reopening behavior before implementing it.
- Define who supplies impact and urgency; business criticality is administrator-managed service data.
- Sketch the use-case diagram, class diagram, and database relationships.
- Define frontend request/response examples, error shape, pagination, filters, and dashboard metrics.
- Agree with the intelligence team on inputs, outputs, access to historical data, score meaning, timeouts, and unavailable-service behavior. Use example responses to unblock parallel team development.
- Resolve the open decisions below, or explicitly defer them to the phase that depends on them.

Deliverables: requirements/permission matrix, initial diagrams, data dictionary, and API contract examples. Completion: the team can describe one complete incident journey and each component's responsibility.

## Phase 2: Application foundation and PostgreSQL learning slice

- Set up the Spring Boot project and a documented local PostgreSQL environment.
- Add versioned migrations and environment-based configuration without committed secrets.
- Build one small service-catalog create/read flow through controller, service, repository, and database.
- Introduce request validation and consistent exception responses.
- Explain tables, primary/foreign keys, constraints, basic SQL, joins, and transactions using project examples.

Completion: a service record can be created and read through the API and survives application/database restarts. A fresh database can be initialized from migrations.

## Phase 3: Identity, permissions, and configurable reference data

- Implement login, password hashing, logout as appropriate to the chosen authentication scheme, and role-based authorization.
- Public registration creates employees only. Define how administrators provision technicians and other administrators.
- Add technician profiles, skills, availability, and workload/capacity settings.
- Add administrator-managed services, business criticality, categories, and SLA configuration.
- Seed development/demo users safely and document their local use.

Completion: each role has the correct access; forbidden actions and access to another employee's private incidents are rejected.

## Phase 4: Complete manual incident workflow

- Implement reporting, viewing, permitted edits, and manual administrator assignment.
- Support acknowledgment, investigation notes, requests for information, employee replies, resolution details, verification, closure, and feedback.
- Implement agreed reopening behavior and enforce valid transitions through domain operations.
- Persist an audit trail from the first incident operation, including actor, time, action, previous/new values, and relevant reason.
- Use transactions for business changes and audit records. Protect against conflicting concurrent updates.
- Distinguish employee-visible updates from internal technician notes if the team requires private notes.

Completion: a full incident can move from reporting through closure, with history preserved and unauthorized/invalid transitions rejected.

## Phase 5: Automatic priority and technician assignment

- Document the priority formula, thresholds, and boundary examples.
- Store calculated priority separately from administrator-selected effective priority and audit overrides.
- Define one AssignmentStrategy contract with interchangeable implementations.
- Skill-first default: filter by availability, capacity, and minimum eligibility, then rank by skill match/experience with workload and stable tie-breaking rules.
- Load-first alternative: filter by minimum skill eligibility, availability, and capacity, then rank by workload with stable tie-breaking rules.
- Define the no-eligible-technician outcome explicitly; keep the incident visible as unassigned and notify the administrator.
- Expose recommendations and the agreed confirmation/automatic assignment action. Keep manual overrides auditable.

Completion: both strategies produce explainable results and can be selected without rewriting incident logic. Skill-first is the default.

## Phase 6: SLA monitoring and notifications

- Define response as acknowledgment and resolution as the agreed resolved milestone; confirm these rules with the team.
- Calculate and persist response/resolution deadlines from applicable policies.
- Define how priority overrides, reassignment, reopening, and policy changes affect existing deadlines.
- Implement periodic warnings, violation detection, and administrator escalation with persistent records and duplicate suppression.
- Implement dashboard/in-app notifications plus email or explicitly simulated email.
- Use incident events and notification listeners for extensibility. Keep audit persistence reliable rather than relying solely on transient events.

Completion: shortened demonstration deadlines trigger one expected warning/escalation per relevant event, and two notification channels can be demonstrated.

## Phase 7: Intelligence integration, search, and dashboards

- Integrate duplicate suggestions using the agreed Python contract; retain human confirmation of links rather than automatically merging/deleting reports.
- Integrate suggested resolutions from historical incidents. Apply role visibility rules to returned incident details.
- Add bounded similar-report priority adjustments only after defining the time window, qualifying reports, and recalculation/override behavior.
- Add optional model-based technician ranking if teammates deliver it; the two required Java assignment strategies remain available.
- Provide at least five meaningful combinable filters: status, priority, category, service, technician, date range, incident ID, and SLA status are candidates. Paginate results.
- Employee dashboard: submitted incidents, status, information requests, resolutions, notifications.
- Technician dashboard: assigned incidents, deadlines, workload, investigation actions.
- Administrator dashboard: unassigned incidents, recommendations, SLA risks/violations, workload, verification queue, summary reports.
- Demonstrate at least two distinct automated features, with duplicate detection and automatic escalation as the baseline; suggested resolutions add value when ready.

Completion: React and Python integrations work against real APIs, reports respect permissions, and core workflows still work when intelligence is unavailable.

## Phase 8: Validation and submission readiness

- Document at least 15 meaningful test cases covering normal behavior, boundary conditions, invalid input, permissions, lifecycle rules, priority, both assignment strategies, SLA timing, history persistence, and intelligence failure.
- Run focused unit tests for business rules and integration tests against PostgreSQL for persistence and API behavior.
- Verify migrations and startup from a fresh environment, including realistic sample data.
- Finish architecture/use-case/class diagrams, ER diagram, schema, API documentation, technology rationale, and test evidence.
- Prepare three complete workflows: report/prioritize/assign/notify; investigate/monitor/resolve/verify/close; related reports/detection/escalation/history.
- Rehearse the team's recorded demonstration and explainable OOP decisions.

Completion: another teammate can run the project using the documentation and reproduce the demonstration workflows.

## Initial data model candidates

User, TechnicianProfile, Skill, technician-skill association, ITService, Category, Incident, IncidentComment, Resolution/closure fields or records, Feedback, SLAPolicy, AuditEntry, Notification, EscalationRecord, and IncidentRelationship.

The exact tables and relationships will be finalized in phase 1. Use roles and composition for user capabilities instead of forcing a user inheritance hierarchy. Snapshot the SLA information needed to preserve incident commitments. Add indexes based on actual filters and joins.

## OOP evidence

- Encapsulation: lifecycle operations protect incident invariants.
- Abstraction/interfaces/polymorphism: interchangeable assignment strategies and notification channels.
- Composition/association: incidents collaborate with users, services, policies, and history.
- Appropriate inheritance: domain exception hierarchy where justified.
- Explicit design patterns: Strategy for assignment and Observer-style event listeners for notifications. Repository abstractions support persistence.

## Open decisions

Resolve before implementing the dependent functionality:

1. Resolved: administrator confirmation is required for every assignment; recommendations do not assign automatically.
2. Resolved: employees may reopen their own closed incidents within seven days with a reason. Preserve previous SLA history and start a new service cycle.
3. What Python service/interface will the intelligence team supply, and when?
4. Implementation default: session login with CSRF protection and same-origin React proxy; confirm hosting before deployment.
5. Implementation defaults: 1–3 priority inputs, 1–5 skills, capacity based on active assignments; ranking and thresholds are documented in docs/implementation.md.
6. Implementation default: elapsed-time UTC SLA clocks, including weekends.
7. Simulated email is implemented; real email remains optional.

## Working cadence

Complete the remaining work in this order:

1. Build the React interface for employee, technician, and administrator workflows. Use the API contracts in `docs/frontend-handoff.md`; include session/CSRF handling, validation, empty states, and role-appropriate actions.
2. Run the latest Flyway migrations against a fresh PostgreSQL database and verify that the starter catalog and SLA policy appear.
3. Connect the Python service to the existing duplicate and resolution adapter. Verify valid rankings, empty results, malformed responses, and service outage behavior.
4. Exercise the full employee-to-technician-to-administrator workflow through the React interface and confirm persistence after restarting the backend.
5. If time permits, add coverage for concurrent capacity confirmation, database-failure rollback, and notification delivery retry/restart behavior.
6. Finalize diagrams, report, test evidence, and the recorded demonstration.

The React interface, real Python service, latest migration validation, complete end-to-end workflow, final report, and demonstration are not yet complete.
