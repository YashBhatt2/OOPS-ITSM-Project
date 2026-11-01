# Planned validation and demonstrations

These are planned cases, not executed tests. JUnit/business-rule tests will cover isolated logic; backend integration tests will cover HTTP/security/transactions with an isolated PostgreSQL database. Full frontend workflows will be checked during integration. Use a controllable clock for deadline and reopening boundaries.

| ID | Scenario | Expected result | Level |
|---|---|---|---|
| T01 | Public registration supplies ADMIN role | Rejected; cannot elevate privilege | API |
| T02 | Valid and invalid login | Valid identity succeeds; invalid credentials fail without disclosure | API |
| T03 | Employee A reads Employee B's incident | No private data returned | API |
| T04 | Employee attempts assignment/configuration | Forbidden | API |
| T05 | Valid report with service/category/policy | Persist incident, cycle, calculated priority, and creation history | Database/API |
| T06 | Missing title, invalid scale, or inactive service | Clear validation error, no partial records | API |
| T07 | NEW -> CLOSED attempt | Rejected, state/history unchanged | Unit/API |
| T08 | Assigned technician completes legal sequence | Correct milestones, actor, and resolution persisted | API |
| T09 | Admin rejects resolution | Same cycle returns to investigation, attempt retained | Unit/API |
| T10 | Priority scores at each threshold and adjacent values | Match agreed bands | Unit |
| T11 | Admin priority override followed by recalculation | Override retained until explicitly reset; history complete | Unit/API |
| T12 | Skill-first candidates with different skill/experience/load | Ranking follows agreed order and stable ties | Unit |
| T13 | Load-first candidates including ineligible technician | Least-loaded eligible candidate chosen | Unit |
| T14 | No eligible technician; concurrent confirmations at capacity | Clear unassigned outcome; capacity never exceeded | Unit/Database |
| T15 | Milestone exactly at deadline vs after deadline | On time vs breached respectively | Unit |
| T16 | Policy changed after cycle creation | Existing snapshot unchanged | Database |
| T17 | Monitor runs after late acknowledgment/resolution | Historical violation still recorded and escalated | Integration |
| T18 | Monitor runs twice / delivery retries | One logical event, both channels, no duplicate notification | Integration |
| T19 | Close and restart application | Incident, cycle, resolution, audit remain queryable | Database |
| T20 | Combine at least five filters, pagination, access scope | Correct matching subset/count with no unauthorized rows | API |
| T21 | Reports join comments/assignments | Each incident counted once; workload correct | Database/API |
| T22 | Similar and unrelated incidents | Useful duplicate ranking, safe employee projection | Model contract/API |
| T23 | Historical resolution suggestion | Only supplied/authorized candidate data returned | Contract/API |
| T24 | Python timeout/malformed response | Unavailable suggestions; incident creation still works | Integration |
| T25 | Fresh database migrations and transaction failure | Reproducible schema; failed mutation rolls back audit/state together | Database |
| T26 | Reopen just before, at, and after seven days | First two allowed, last rejected; reason required | Unit/API |
| T27 | Reopen incident with prior breach | New cycle, no assignee; previous breach/deadlines preserved | Database/API |
| T28 | Employee reads internal comment/audit/model result | Internal information never exposed | API |
| T29 | Stale incident version used for mutation | 409; no lost update | Database/API |
| T30 | Missing SLA policy on reporting | Clear configuration error; no partial incident | API |

## Demonstration workflows

1. Employee logs in and reports a categorized incident. Show calculated priority and deadlines. Administrator reviews skill-first recommendations, confirms assignment, and technician receives both notification mechanisms.
2. Technician acknowledges, investigates, and resolves. Show controlled short SLA warnings or violations on a separate demo ticket. Administrator verifies/closes; employee sees resolution and can provide feedback. Show retained history.
3. Submit similar reports, show duplicate suggestions and administrator-confirmed relationships. Demonstrate escalation and historical resolution suggestions if ready. Reopen a closed incident within the permitted window and show preserved old cycle/new deadlines.

Final submission evidence must distinguish planned cases from actual pass/fail results, record commands/environment, and document unresolved failures. Do not label screenshots or fixtures as successful automated tests.
