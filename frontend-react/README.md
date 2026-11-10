# Service Desk Frontend

The React frontend for the OOPS IT Service Management (ITSM) platform, engineered according to the "Quiet Instrument" design specification (`DESIGN.md`).

## Architecture & Design

- **Typography**: Instrument Sans Variable (UI & display), Newsreader Variable (editorial serif titles), and IBM Plex Mono (IDs, status codes, timestamps).
- **Themes**: Obsidian (Dark, default) and Ceramic (Light), toggled via `data-theme` on `<html>`. Pre-paint script prevents theme flash.
- **Tokens**: 100% tokenized CSS via CSS Modules and CSS variables in `src/styles/tokens.css`.
- **Primitives**: Built on `@radix-ui` unstyled accessible components, `@phosphor-icons/react` (light weight), and custom hand-crafted SVG data visualizations.
- **State & Data**: `@tanstack/react-query` with optimistic cache invalidation, automated CSRF header synchronization, form-encoded authentication, and optimistic concurrency version handling (HTTP 409 conflict detection).

## Getting Started

### Prerequisites

- Node.js 20+ (recommended 22+)
- Running backend on `http://localhost:8080` (or Docker PostgreSQL container)

### Setup & Run

1. **Install dependencies:**
   ```bash
   cd frontend-react
   npm install
   ```

2. **Start Development Server:**
   ```bash
   npm run dev
   ```
   The application is available at `http://localhost:5173/`.
   Vite proxies `/api` requests to `http://localhost:8080`.

3. **Production Build:**
   ```bash
   npm run build
   ```

4. **Verify Design System & Contrast:**
   ```bash
   python design-tools/contrast.py --check
   ```

## Roles and Routes

- **Authentication**:
  - `/login`, `/signin`: Atmospheric horizon sign-in page.
  - `/register`: Employee registration.
- **Employee Portal**:
  - `/employee`: Dashboard with personal incident cards/table and quick stats.
  - `/employee/report`: Incident submission with debounced duplicate detection.
  - `/employee/incidents/:id`: Detailed view with lifecycle bar, public comments, and feedback.
- **Technician Workbench**:
  - `/technician`: Queue sorted by nearest SLA deadline with live capacity bar.
  - `/technician/incidents/:id`: Next-action panel, internal notes, and AI resolution suggestions.
- **Administrator Console**:
  - `/admin`: Operational overview and unassigned dispatch queue.
  - `/admin/incidents/:id`: Priority override, recalculation, and relationship linking.
  - `/admin/verification`: Queue for reviewing resolved incidents.
  - `/admin/reports`: Executive metrics with monochrome SVG charts.
  - `/admin/setup/*`: Configuration for Skills, Categories, Services, SLA policies, Technicians, and Users.
- **Cross-Cutting**:
  - `/incidents`: Global directory with 6+ combinable filters and multi-select sorting.
  - `/notifications`: Live notifications center with read tracking.

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| Administrator | `admin@example.test` | `L2AyL3x3ksDu1c4ibMGNZr55Aa1!` |
| Technician | `priya@example.test` | `Password12345!` |
| Technician | `marcus@example.test` | `Password12345!` |
| Technician | `elena@example.test` | `Password12345!` |
| Employee | `sarah@example.test` | `Password12345!` |
| Employee | `david@example.test` | `Password12345!` |

