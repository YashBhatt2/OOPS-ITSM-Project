# Requirements and business rules

## Scope and responsibilities

Build an IT incident management system for employees, technicians, and administrators. The backend owns authorization, persistence, workflow, priority, assignment strategies, SLA monitoring, notifications, and reporting. React owns presentation. The Python team owns duplicate and resolution recommendation models.

Mandatory scope includes configurable services/categories, three roles, complete incident operations, two assignment strategies, two notification channels, SLA deadlines/violations, audit history, at least five filters, at least two automated features, and persistence. At least two explicit OOP patterns, 15 documented tests, UML/database diagrams, and three complete demo workflows support submission.

## Permission matrix

Every check is enforced on the backend. Knowing an ID does not confer access. Proposed baseline: each account has one role; accounts are deactivated rather than deleted.

| Action | Employee | Technician | Administrator |
|---|---|---|---|
| Register | Creates employee account only | Provisioned by admin | Provisioned through protected setup/admin action |
| Report incident | Yes, reporter taken from login | No initially | No initially |
| Read incident | Own only | Currently assigned only | All |
| Edit report text | Own, while NEW | No | While NEW; later changes via audited correction |
| Classify/reclassify | Select on creation | Suggest in note | Correct category/service with reason |
| Read comments | Own incidents, public comments | Assigned incidents, all comments | All |
| Add information | Own active incident, public | Assigned active incident | Any active incident |
| Request information / internal notes | No | Assigned incident | Any active incident |
| Change priority | No | Suggest in note | Override/reset with reason |
| Recommend/assign/reassign technician | No | No | Yes; recommendation requires confirmation |
| Acknowledge/start/resolve | No | Assigned incident | No technician impersonation |
| Verify/reject resolution/close | No | No | Yes |
| Reopen CLOSED | Own, within seven days, reason required | No | Proposed same time window initially |
| Feedback | Own resolved/verified/closed incident | No | Read |
| Read audit | Public status timeline only | Assigned incident history | Full audit |
| Catalog/users/policies/strategy configuration | Read active catalog | Read active catalog | Manage |
| Dashboard | Own incidents | Own assignments | Organization-wide |
| Notifications | Own only | Own only | Own only |

No role can mutate historical audit entries through the public API. Internal notes and their audit contents never appear in employee projections or model inputs.

## Lifecycle

Proposed persistent states: NEW, ASSIGNED, ACKNOWLEDGED, IN_PROGRESS, RESOLVED, VERIFIED, CLOSED. Classification is completed on reporting and recorded as an event, rather than adding a transient CLASSIFIED state.

| Transition | Actor | Conditions |
|---|---|---|
| Create -> NEW | Employee | Active service/category, valid input; priority/SLA computed |
| NEW -> ASSIGNED | Admin | Eligible technician; confirmation recorded |
| ASSIGNED -> ACKNOWLEDGED | Assigned technician | Record first response for current cycle |
| ACKNOWLEDGED -> IN_PROGRESS | Assigned technician | Begin investigation |
| IN_PROGRESS -> RESOLVED | Assigned technician | Nonempty resolution; record resolution timestamp |
| RESOLVED -> VERIFIED | Admin | Verification note |
| RESOLVED -> IN_PROGRESS | Admin | Rejection reason; same cycle and original deadlines |
| VERIFIED -> CLOSED | Admin | Closure note/time/actor |
| CLOSED -> NEW | Reporter | Within seven days of closure; reason; new cycle, no assignee |

Reopening at exactly seven days is allowed; later is rejected. The employee may report a new linked incident after the window. Original cycle history is retained. Rejection clears the current effective resolution milestone but preserves the rejected resolution attempt; a delayed monitor must still detect historical lateness.

Reassignment is allowed in ASSIGNED, ACKNOWLEDGED, and IN_PROGRESS. Proposed behavior: reset workflow to ASSIGNED, retain original deadlines and first acknowledgment, and record assignment history. Capacity/eligibility must be rechecked when confirming recommendations. Reassigning to the same technician is rejected as a redundant action.

Information requests are comments with a kind, not an extra workflow state. They do not pause SLA clocks. Edits and comments cannot silently change ownership, priority, assignee, or status. CLOSED records are retained and normally excluded from active lists.

## Priority and assignment rules

Confirmed: employee supplies impact/urgency, admin manages service business criticality, system calculates initial priority, and admin can override with a reason. Skill-first is default; load-first is a distinct alternate strategy. Neither strategy automatically assigns.

Proposed phase 5 baseline: impact, urgency, criticality each use integers 1–3. Base score = impact × urgency × criticality. Bands: 1–3 P4, 4–8 P3, 9–17 P2, 18–27 P1. Store input snapshots, score, rule version, calculated priority, effective priority, and override reason. An admin correction recalculates the recommendation but does not silently remove an override.

Suggested similar-report adjustment for phase 7: at least three distinct reporters with admin-confirmed related open incidents for the same service in the preceding 24 hours raises calculated priority by at most one band. Never exceed P1; count the current reporter at most once; recommendations alone do not count. Freeze resulting adjustments until explicit recalculation to avoid priority oscillation. This proposal needs review before implementation.

Technician eligibility: active account/profile, available, required category skills met, active workload below configured capacity. Proposed skill levels 1–5 and nonnegative experience months; phase 5 finalizes ranking and tie-breaks. Workload counts ASSIGNED, ACKNOWLEDGED, IN_PROGRESS incidents; RESOLVED items awaiting verification do not consume capacity. No eligible technician leaves the incident NEW and alerts an admin. Concurrent assignments must not exceed capacity.

## SLA and notification proposals

- Elapsed UTC time, including weekends; no paused clocks. Display time zones in the frontend.
- Each service has policy targets per priority. Seed example targets from the assignment, but keep them configurable.
- Response is first acknowledgment; resolution is the accepted resolution milestone. Both deadlines start at cycle opening, not assignment.
- Snapshot targets/deadlines per service cycle. Policy edits do not alter existing cycles.
- Effective-priority changes recompute deadlines from cycle opening using the cycle's snapshotted policy version; never reset elapsed time. Service corrections require an explicit audited SLA recalculation. Recorded violations are never erased by later relaxation.
- Missing SLA configuration rejects creation with a clear configuration error rather than inventing a deadline.
- Warn once at 80% of each target elapsed if its milestone is unmet. Breach occurs after the deadline; completion exactly at the deadline is on time. Late completed milestones still count as breaches even if the scheduler ran later.
- Persist warning/violation/escalation records with a uniqueness key per cycle, target, event type, and deadline revision. Deliver notifications after the business transaction commits; persisted pending delivery records support retries.
- Escalate breached response/resolution targets to administrators. There is no team-lead role in the initial model.
- Dashboard notifications plus simulated email are the proposed minimum. Real email is optional pending team preference. Notifications are required for creation, assignment, priority change, SLA warning/breach, resolution, and closure; reopening also notifies relevant users.

## Nonfunctional acceptance

Input validation, hashed passwords, server-side permission checks, protected APIs, no secrets in source, consistent errors without stack traces, bounded pagination, optimistic conflict handling, durable history, and reproducible database setup are baseline requirements. No scale or latency promise is made before measurement. Core reporting must remain usable during Python outages.

## Requirement traceability

| Requirement | Phase | Evidence |
|---|---|---|
| User management and security | 3 | T01–T04 |
| Incident lifecycle and history | 4 | T05–T09, T19, workflows 1–2 |
| Priority inputs/calculation/override | 5 | T10–T11 |
| Two interchangeable assignment strategies | 5 | T12–T14 |
| SLA calculation/warnings/violations | 6 | T15–T18 |
| Two notification channels | 6 | T18, workflow 2 |
| Five or more filters and reporting | 7 | T20–T21 |
| Two automated features | 6–7 | Escalation and duplicate suggestions, T17/T22 |
| Suggested resolutions | 7 | T23 |
| Persistent database | 2–8 | T05/T19/T25 |
| OOP and two design patterns | 4–6 | Domain diagram, Strategy, notification Observer |
| Documentation, diagrams, 15+ tests, demo | All; finalize 8 | This package, final schema/code/report and test execution evidence |

## Decisions still requiring review

1. Frontend hosting/login: propose a server session cookie, same-site deployment, and CSRF protection for mutations; confirm before phase 3. Do not implement JWT by assumption.
2. Python transport/schema: proposed HTTP JSON adapter in intelligence.md; team confirmation pending.
3. Priority scales, category skill rules, ranking weights, and similar-report adjustment: proposals above, finalize before phases 5/7.
4. SLA elapsed-time, warning threshold, reprioritization, and verification rejection semantics: proposals above, finalize before phase 6.
5. Simulated versus actual email: decide before phase 6.
6. Account role cardinality, internal notes, administrator reopening, and report-edit limits: proposed permission baseline, review before phases 3/4.

Assignment confirmation and employee reopening within seven days were explicitly approved and are no longer open decisions.
