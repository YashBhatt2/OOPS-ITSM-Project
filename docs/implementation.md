# Implementation decisions and remaining work

The user authorized implementation after phase 1. The documented proposals were used as defaults, with these explicit implementation choices:

- Spring Boot 4.1.1, Java 21 bytecode, Maven, PostgreSQL 17, Flyway, Spring Security sessions/CSRF, and JPA.
- One deployment split into a plain Java domain module and a Spring backend module.
- Assignment always needs administrator confirmation. Two deterministic strategies are interchangeable; skill-first is default.
- Priority uses impact × urgency × criticality with the documented bands. Three distinct reporters on directly confirmed linked active incidents within 24 hours can raise calculated priority by one band. Recalculation is an explicit administrator action; it never removes an override.
- Seven-day employee reopening creates a fresh cycle, clears assignment/override, recalculates priority, and uses the current service policy. Historic cycles remain intact.
- Elapsed-time SLA clocks. Priority changes use the original cycle's policy; classification correction before assignment explicitly adopts the selected service's latest policy while preserving cycle opening time. Existing violations are checked before changing deadlines. Policy publication never edits old versions.
- Classification correction is limited to NEW incidents. Reassignment resets to ASSIGNED but preserves first acknowledgment and deadlines. Resolution rejection retains the attempt and requires capacity on the original technician.
- A single account table stores technician profile fields and a skill association table. Separate TechnicianProfile class/table was unnecessary for this version; role checks guard technician operations.
- Notifications are persisted synchronously in the transaction through an event listener. In-app visibility is immediate on commit; simulated email uses a persisted delivery flag and retry count. This is a small outbox, not an external message broker. No actual email is sent.
- Comments have public/internal visibility. Employee audit views hide internal events and detailed previous/new values. Reports contain aggregated operational counts.
- Every intelligence result must reference a supplied candidate and have a finite score in 0–1; input text is not included in operational logs. Python integration remains subject to teammate agreement.
- The current repository is an explicit JPA EntityManager-backed Store. It centralizes persistence access; controllers use application services, not the database directly.

## Verified and unverified

Domain code compiles and 51 domain tests pass. The backend compiles and all 23 PostgreSQL/API integration tests pass against the host's PostgreSQL 17.11. The tests caught and drove a fix for persisting the SLA cycle before calculating its deadlines. Python model integration and a complete frontend workflow remain unverified. See validation-results.md.

## Work required before declaring the backend ready

1. Run the application from a fresh database and exercise the complete frontend workflow; verify restart persistence.
2. Repeat `mvn -Pintegration verify` after any subsequent changes.
3. Confirm and test the Python service with teammates, including useful duplicate/resolution examples. The backend adapter alone does not establish model quality.
4. Expand integration coverage for concurrent capacity confirmations, transaction rollback under database failure, notification delivery retries, and fresh-process restart. Existing tests cover sequential capacity conflicts, not a proven concurrency race.
5. Finalize class/use-case diagrams against implementation, produce the final report and sample dataset, and record the team demonstration.

## Scope limits

Account roles are immutable after provisioning. The initial dashboard supplies counts/queues through APIs, not a frontend. Catalog/user lists and historical SLA scanning target a small assignment dataset; production pagination, batched historical monitoring, rate limiting, and operational metrics are future work. Automatic reassignment, real email, cloud deployment, model training, and frontend implementation are outside this backend version. A Maven Wrapper remains to be generated once dependencies are downloadable.
