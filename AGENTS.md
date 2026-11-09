# AGENTS.md

Project: OOPS ITSM — IT service management web app. The Java/Spring backend and PostgreSQL schema are finished and owned by teammates. The React frontend in `frontend-react/` is what you build.

## Scope and git

- Work only on branch `feature/react-frontend` (or sub-branches of it). Never commit to `main`.
- Only create or edit files under `frontend-react/`. Do not modify `backend/`, `domain/`, `docs/`, or the legacy `frontend/` folder.
- Commit after each finished phase with a clear message. Do not force-push.

## Read before you build

1. **`frontend-react/DESIGN.md` is the design specification. Open and read it in full with a file read before writing any UI.** It is too long to be injected into your context, so it will not be there unless you read it. Re-read the relevant section before each screen.
2. `docs/frontend-handoff.md` and `backend/src/main/java/edu/oops/itsm/**/*Controller.java` define the API. The controllers are the source of truth. Roles and lifecycle: `docs/phase-1/requirements.md`.
3. `frontend-react/design-refs/` holds four reference images. Open them before the sign-in screen, dashboards, and incident detail.

## Design: non-negotiables (full detail in DESIGN.md)

The look is "a quiet instrument with cinematic moments": premium, dark-first, monochrome, and precise. It blends CRED (black canvas, glow, serif titles), Apple (restraint, springs, accessibility), and Nothing (black/white, one red signal, hairlines, mono for data). It must never look generated or templated.

- **Tokens only.** All colors, spacing, radii, type, motion come from `src/styles/tokens.css` as defined in DESIGN.md §4–§9. No raw hex, no raw pixel values, no ad hoc font stacks in components.
- **Fonts:** Instrument Sans (UI and display), Newsreader (serif, one human-voiced heading per screen at most), IBM Plex Mono (IDs, clocks, metadata). Nothing else.
- **Themes:** Obsidian (dark, default) and Ceramic (light), equal in quality, switched by `data-theme` on `<html>` with Auto, Light, Dark.
- **Color is signal.** Neutrals carry about 95% of the UI. One red accent, used sparingly (three red elements per viewport at most). Status is a dot plus a label, never a filled colored pill. Healthy SLA shows nothing.
- **At most one cinematic moment per screen** (hero light, bloom, glow). Data screens have none.
- **Depth** comes from surface steps and hairlines. Shadows only on floating layers. Glass only on chrome (top bar, tab bar, toasts, popovers).
- **Components:** Radix UI primitives for behavior, styled with our tokens. Icons: Phosphor, light weight, only. CSS Modules. No MUI, Chakra, Ant Design, Tailwind default palette, chart libraries, or emoji.
- **Responsive:** mobile-first at 360 to 1920 px. 44 px touch targets. `100dvh`, safe-area insets. Cards on small screens, tables on wide screens.
- **Motion:** springs and short eases, only `transform` and `opacity`. Honor `prefers-reduced-motion`.
- **Accessibility is required:** WCAG 2.2 AA, visible focus rings, keyboard operation, live regions, meaning never by color alone.
- **Copy:** sentence case, contractions, no "please", no exclamation marks, no emoji, "Sign in" not "Log in", dates like "November 9, 2026", times like "10:45 a.m." (DESIGN.md §12).
- **Never** use the anti-patterns in DESIGN.md §3: Inter or Roboto, purple gradients, glowing controls, a shadowed rounded card for everything, spinners as the main loader, centered-everything heroes.

## API gotchas (details in docs/frontend-handoff.md)

- Vite dev proxy `/api` → `http://localhost:8080`. The backend has no CORS.
- Session cookies (`credentials: 'include'`). Login is form-encoded (`email`, `password`) to `/api/v1/auth/login`. Call `GET /api/v1/auth/csrf` first and send the returned header on every POST and PATCH; refresh the token after login and logout.
- Send only documented JSON fields; unknown fields return 400. Never send `role` when registering.
- Every incident action sends the current `version`. On 409, refetch and tell the user. Never auto-retry a state change.
- Errors are `{ code, message, fieldErrors, requestId }`. Incidents hold IDs; resolve names from `/services`, `/categories`, `/skills` (and `/admin/technicians` for admins).
- A 503 `INTELLIGENCE_UNAVAILABLE` from suggestion endpoints is non-blocking: show a quiet notice.
- Closed incidents are hidden unless `includeClosed=true`.

## Definition of done (every screen)

Screenshots at 390, 768, and 1280 px in both themes; no raw hex or pixel values outside `tokens.css`; loading, empty, error, and conflict states; keyboard-only pass; reduced-motion pass; 200% zoom with no horizontal scroll; copy checked against DESIGN.md §12; `python3 frontend-react/design-tools/contrast.py --check` passes. Verify in the browser against the running backend and report what you tested. Full checklist: DESIGN.md §14.2.
