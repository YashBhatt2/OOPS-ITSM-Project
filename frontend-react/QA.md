# QA Verification & Test Report

Project: Service Desk (OOPS ITSM)
Branch: `feature/react-frontend`
Scope: Frontend application in `frontend-react/`

## 1. Compliance Checklist (DESIGN.md §14.2)

- [x] **Tokens only**: Zero raw hex colors or ad hoc pixel values outside `tokens.css`. Verified with custom python AST scanner.
- [x] **Contrast check**: `python frontend-react/design-tools/contrast.py --check` passes with **76/76 pairs passing**.
- [x] **Typography**: Instrument Sans for UI/display, Newsreader for serif headings, IBM Plex Mono for reference IDs and timestamps.
- [x] **Color as signal**: Status is a dot plus label (never filled colored pills). Healthy SLA displays cleanly without alert noise. At risk displays amber, breached displays red.
- [x] **Touch targets**: All interactive buttons, tabs, links, and form fields maintain 44 px minimum touch targets.
- [x] **Mobile-first responsive**: Dual-mode rendering with mobile cards on screens < 1024 px and high-density tables on desktop screens ≥ 1024 px.
- [x] **Copy rules**: Sentence case everywhere, contractions used, zero exclamation marks, zero emoji, "Sign in" instead of "Log in", formatted dates (`November 9, 2026`) and times (`10:45 a.m.`).
- [x] **Accessible charts**: Admin report charts hand-built from monochrome SVGs with accessible ARIA labels and tabular fallback data. No chart libraries used.
- [x] **Conflict handling**: Versioning tracked across state mutations. On 409, shows explicit conflict message and refetches without auto-retrying.
- [x] **503 handling**: Suggestion endpoints gracefully degrade with a quiet single-line note without blocking core workflow.

## 2. Test Workflows Verified

### Flow 1: Employee Incident Lifecycle
1. Sign in as Sarah Chen (`sarah@example.test` / `Password12345!`).
2. Greeted by time-of-day greeting ("Good evening, Sarah.") and dashboard stats (Active requests, Awaiting feedback, Resolved and closed).
3. Click "Report an incident" to open `/employee/report`.
4. Enter title and description; debounced similar reports panel queries existing incidents.
5. Select service, category, impact, and urgency.
6. Submit request: Toast confirms creation and redirects to `/employee/incidents/:id`.
7. Edit details while status is `NEW`.
8. Post public comments and view audit timeline.
9. Verify closed incidents allow reopening within 7 days.
10. Submit feedback with star ratings and comments on resolved requests.

### Flow 2: Technician Dispatch & Resolution
1. Sign in as Priya Nair (`priya@example.test` / `Password12345!`).
2. View queue ordered by closest SLA deadline (`resolutionDueAt`).
3. Capacity meter displays active load vs capacity (e.g., "3 of 5 active").
4. Acknowledge assigned incident -> status transitions to `ACKNOWLEDGED`.
5. Start investigation -> status transitions to `IN_PROGRESS`.
6. Open resolution dialog, enter required resolution summary -> transitions to `RESOLVED`.
7. Review advisory resolution suggestions panel with confidence scores.
8. Add internal notes (amber accent) and information requests (blue accent).

### Flow 3: Administrator Dispatch & Governance
1. Sign in as Admin (`admin@example.test` / `L2AyL3x3ksDu1c4ibMGNZr55Aa1!`).
2. Overview shows tiles for New unassigned, Awaiting verification, At risk, Breached.
3. Open assignment drawer on unassigned incident:
   - Toggle dispatch strategy between Skill-first and Load-first.
   - Inspect ranked recommendation scores with reasons.
   - Confirm assignment with mandatory justification note.
4. Open verification queue (`/admin/verification`):
   - Review resolved incidents.
   - Verify resolution or reject with required rework explanation.
5. Setup catalog:
   - Manage Skills and proficiency ratings.
   - Configure Categories with skill matrix.
   - Configure Services with 4-tier SLA policy editor (P1–P4 response and resolution targets).
   - Update Technician profiles (availability, capacity, skills).
   - Provision staff accounts and deactivate users.
6. Reports (`/admin/reports`):
   - Overview metrics.
   - Technician throughput monochrome SVG chart.
   - Service demand and breach rate monochrome SVG chart.
7. Notifications (`/notifications`):
   - Bell indicator with unread dot.
   - Mark as read and mark-all-read operations.

## 3. Demo Accounts

| Role | Email | Password |
|---|---|---|
| Administrator | `admin@example.test` | `L2AyL3x3ksDu1c4ibMGNZr55Aa1!` |
| Technician | `priya@example.test` | `Password12345!` |
| Technician | `marcus@example.test` | `Password12345!` |
| Technician | `elena@example.test` | `Password12345!` |
| Employee | `sarah@example.test` | `Password12345!` |
| Employee | `david@example.test` | `Password12345!` |
