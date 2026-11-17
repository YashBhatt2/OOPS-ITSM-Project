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
- Running Spring Boot backend on `http://localhost:8080`, connected to local PostgreSQL

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

### Prepare demo accounts and catalogs

After the backend is running and the bootstrap administrator exists, run this from `frontend-react/`:

```bash
npm run seed:demo
```

The script reads the root `.env` for `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD`, then ensures the sample skills, categories, services, technician profiles, employee accounts, and VPN incidents exist. It also checks administrator, technician, and employee sign-in. Existing matching records are reused; each run resets the three demo technician profiles to their sample skills, capacity, and availability. Existing user passwords are not changed.

Run the frontend checks with:

```bash
npm test
npm run build
```

## Roles and Routes

For a local account and database reference, open `demo-data.local.json` in this folder. It lists known test passwords and their verification status. With the backend running, `npm run demo:refresh` updates it with the live users, skills, categories, services, technician profiles, and incidents, including closed ones. This command reads records and checks sign-in; it does not reset passwords or create records. Passwords for other accounts remain unknown unless you enter a known testing password in the file. The file is ignored by Git and must stay outside `src/`, `public/`, and `dist/`.

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
| Technician | `yash@example.test` | `Password12345!` |
| Technician | `gnana@example.test` | `Password12345!` |
| Technician | `harshith@example.test` | `Password12345!` |
| Employee | `shreyas@example.test` | `Password12345!` |
| Employee | `vatsal@example.test` | `Password12345!` |

