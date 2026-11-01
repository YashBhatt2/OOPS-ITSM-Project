# Domain and database design

This is a conceptual design, not migration SQL. Field constraints and lengths below are proposed defaults. IDs are UUIDs, timestamps are UTC instants stored as timezone-aware timestamps, and referenced records are deactivated rather than cascade-deleted.

## Architecture

```mermaid
flowchart LR
    R[React] --> C[REST controllers and security]
    C --> S[Application services]
    S --> D[Domain objects and strategies]
    S --> P[Repositories]
    P --> DB[(PostgreSQL)]
    S --> A[Intelligence adapter]
    A --> PY[Python recommendation service]
    J[SLA scheduler] --> S
    S --> N[Persisted notification deliveries]
    N --> CH[In-app and email channels]
```

## Use-case sketch

The following actor/use-case map is an initial sketch for the report's final UML use-case diagram.

```mermaid
flowchart LR
    E[Employee] --> U1([Report and track own incident])
    E --> U2([Reply, provide feedback, reopen])
    T[Technician] --> U3([Acknowledge and investigate assignment])
    T --> U4([Resolve incident])
    A[Administrator] --> U5([Review recommendations and assign])
    A --> U6([Verify, reject, and close])
    A --> U7([Manage users, catalog, SLA, strategy])
    A --> U8([Review reports and audit])
    SYS[Scheduled processing] --> U9([Detect SLA risk and escalate])
    U1 --> U10([Calculate priority and deadlines])
    U5 --> U11([Recommend eligible technician])
    U4 --> U12([Record history and notify])
    U6 --> U12
    U9 --> U12
```

## Class sketch

```mermaid
classDiagram
    class Incident {
        -UUID id
        -IncidentStatus status
        -Priority effectivePriority
        -long version
        +assign(technician)
        +acknowledge(actor)
        +startInvestigation(actor)
        +resolve(details)
        +verify(actor)
        +close(actor)
        +reopen(reason)
    }
    class ServiceCycle {
        -int number
        -Instant openedAt
        -Instant responseDueAt
        -Instant resolutionDueAt
    }
    class AssignmentStrategy {
        <<interface>>
        +rank(incident, candidates)
    }
    class NotificationChannel {
        <<interface>>
        +deliver(notification)
    }
    class IncidentService {
        +executeAuthorizedAction(command)
    }
    class DomainException
    class InvalidTransitionException
    class NoEligibleTechnicianException
    AssignmentStrategy <|.. SkillFirstAssignment
    AssignmentStrategy <|.. LoadFirstAssignment
    NotificationChannel <|.. InAppChannel
    NotificationChannel <|.. EmailChannel
    DomainException <|-- InvalidTransitionException
    DomainException <|-- NoEligibleTechnicianException
    Incident "1" *-- "1..*" ServiceCycle
    Incident "*" --> "1" User : reporter
    Incident "*" --> "1" ITService : affected service
    Incident "*" --> "1" Category
    User "1" -- "0..1" TechnicianProfile
    TechnicianProfile "*" -- "*" Skill
    IncidentService --> Incident
    IncidentService --> AssignmentStrategy
    IncidentService --> IncidentRepository
    IncidentEventListener --> NotificationChannel
```

Application services enforce authorization and transactions; domain objects protect state invariants. Strategy demonstrates interchangeability. Event listeners demonstrate Observer-style notification delivery; audit entries are written inside the original transaction. Exceptions provide a justified inheritance relationship. Do not add inheritance purely to make the diagram larger.

## ER sketch

```mermaid
erDiagram
    APP_USER ||--o| TECHNICIAN_PROFILE : has
    TECHNICIAN_PROFILE ||--o{ TECHNICIAN_SKILL : has
    SKILL ||--o{ TECHNICIAN_SKILL : identifies
    CATEGORY ||--o{ CATEGORY_SKILL : requires
    SKILL ||--o{ CATEGORY_SKILL : identifies
    APP_USER ||--o{ INCIDENT : reports
    IT_SERVICE ||--o{ INCIDENT : affected
    CATEGORY ||--o{ INCIDENT : classifies
    IT_SERVICE ||--o{ SLA_POLICY_VERSION : configures
    SLA_POLICY_VERSION ||--|{ SLA_TARGET : contains
    INCIDENT ||--|{ SERVICE_CYCLE : retains
    SLA_POLICY_VERSION ||--o{ SERVICE_CYCLE : snapshots
    SERVICE_CYCLE ||--o{ ASSIGNMENT : records
    TECHNICIAN_PROFILE ||--o{ ASSIGNMENT : receives
    SERVICE_CYCLE ||--o{ RESOLUTION_ATTEMPT : records
    INCIDENT ||--o{ INCIDENT_COMMENT : contains
    INCIDENT ||--o{ AUDIT_ENTRY : records
    SERVICE_CYCLE ||--o{ SLA_EVENT : records
    APP_USER ||--o{ NOTIFICATION : receives
    NOTIFICATION ||--|{ NOTIFICATION_DELIVERY : channels
    SERVICE_CYCLE ||--o| FEEDBACK : receives
    INCIDENT ||--o{ INCIDENT_RELATIONSHIP : source
    INCIDENT ||--o{ INCIDENT_RELATIONSHIP : target
```

## Data dictionary

| Record | Important fields and rules |
|---|---|
| app_user | id, display_name, normalized_email (unique), password_hash, role, active, created_at. Never return hash. |
| technician_profile | user_id (PK/FK), available, capacity (positive), experience_months (nonnegative). Workload is derived, not an independently editable counter. |
| skill | id, name (unique), active. |
| technician_skill | technician_id + skill_id (composite unique), level (proposed 1–5). |
| category | id, name (unique), active. Configurable records rather than Java enum. |
| category_skill | category_id + skill_id (unique), minimum_level. Proposed all listed requirements must be met. |
| it_service | id, name, description, criticality (proposed 1–3), active. |
| sla_policy_version | id, service_id, version, effective_at, active. Published versions immutable; one current version per service. |
| sla_target | policy_version_id + priority (unique), response_seconds, resolution_seconds (positive). Four priority rows per published policy. |
| incident | id, reference (unique readable code), reporter_id, service_id, category_id, title (1–200), description (1–10000), impact, urgency, affected_user_count (optional positive), status, calculated_priority, effective_priority, override_reason, priority_input_snapshot, rule_version, current_cycle_number, created_at, updated_at, version. |
| service_cycle | id, incident_id + number (unique), opened_at, policy_version_id, target/deadline snapshots, deadline_revision, first_acknowledged_at, effective_resolved_at, verified_at/by, closed_at/by, closure_note, reopen_reason. First cycle begins at incident creation. |
| assignment | id, cycle_id, technician_id, assigned_by, strategy or MANUAL, reason, assigned_at, ended_at. At most one active assignment per cycle. |
| resolution_attempt | id, cycle_id, technician_id, details, resolved_at, outcome (pending/accepted/rejected), reviewed_by/at, review_note. Preserve rejected attempts. |
| incident_comment | id, incident_id, author_id, body, kind (NOTE/INFORMATION_REQUEST/REPLY), visibility (PUBLIC/INTERNAL), reply_to_id optional, created_at. Referenced reply must belong to same incident. |
| audit_entry | id, incident_id, cycle_id optional, actor_id nullable for system, actor_type, action, previous/new values, description, timestamp. Append-only through application API. Redact internal fields for employee timeline. |
| sla_event | id, cycle_id, target (RESPONSE/RESOLUTION), event_type (WARNING/VIOLATION/ESCALATION), deadline_revision, occurred_at, detected_at. Composite uniqueness suppresses repeats. |
| notification | id, recipient_id, incident_id optional, event_key, safe message, created_at, read_at. |
| notification_delivery | id, notification_id, channel, delivery_status, attempts, next_attempt_at, delivered_at. Unique notification/channel; retries must not create new notifications. |
| feedback | id, cycle_id (unique), reporter_id, rating (1–5), text optional, created_at. Only incident reporter may submit. |
| incident_relationship | id, source_id, target_id, type (DUPLICATE/RELATED), confirmed_by/at. No self-link; enforce canonical ordering and uniqueness for symmetric RELATED links. DUPLICATE is directional. Avoid duplicate-link cycles. |

Actor references are foreign keys even where not drawn in the compact ER sketch. Active-assignment and current-cycle consistency require transaction checks in addition to constraints. Incident version protects conflicting updates; assignment capacity needs serialized eligibility checking for the selected technician.

Proposed indexes: incident reporter/created_at, status/priority, service/created_at, category, assignment technician/ended_at, current cycle deadlines, audit incident/timestamp, and notification recipient/read_at. Validate actual query needs before finalizing migrations.

No destructive cascade from users/services/categories to incidents. Archival is a visibility decision; closure is a business milestone. Database transactions include both the state change and audit record, plus pending notifications where required.
