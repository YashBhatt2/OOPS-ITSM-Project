# DESIGN.md — Quiet Instrument

Design specification for the Service Desk web app (React frontend).
Version 1.0 · November 8, 2026

This file is the single source of truth for how the app looks, moves, and speaks. Read it fully before writing any UI, and re-read the relevant section before building each screen. It never overrides the API contract in `docs/frontend-handoff.md`; it governs presentation only.

---

## 0. How to use this document

**Precedence when rules conflict:** accessibility (§13) → this spec → library defaults and habit.

**Conventions.** MUST and MUST NOT are hard rules. "Token" means a CSS custom property defined in §4–§9. Components MUST NOT contain raw hex colors, raw pixel spacing, or raw font stacks; they use tokens only.

**When the spec is silent,** use this order: (1) reuse an existing component, (2) choose the quieter, flatter, more monochrome option, (3) note the gap in the pull request description so the spec can be extended.

**Reference images** live in `design-refs/` (see Appendix A). Open them before building the login screen, the dashboards, and the incident detail screen. They show the mood; this document defines the rules.

---

## 1. Thesis

> **A quiet instrument with cinematic moments.**

The app is a tool people use for long stretches, so most of it is calm, flat, dense, and precise, like the display of a well-made device. A few deliberate moments (the sign-in screen, a first-run empty state, the instant an incident is resolved) are allowed to glow. The contrast between the two is what makes it feel expensive.

It should feel: dark-first, exact, unhurried, warm in tone, and never decorated for its own sake. It must not look like a template, a dashboard kit, or the output of a generator.

### 1.1 The three influences

| Influence | Take | Leave |
|---|---|---|
| **CRED** | Black-first canvas. Soft bloom of light behind display type. Bold, tightly set display headlines. Tiny, widely tracked all-caps eyebrows. A **serif for human-voiced screen titles**. Big numerals with dimmed secondary digits. Monochrome bar charts with one highlighted bar. A thin tinted status strip. A leader line ending in a ring node. Glass square icon buttons. | Lowercase-everything headlines. Car and lifestyle imagery. Loud green cards as a default. Reward and gamification energy. |
| **Apple** | Hierarchy made of size, weight, and opacity rather than boxes. 44-point touch targets. Spring-based motion. Glass materials for chrome only. Light, dark, and automatic appearance as equals. Accessibility as a baseline. A plain, contraction-friendly voice, plus the editorial rules in the Apple Style Guide (§12). | Heavy shadows, skeuomorphism, and SF Pro (its license does not allow use on the web). |
| **Nothing** | Pure black and pure white foundation with **one red signal accent**. Hairline structure. A strict grid with a margin of 2.3% of format width. Monospace for system data and metadata. Sentence case. No gradients or drop shadows on graphic elements. "Technical warmth" as a tone. | Dot-matrix type and dot patterns (excluded by the brief). The Nothing logotype and product-name lockups. Proprietary icons. NType and NDot fonts (not licensed for this use). |

**Attribution note.** Nothing's published brand reference specifies no serif typeface. The serif in this system comes from the CRED references (the "your spends summary" title in image 4). Nothing's contribution is restraint, the red signal, the grid, and the monospace.

---

## 2. Principles

Each principle has a rule you can check.

1. **The chrome recedes; the content glows.** Navigation, borders, and containers are quiet. Data and the next action are the brightest things on screen. *Check: squint at the screen. The next action and the key number should still be visible.*
2. **One cinematic moment per screen, at most.** A glow, a bloom, or a gradient hero. Data-dense screens have none. *Check: count blooms and glows per screen. The limit is one.*
3. **Hierarchy through type and space, not boxes.** No card inside a card. At most two surface levels visible at once. Prefer a hairline or whitespace to a container.
4. **Color is signal.** About 95% of pixels are neutral. A row shows at most one chromatic signal. Healthy states are silent: show nothing when an SLA is on track.
5. **Numbers are the heroes.** Tabular figures everywhere. Monospace for identifiers and clocks. Dim the secondary part of a number (seconds, decimals).
6. **Motion explains cause.** Every animation shows where something came from or went. Springs, not bounces. Everything respects reduced motion (§9).
7. **Two skies, one system.** Dark ("Obsidian") and light ("Ceramic") are first-class peers with identical structure. Never design one and tint the other.
8. **Say less, exactly.** Short, specific, human copy. No exclamation marks. Follow §12.
9. **Everything sits on the grid.** A 4 px baseline unit and the column grid in §6. No magic numbers.

---

## 3. Anti-patterns (what "vibe-coded" looks like)

If a screen contains any of these, it is wrong. Fix it before review.

**Type and content**
- Inter, Roboto, Arial, Poppins, Space Grotesk, or Playfair Display as a primary face. The system font stack as the visible face.
- Gradient-filled text. Text shadows on anything except the display roles in §5.3.
- Emoji anywhere in the UI. "Welcome back 👋". "Oops!". "Something went wrong." Lorem ipsum. Placeholder names like "John Doe".
- Exclamation marks in product copy.

**Color and surface**
- Purple, indigo, or violet gradients. Rainbow charts. Floating blurred blobs used as decoration.
- Glow on controls (buttons, inputs, cards). Glow belongs to display type and the hero light only.
- Fully colored status pills. Status is a dot plus a label (§10).
- A `rounded-2xl shadow-lg border` card used for everything. Shadows other than on floating layers (§7).
- Pure `#000` text on pure `#fff`, or any color that is not a token.
- Default component-library looks (MUI, Chakra, Ant Design) with the colors changed.

**Layout and interaction**
- A centered-everything hero. Three identical feature cards in a row.
- A spinner as the main loading indicator. Use skeletons and a thin progress hairline (§10).
- Hover-only affordances. Touch targets under 44 px on touch devices.
- Default Lucide 2 px-stroke icons. Dot-matrix anything.

---

## 4. Color

### 4.1 Concept

- **Obsidian (dark, default):** pure black canvas with stepped near-black surfaces. Text is off-white (`#F5F5F7`), never pure white, so large areas of text do not glare.
- **Ceramic (light):** a warm paper canvas derived from Nothing's N-Grey, with white surfaces and near-black text.
- **One brand signal: red** (Nothing's N-Red `#C8102E`). It is rare by design: a maximum of about three red elements in any viewport. Scarcity is what gives it meaning.
- **Functional hues** (amber, blue, green) carry meaning only: priority, interactive focus, success. They are small (a dot, a glyph, a number), never large fills, with one exception: the tinted status strip (§10.9).
- **Cinematic light** (the "Horizon" gradient and the bloom) is a lighting effect, not a palette. It appears only in the moments listed in §2 principle 2.

Source colors from the Nothing reference, kept as constants for lineage only: Pure Black `#000000`, Window Grey `#B1B3B3`, N-Grey `#DCD7D2`, Pure White `#FFFFFF`, N-Red `#C8102E`, N-Blue `#002F6C`, N-Yellow `#FFC700`.

### 4.2 Tokens

Put this in `src/styles/tokens.css`. Theme is set by `data-theme` on `<html>` (`dark` or `light`). When unset, follow the system appearance. Every pair below was checked against WCAG 2.2 (§4.5).

```css
:root {
  /* ── Source constants (lineage; do not use directly in components) ── */
  --n-black: #000000;
  --n-white: #ffffff;
  --n-grey: #dcd7d2;
  --n-window-grey: #b1b3b3;
  --n-red: #c8102e;
  --n-blue: #002f6c;
  --n-yellow: #ffc700;
}

/* ── Obsidian (dark) — default ── */
:root,
:root[data-theme="dark"] {
  --bg: #000000;
  --surface-1: #0a0a0b;   /* panels, table body */
  --surface-2: #121214;   /* inputs, raised rows, popovers */
  --surface-3: #1b1b1e;   /* hover, selected, pressed */
  --glass: rgb(18 18 20 / 0.64);

  --line-1: rgb(255 255 255 / 0.08);   /* hairlines (decorative) */
  --line-2: rgb(255 255 255 / 0.14);   /* dividers, card borders */
  --field-border: rgb(255 255 255 / 0.40); /* inputs: meets 3:1 */

  --text-1: #f5f5f7;
  --text-2: #a1a1a6;
  --text-3: #8a8a90;      /* still ≥ 5:1 on every dark surface */

  --btn-primary-bg: #f5f5f7;
  --btn-primary-fg: #000000;
  --on-red: #ffffff;

  --red: #ff5468;         /* red as text, dot, or line */
  --red-fill: #c8102e;    /* red as a filled surface (white text on it) */
  --amber: #ffc700;
  --amber-text: #ffc700;
  --blue: #5aa9ff;
  --green: #34d27b;
  --focus: #5aa9ff;

  --chart-bar: #707076;
  --chart-hi: #f5f5f7;

  --tint-green: color-mix(in srgb, var(--green) 16%, var(--surface-1));
  --tint-red:   color-mix(in srgb, var(--red) 16%, var(--surface-1));
  --tint-amber: color-mix(in srgb, var(--amber) 16%, var(--surface-1));
  --tint-blue:  color-mix(in srgb, var(--blue) 16%, var(--surface-1));

  --shadow-float: 0 24px 64px -16px rgb(0 0 0 / 0.6);
  --glow-display: 0 0 40px rgb(255 255 255 / 0.18);
  --bloom: radial-gradient(60% 50% at 50% 0%, rgb(46 143 214 / 0.20), transparent 70%);
  --horizon: linear-gradient(180deg,
    #03060c 0%, #04204a 16%, #002f6c 30%, #0e5fb0 44%, #2f93d8 56%,
    #a9d4ee 68%, #e6f0f5 74%, #11151b 74.5%, #05070a 100%);
}

/* ── Ceramic (light) ── */
:root[data-theme="light"] {
  --bg: #f6f4f1;
  --surface-1: #ffffff;
  --surface-2: #fbfaf8;
  --surface-3: #efebe6;
  --glass: rgb(255 255 255 / 0.72);

  --line-1: rgb(11 11 12 / 0.08);
  --line-2: rgb(11 11 12 / 0.14);
  --field-border: rgb(11 11 12 / 0.50);

  --text-1: #0b0b0c;
  --text-2: #55555b;
  --text-3: #64646a;

  --btn-primary-bg: #0b0b0c;
  --btn-primary-fg: #ffffff;
  --on-red: #ffffff;

  --red: #c8102e;
  --red-fill: #c8102e;
  --amber: #a87500;       /* graphics (dots, borders) */
  --amber-text: #8a6100;  /* amber used as text */
  --blue: #0a5bd3;
  --green: #0b7a3e;
  --focus: #0a5bd3;

  --chart-bar: #85858b;
  --chart-hi: #0b0b0c;

  --tint-green: color-mix(in srgb, var(--green) 12%, var(--surface-1));
  --tint-red:   color-mix(in srgb, var(--red) 10%, var(--surface-1));
  --tint-amber: color-mix(in srgb, var(--amber-text) 14%, var(--surface-1));
  --tint-blue:  color-mix(in srgb, var(--blue) 10%, var(--surface-1));

  --shadow-float: 0 20px 48px -12px rgb(11 11 12 / 0.18);
  --glow-display: none;   /* no glow in Ceramic */
  --bloom: none;
  --horizon: linear-gradient(180deg,
    #ffffff 0%, #eef3f7 30%, #e3ebf1 56%, #dcd7d2 68%, #f6f4f1 74%,
    #dcd7d2 74.5%, #d2ccc6 100%);
}

:root[data-theme="dark"]  { color-scheme: dark; }
:root[data-theme="light"] { color-scheme: light; }
```

**Theme selection (Auto / Light / Dark).** The person's choice is stored as `auto`, `light`, or `dark`. A tiny inline script in `index.html` runs before first paint: it resolves `auto` using `matchMedia("(prefers-color-scheme: light)")`, sets `data-theme` on `<html>` to `light` or `dark`, and, while the choice is `auto`, listens for system changes and updates the attribute. CSS therefore needs only the two blocks above, and there is no flash of the wrong theme. Wrap `localStorage` access in `try/catch`.

### 4.3 Role of each token

| Token | Use |
|---|---|
| `--bg` | Page canvas only. |
| `--surface-1` | Panels, table body, cards. |
| `--surface-2` | Input fill, raised rows, menus. |
| `--surface-3` | Hover, selected row, pressed. |
| `--line-1` / `--line-2` | Row hairlines / card borders and dividers. Never for input borders. |
| `--field-border` | Input, select, and textarea borders (required 3:1). |
| `--text-1` / `-2` / `-3` | Primary / secondary / tertiary text. `-3` is for labels, placeholders, and column headers, never for essential content alone. |
| `--red` | Critical text, dot, or line. P1, breach, error, unread signal. |
| `--red-fill` | Destructive buttons and the brand mark. White text only. |
| `--amber`, `--amber-text` | P2, at-risk, internal-note tag. Use `-text` when amber is a word. |
| `--blue` / `--focus` | Focus ring, links, "in progress" signal, ambient hero light. |
| `--green` | Resolved, verified, success. Small and rare. |
| `--tint-*` | Only the status strip (§10.9) and inline callouts. |

### 4.4 Meaning in the ITSM domain

Three independent channels describe an incident. Never merge them into one colored badge.

**Channel 1: stage (lifecycle bar).** Seven hairline segments (New → Closed). Filled segments use `--text-1`. Future segments use `--line-2`. A closed incident fills all segments in `--text-3` (settled, quiet).

**Channel 2: priority (marker).** A 22 × 18 px mono "P1" to "P4" label in a 1 px outlined rounded square.

| Priority | Color | Border |
|---|---|---|
| P1 | `--red` | `--red` |
| P2 | `--amber-text` | `--amber` |
| P3 | `--text-2` | `--line-2` |
| P4 | `--text-3` | `--line-2` |

**Channel 3: SLA state (dot + label, only when not healthy).**

| State | Visual |
|---|---|
| On track | Nothing is shown. Silence is good. |
| At risk | `--amber` dot + "At risk". |
| Breached | `--red` dot + "Breached". The dot plays the pulse (§9) once, not continuously. |

**Status label with dot** (the label is always `--text-1`; the dot carries state):

| Status | Dot |
|---|---|
| New | Hollow ring, `--text-2` |
| Assigned, Acknowledged | Solid, `--text-2` |
| In progress | Solid, `--blue` |
| Resolved | Solid, `--green` |
| Verified | Check glyph, `--green` |
| Closed | Hollow ring, `--text-3` |

**Red dot rule.** The "signal dot" is a 6 px `--red` circle. It marks unread notifications and things that need attention now. Keep three or fewer red dots in any viewport.

### 4.5 Verified contrast

Computed with the WCAG 2.2 relative-luminance formula. Text needs 4.5:1; large text and non-text graphics need 3:1.

| Pair | Ratio |
|---|---|
| Dark: `--text-1` on `--bg` / `--surface-3` | 19.3 / 15.8 |
| Dark: `--text-2` on `--bg` / `--surface-3` | 8.2 / 6.7 |
| Dark: `--text-3` on `--bg` / `--surface-3` | 6.1 / 5.0 |
| Dark: `--red` on `--surface-1` | 6.3 |
| Dark: `--blue` on `--surface-1` | 8.1 |
| Dark: `--green` on `--surface-1` | 10.0 |
| Dark: `--field-border` on `--surface-2` | 3.8 |
| Dark: `--chart-bar` on `--bg` | 4.2 |
| White on `--red-fill` | 5.9 |
| Light: `--text-2` on `--bg` | 6.7 |
| Light: `--text-3` on `--surface-3` (worst case) | 4.95 |
| Light: `--red` on `--surface-1` | 5.9 |
| Light: `--amber-text` on `--surface-1` | 5.5 |
| Light: `--blue` on `--surface-1` | 6.1 |
| Light: `--green` on `--surface-1` | 5.4 |
| Light: `--field-border` on `--surface-1` | 3.7 |
| Light: `--chart-bar` on `--surface-1` | 3.7 |
| Tinted strips: colored text on its own tint | 4.6 to 9.3 |
| Dark glass worst case (over a bright backdrop): `--text-1` | 5.6 |

Any new color pair MUST be checked before use. Run `python3 design-tools/contrast.py --check` to re-verify all 76 documented pairs, or `python3 design-tools/contrast.py "#FG" "#BG"` for a new one. Keep the palette inside that script in sync with `tokens.css`.

### 4.6 Hero light (the cinematic moment)

- **`--horizon`** reproduces the sky-over-floor stage of the CRED garage reference: a deep sky that brightens to a luminous horizon line, then a dark floor. Reserved exclusively for the hero section of the public landing page (`/`). Sign-in and register screens use the calm treatment (plain canvas `--bg` with a faint `--bloom` and the centered glass panel, without `--horizon`).
- **Placement rule.** On the landing page hero, display text MUST sit in the upper 0 to 44% of the viewport, where the sky is deep (`#03060C` to `#0E5FB0`; white text is 6.4:1 or better, and 12.9:1 or better above the 30% mark). Never place text over the horizon highlight (white on `#A9D4EE` is only 1.6:1). The tagline sits on the floor.
- **`--bloom`** is a soft top-center light behind a hero numeral, an empty-state headline, or the calm sign-in and register canvas. Use it at the stated strength; do not raise the opacity.
- In Ceramic, the hero uses the daylight variant of `--horizon` with no glow, and the display text switches to `--text-1`.

---

## 5. Typography

### 5.1 Families

| Role | Family | Why |
|---|---|---|
| **Sans** (display and UI) | **Instrument Sans** (variable, weight 400–700) | A precise neo-grotesque with enough character to avoid "default UI". Free and self-hostable. Fills the role SF Pro plays at Apple and NType plays at Nothing. |
| **Serif** (human voice) | **Newsreader** (variable, with optical size) | An editorial serif that stays elegant at large sizes and holds up on dark backgrounds. The CRED serif role. |
| **Mono** (system data) | **IBM Plex Mono** (400, 500) | Calm, typewriter-like, excellent numerals. The Nothing mono role. |

SF Pro, NType, NDot, and Lettera Mono are not used: they are proprietary or restricted.

Install and import (verified package entry points):

```bash
npm i @fontsource-variable/instrument-sans @fontsource-variable/newsreader @fontsource/ibm-plex-mono
```

```ts
// src/main.tsx
import "@fontsource-variable/instrument-sans/wght.css";
import "@fontsource-variable/newsreader/opsz.css";        // wght + optical size axes
import "@fontsource-variable/newsreader/opsz-italic.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
```

```css
:root {
  --font-sans: "Instrument Sans Variable", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-serif: "Newsreader Variable", "Iowan Old Style", "Palatino Linotype", Georgia, serif;
  --font-mono: "IBM Plex Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace;
}
html { font-optical-sizing: auto; -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
```

### 5.2 Scale

Sizes are in `rem` so user font-size settings scale everything. Fluid values interpolate between a 390 px and a 1440 px viewport.

```css
:root {
  --fs-display-xl: clamp(3rem, 1.7rem + 5.333vw, 6.5rem);      /* 48 → 104 */
  --fs-display-l:  clamp(2.5rem, 1.757rem + 3.048vw, 4.5rem);  /* 40 → 72  */
  --fs-numeral-xl: clamp(3rem, 2.071rem + 3.81vw, 5.5rem);     /* 48 → 88  */
  --fs-title-1:    clamp(2rem, 1.629rem + 1.524vw, 3rem);      /* 32 → 48  */
  --fs-serif-title:clamp(1.75rem, 1.471rem + 1.143vw, 2.5rem); /* 28 → 40  */
  --fs-title-2:    clamp(1.375rem, 1.236rem + 0.571vw, 1.75rem); /* 22 → 28 */
  --fs-title-3:    clamp(1.125rem, 1.079rem + 0.19vw, 1.25rem);  /* 18 → 20 */
  --fs-body-l: 1.0625rem;  /* 17 */
  --fs-body:   0.9375rem;  /* 15 */
  --fs-body-s: 0.8125rem;  /* 13 */
  --fs-label:  0.875rem;   /* 14 */
  --fs-meta:   0.75rem;    /* 12 */
  --fs-micro:  0.6875rem;  /* 11 — caps only */
}
```

| Role | Family | Weight | Line height | Tracking | Case | Use |
|---|---|---|---|---|---|---|
| `display-xl` | Sans | 600 | 0.96 | −0.035em | Sentence | Hero only (sign-in, big empty state). May use `--glow-display` in dark. |
| `display-brand` | Sans | 600 | 1.0 | +0.32em | UPPER | The product name on the hero, as a tracked-caps title (the "GARAGE" treatment). Dark only glow. |
| `display-l` | Sans | 600 | 1.0 | −0.03em | Sentence | Section hero. May use `--glow-display` in dark. |
| `numeral-xl` | Sans | 600 | 1.0 | −0.03em | n/a | Stat tiles. Tabular. |
| `title-1` | Sans | 600 | 1.05 | −0.025em | Sentence | Page title of data screens. |
| `serif-title` | Serif | 400 | 1.1 | −0.01em | Sentence | System-voiced titles: greetings, "Your incidents", empty states. |
| `title-2` | Sans | 600 | 1.15 | −0.015em | Sentence | Section headings. |
| `title-3` | Sans | 600 | 1.25 | −0.01em | Sentence | Card and drawer titles. |
| `body-l` | Sans | 400 | 1.5 | 0 | Sentence | Lead paragraphs, descriptions. |
| `body` | Sans | 400 | 1.5 | 0 | Sentence | Default text. |
| `body-s` | Sans | 400 | 1.45 | +0.005em | Sentence | Helper text, secondary lines. |
| `label` | Sans | 500 | 1.2 | +0.005em | Sentence | Buttons, tabs, field labels. |
| `eyebrow` | Sans | 500 | 1.2 | +0.22em | UPPER | The small tracked-caps line above a heading (CRED and Nothing). |
| `meta` | Mono | 400 | 1.45 | 0 | As typed | IDs, timestamps, SLA clocks, counts. |
| `meta-caps` | Mono | 500 | 1.3 | +0.08em | UPPER | Table column headers, strip text, field keys. |

Apply roles as utility classes or CSS Module composes, never ad hoc font declarations. Example:

```css
.t-display-xl { font: 600 var(--fs-display-xl)/0.96 var(--font-sans); letter-spacing: -0.035em; }
.t-eyebrow    { font: 500 var(--fs-micro)/1.2 var(--font-sans); letter-spacing: 0.22em; text-transform: uppercase; color: var(--text-2); }
.t-meta       { font: 400 var(--fs-meta)/1.45 var(--font-mono); font-variant-numeric: tabular-nums; }
```

### 5.3 Rules

- **Case.** Sentence case for headings, buttons, and labels (§12 explains this deliberate choice). UPPERCASE is allowed only for `eyebrow`, `meta-caps`, and `display-brand`. Never lowercase-everything.
- **Serif is a voice, not a decoration.** Use `serif-title` for at most one heading per screen, and only for system-voiced or human text: greetings, section summaries, empty states, and a technician's resolution narrative (set as a quote in `body-l` serif). Never in tables, buttons, labels, or numbers.
- **Numerals.** Always `font-variant-numeric: tabular-nums`. Identifiers (`INC-000123`), timestamps, SLA clocks, and counts in tables use Mono. Big stat numerals use Sans.
- **Dim the tail.** In a clock or decimal, render the least significant part in `--text-3`: `01:12:`**`40`** (hours and minutes `--text-1`, seconds `--text-3`). This is the CRED "dimmed decimals" detail.
- **Glow** is `text-shadow: var(--glow-display)` on `display-xl`, `display-l`, and `display-brand` in dark only. Never on body text, UI text, or anything under 40 px.
- **Measure.** Prose lines are 60 to 72 characters. Never exceed 75.
- **Minimum size.** 13 px for any reading text. 11 px only for uppercase tracked roles.
- **No faux styles.** Use real weights. Do not synthesize bold or italic.

---

## 6. Space, grid, and responsive layout

### 6.1 Spacing and shape tokens

```css
:root {
  /* 4 px base unit */
  --space-1: 0.25rem;  /*   4 */
  --space-2: 0.5rem;   /*   8 */
  --space-3: 0.75rem;  /*  12 */
  --space-4: 1rem;     /*  16 */
  --space-5: 1.5rem;   /*  24 */
  --space-6: 2rem;     /*  32 */
  --space-7: 3rem;     /*  48 */
  --space-8: 4rem;     /*  64 */
  --space-9: 6rem;     /*  96 */
  --space-10: 8rem;    /* 128 */

  --r-sm: 0.625rem;    /* 10 — compact controls */
  --r-md: 0.875rem;    /* 14 — buttons, inputs */
  --r-lg: 1.25rem;     /* 20 — cards, panels */
  --r-xl: 1.75rem;     /* 28 — sheets, hero glass */
  --r-pill: 999px;

  --margin: clamp(1rem, 2.3vw, 2.5rem);  /* Nothing's 2.3% rule, with a floor for phones */
  --content-max: 90rem;                   /* 1440 */

  --z-sticky: 10; --z-nav: 20; --z-drawer: 30; --z-modal: 40; --z-toast: 50;
}
```

**Nested corners:** an inner radius equals the outer radius minus the padding between them. Where supported, add a squircle: `@supports (corner-shape: squircle) { .surface { corner-shape: squircle; } }`.

### 6.2 Grid

| Name | Width | Columns | Gutter | Page margin |
|---|---|---|---|---|
| Compact | < 600 px | 4 | 16 px | `--margin` |
| Medium | 600–1023 px | 8 | 20 px | `--margin` |
| Wide | 1024–1439 px | 12 | 24 px | `--margin` |
| Max | ≥ 1440 px | 12 | 24 px | Content capped at `--content-max`, centered |

The page margin follows Nothing's rule (2.3% of the format width) with a 16 px floor. Content is top-aligned to the grid. Do not center content vertically except on the sign-in hero.

### 6.3 Responsive behavior

Design mobile-first. Components adapt to their container (`container-type: inline-size`) before they adapt to the viewport.

| Pattern | Compact | Medium | Wide |
|---|---|---|---|
| Navigation | Top bar (wordmark, bell) + glass bottom tab bar (3–4 items) | Top bar with text tabs | Top bar with text tabs, center-aligned |
| Incident list | Cards | Cards, 2 columns | Table (rows 56 px) |
| Incident detail | Single column; actions in a sticky bottom bar | Single column; actions panel after the header | Two columns: 8 (content) + 4 (sticky actions and SLA) |
| Admin assignment | Bottom sheet | Bottom sheet | Right drawer, 480 px |
| Filters | Chips scroll horizontally; "Filters" opens a bottom sheet | Inline chips | Inline chips with popovers |
| Dialogs | Bottom sheet with grabber | Centered dialog, max 480 px | Centered dialog, max 480 px |

Rules:
- Use `100dvh`, not `100vh`. Pad fixed bars with `env(safe-area-inset-*)`.
- Use `@media (pointer: coarse)` for target sizes and `@media (hover: hover)` for hover styles.
- Never hide an action at a small width. Move it into the overflow menu or the sticky bar.
- Test widths: 360, 390, 768, 1024, 1280, 1440, 1920. Also test 200% browser zoom and landscape phones.

### 6.4 Density

Two modes. **Comfortable** is the default and the only mode on touch devices. **Compact** (rows 44 px, 36 px controls) is available on pointer devices in tables only.

---

## 7. Surfaces, depth, glass

**Depth comes from surface lightness and hairlines, not shadows.**

| Level | Token | Use |
|---|---|---|
| 0 | `--bg` | Canvas. |
| 1 | `--surface-1` | Panels, cards. 1 px `--line-2` border. In dark, add `box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.05)` (a top light edge). |
| 2 | `--surface-2` | Inputs, popover lists, raised rows. |
| 3 | `--surface-3` | Hover, selected, pressed. |
| Floating | `--surface-2` + `--shadow-float` + `--line-2` border | Menus, dialogs, drawers. The only place a shadow is allowed. |

**Glass** (`--glass`) is for chrome only: the top bar, the bottom tab bar, toasts, the notification popover, and the square icon buttons on hero screens.

```css
.glass {
  background: var(--glass);
  -webkit-backdrop-filter: blur(24px) saturate(1.6);
  backdrop-filter: blur(24px) saturate(1.6);
  border: 1px solid var(--line-2);
}
@supports not (backdrop-filter: blur(1px)) { .glass { background: var(--surface-2); } }
@media (prefers-contrast: more), (prefers-reduced-transparency: reduce) {
  .glass { backdrop-filter: none; background: var(--surface-2); }
}
```

Rules: never stack glass on glass. At most two glass layers per screen. Never use glass for content (tables, forms, cards).

**Hairlines.** 1 px, `--line-1` between table rows and `--line-2` around cards and dividers. Use `border-width: 1px` (or `0.5px` on high-density displays where it renders cleanly).

---

## 8. Iconography, imagery, data visualization

### 8.1 Icons

- One family: **Phosphor**, `weight="light"` (1.5 px optical stroke), via `@phosphor-icons/react`. 20 px in controls, 24 px in navigation. Color is `currentColor`.
- No filled icons, except a check glyph for Verified. No emoji. No mixed families.
- Icon-only buttons need an `aria-label`, a 44 × 44 px hit area, and a tooltip on hover.
- **Mark (placeholder).** A 1.5 px stroke ring with one filled 5 px `--red-fill` dot at its 2 o'clock position (the signal dot). Inline SVG. Replace when the team adopts a real logo. The wordmark is the product name in `label` weight 600, UPPERCASE, +0.24em tracking. Keep the product name in a single constant (`PRODUCT_NAME`).

### 8.2 Imagery

No stock photos, illustrations, or mascots. The app's "images" are light, type, and data. Cinematic atmosphere comes from `--horizon` and `--bloom` only.

### 8.3 Leader line with a ring node (from the CRED insurance reference)

A 1 px `--text-2` line that ends in a 10 px ring (1.5 px `--text-1` stroke, transparent fill) pointing at the thing being described. Use it for:
- The incident timeline (§10.10): a vertical line with ring nodes.
- Annotation callouts on report charts.

Never use it as decoration.

### 8.4 Charts

Hand-built SVG, not a chart library (library defaults look generic).

- **Bars are monochrome.** `--chart-bar` for all bars, `--chart-hi` for the one the viewer is focused on or the current period. This is the CRED spends chart.
- Use `--red` only to mark breach, never to decorate. Use at most one highlighted bar.
- Axis labels in `meta` using single letters or numbers (J F M A…). Gridlines in `--line-1`, only two or three, no vertical grid.
- Every chart has a text equivalent: visible values in a tooltip or a table, and an `aria-label` summarizing it.
- Tooltips: solid `--surface-3`, 1 px `--line-2`, `meta` text.

---

## 9. Motion

Motion is physical and short. It explains causality; it does not decorate.

```css
:root {
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --ease-sheet: cubic-bezier(0.32, 0.72, 0, 1);
  --dur-1: 120ms;  /* press, hover */
  --dur-2: 200ms;  /* state change */
  --dur-3: 320ms;  /* panels, layout */
  --dur-4: 560ms;  /* page and hero reveal */
  --dur-5: 900ms;  /* count-up, ambient */
}
```

Spring presets for the `motion` library (use for drawers, sheets, and drag):

```ts
export const spring = {
  snappy: { type: "spring", stiffness: 380, damping: 32, mass: 0.9 },
  gentle: { type: "spring", stiffness: 170, damping: 26, mass: 1 },
} as const;
```

| Moment | Behavior |
|---|---|
| Press | Scale to 0.98 over `--dur-1`. |
| Hover (pointer only) | Surface steps up one level (`--surface-3`). No lift, no scale. |
| Page enter | Opacity 0→1 and translateY 8 px→0, `--dur-4`, `--ease-out`. |
| List enter | Same as page, staggered 40 ms, at most six items; the rest appear together. |
| Drawer / sheet | Slide with `spring.snappy`; the scrim fades in `--dur-3`. Sheets support drag-to-dismiss. |
| Number change | Count-up to the new value over `--dur-5` on first load only; later updates crossfade over `--dur-2`. |
| Status change | Crossfade the label and morph the dot over `--dur-2`; the lifecycle bar fills the new segment with `--ease-out`. |
| Success (resolved, saved) | One check stroke-draw over 480 ms, a single soft `--bloom` pulse (dark only), then rest. |
| Breach | The red dot pulses once (scale 1→1.6→1, opacity 1→0.4→1, 900 ms). Never loops. |
| Loading | Skeletons with a very subtle sweep (opacity 0.04 to 0.08, 1.6 s linear). A 2 px top progress hairline for route changes. |
| Error | A small horizontal shake (≤ 4 px, 240 ms) on the invalid field only. No bounce. |

**Rules.** Animate only `transform`, `opacity`, color, and small `filter: blur()` values. Never animate layout properties (`width`, `height`, `top`, `margin`). No looping decorative animation anywhere.

**Exception (Island):** The Island is the one component permitted a spring layout morph between Rest, Peek, and Open states (executed via transform-based layout animations with `spring.snappy`). This conveys causal notification arrival and triage from a single unified quiet focal point at top-center without abrupt popovers.

**Reduced motion** (`prefers-reduced-motion: reduce`): remove translation, scale, blur, count-ups, shakes, pulses, and shimmer. Keep opacity fades at 120 ms or less. State must remain clear without motion.

---

## 10. Components

All components use tokens, support both themes, and implement every state: default, hover (pointer only), pressed, focus-visible, disabled, loading, error where relevant. Use **Radix UI primitives** (headless) for dialog, popover, tabs, select menus, tooltip, and toast to get keyboard and screen-reader behavior right, then style them entirely with these tokens.

**Focus ring (global):** `outline: 2px solid var(--focus); outline-offset: 2px;` on `:focus-visible`. Never remove it. Never rely on a color change alone.

### 10.1 Button

| Variant | Fill | Text | Use |
|---|---|---|---|
| Primary | `--btn-primary-bg` | `--btn-primary-fg` | One per view. The next action. |
| Secondary | `--surface-2` + `--line-2` border | `--text-1` | Supporting actions. |
| Ghost | Transparent; `--surface-3` on hover | `--text-1` | Toolbars, low emphasis. |
| Destructive | `--red-fill` | `--on-red` | Reject, deactivate. Needs confirmation. |
| Link | None | `--blue`, underlined with 3 px offset | Inline navigation. |

Sizes: **Default 44 px** (radius `--r-md`), **Large 52 px** (hero and sign-in), **Compact 36 px** (pointer devices, dense tables only). Horizontal padding 20 px. Labels use `label` role, sentence case, verb-first.

Loading: keep the label, add a 16 px progress arc, lock the width. Disabled: `--surface-2` fill, `--text-3` text.

**Glass icon button** (the CRED top-right control): 48 × 48 px, `--r-lg`, `.glass`, a 20 px icon. Used for the theme toggle and the notification bell on hero screens.

### 10.2 Fields

- Label above the field in `label` role, `--text-2`. Helper text below in `body-s`, `--text-2`.
- Field height 48 px. Fill `--surface-2`. Border `1px solid var(--field-border)`. Radius `--r-md`.
- Focus: border `--focus` plus `0 0 0 3px color-mix(in srgb, var(--focus) 24%, transparent)`.
- Error: border `--red`, a message below with an icon, text `--red`, linked via `aria-describedby`. Describe how to fix it (§12).
- Placeholder in `--text-3`; never use a placeholder as the label.
- Textarea auto-grows to a maximum of about 10 lines. Select uses the **native** `<select>`, styled; build a custom listbox only when search or multi-select is genuinely needed.
- **Segmented control** for small fixed choices (impact 1–3, urgency 1–3, assignment strategy): pill track in `--surface-2`, selected segment in `--surface-3` with a 1 px `--line-2` border, 44 px high.
- Passwords: show or hide toggle; never log or echo.

### 10.3 Table (desktop incident queue)

- Row height 56 px (comfortable). Rows separated by `--line-1` only. No zebra stripes, no vertical borders.
- Header: `meta-caps`, `--text-3`, sticky, with a `--line-2` bottom border.
- Columns, in order: Priority marker · Reference (`meta`) · Title with service as a secondary `body-s --text-2` line · Status (lifecycle bar + label) · SLA (only if not healthy) · Assignee · Updated (relative, with the full date in the tooltip).
- Hover: `--surface-1`. Selected: `--surface-2`. No colored left border.
- Below 1024 px container width, rows become cards (§10.4). Pagination: "Showing 21–40 of 132" in `meta`, with previous and next as ghost buttons.
- Sorting uses the backend's `createdAt`, `updatedAt`, `reference`. Mark the sorted column with a 12 px arrow, not color.

### 10.4 Incident card (mobile and tablet)

Top line: priority marker · reference (`meta`) · relative time (right-aligned, `meta --text-3`). Then `title-3` (max two lines, truncated). Then a `body-s --text-2` line: service · status with dot. A lifecycle bar sits along the bottom. The whole card is one tap target (44 px minimum), with a visible focus state.

### 10.5 Stat tile

`meta-caps` label on top, `numeral-xl` value, then an optional change line in `body-s`: an arrow glyph and text such as "↓ 3 since yesterday". Color the change line only when direction has a clear good or bad meaning (fewer open incidents is good, `--green`; more breaches is bad, `--red`); otherwise keep it `--text-2`. The backing numbers come from `/dashboards/me` and the report endpoints; do not invent metrics.

### 10.6 Lifecycle bar

Seven segments, 2 px high, 3 px gaps, full width of its container. Filled `--text-1`, future `--line-2`, closed all `--text-3`. Pair it with the textual status; the bar is never the only indicator. Give the wrapper `role="img"` and an `aria-label` such as "Stage 4 of 7: In progress".

### 10.7 SLA meter

Used on incident detail and technician rows.

- A 4 px track in `--line-2` with a fill in `--text-1`, plus a mono clock beside it, for example `01:12:40`, with seconds in `--text-3`. Below one hour show `mm:ss`.
- At or beyond 80% of the target elapsed: fill and dot become `--amber`, with the label "At risk".
- Past the deadline: fill `--red`, label "Breached", and the clock shows overdue time as `12m overdue`.
- Two meters: Response and Resolution. Tick every second only when under one hour remains and the tab is visible; otherwise update every minute.
- The SLA state shown by the backend (`slaStatus`) is authoritative; the client clock only animates between refreshes.

### 10.8 Priority marker, status label, tags

Defined in §4.4. Tags and filter chips: 32 px high, pill, `--line-2` border, `body-s`. A selected chip shows a check and a `--text-1` border. Removable chips have a 44 px hit area on the remove button (the visual × stays small).

### 10.9 Status strip (from the CRED claims reference)

A full-width strip, 32 px high, at the top of the incident detail screen. Text is `meta-caps`, for example `IN PROGRESS · P2 · RESPONSE MET`. Do not put clock times in it (uppercase would damage "a.m." and "p.m.").

| Condition | Strip fill | Text |
|---|---|---|
| Normal | `--surface-2` | `--text-2` |
| Resolved or Verified | `--tint-green` | `--green` |
| At risk | `--tint-amber` | `--amber-text` |
| Breached | `--tint-red` | `--red` |

The strip is the one place a tinted fill is allowed.

### 10.10 Timeline (history)

A vertical `--line-2` line with ring nodes (§8.3). The newest node is filled `--text-1`; older nodes are hollow. Each entry: timestamp in `meta --text-3`, a one-line description in `body`, and the actor name when the API provides one. For employees, show only the public timeline the API returns. Never reveal internal events or previous and new values to employees.

### 10.11 Comments

Ruled entries, not chat bubbles: a 32 px monogram avatar (`--surface-3`, initials in `label`), the author (or a role label if no name is available), `meta` time, then the body. Information requests carry a small `--blue` "Information request" tag. Internal notes carry an `--amber` outlined "Internal" tag and are visible to staff only. Replies indent 24 px.

### 10.12 Navigation

- Desktop: 64 px glass top bar. Mark and wordmark left, role-appropriate text tabs centered (active tab: `--text-1` with a 2 px underline, others `--text-2`), right: bell with red signal dot, glass theme toggle, avatar menu.
- Mobile: a 56 px top bar (mark, bell) and a glass bottom tab bar (3 to 4 destinations, 24 px icons with labels, 56 px high plus the safe-area inset). The active item uses `--text-1`, others `--text-2`.
- Destinations by role: **Employee:** Home, Incidents, Notifications. **Technician:** Queue, Incidents, Notifications. **Admin:** Overview, Incidents, Reports, Setup.

### 10.13 Notifications (The Island)

Notifications are managed by **the Island**: a quiet, dynamic glass instrument anchored at top-center of the interface that spring-morphs between three states:
1. **Rest**: A compact glass pill (`--r-pill`, height 36 px) displaying the ring mark, and when unread notifications exist, the unread count in mono along with the 6 px red signal dot.
2. **Peek**: When a new notification arrives that has not been seen before, the Island expands to ~360 × 56 px showing priority marker, one message line, and relative time. It auto-collapses after 5 s (or 8 s on an SLA breach). Hover or focus pauses the timer. If multiple arrive together, it displays the newest with a `+N more` badge.
3. **Open**: Triggered by click, tap, or pressing `N`. Morphs into a floating glass card (`--r-xl`, max width 420 px, max height 70dvh with internal scroll) against a soft scrim. Lists the 20 most recent items with unread dots, relative timestamps in mono, "Also emailed" tags when delivered by email, and direct "Open incident" actions. Includes a "Mark all as read" button in the header. Dismissible via Escape, outside click, or swipe up.

Under reduced motion, morphing and pulsing are disabled in favor of an instantaneous crossfade (≤ 120 ms).

### 10.14 Dialog and sheet

Dialog: `--surface-2`, `--line-2` border, `--shadow-float`, radius `--r-xl`, max width 480 px, a scrim of `rgb(0 0 0 / 0.6)`. Sheet (mobile): bottom-anchored, top radius `--r-xl`, a 36 × 4 px grabber, safe-area padding, drag to dismiss. Focus moves in on open and returns on close. Escape closes.

**Confirmation pattern for destructive or irreversible actions:** a title stating the action, one sentence of consequence, then two buttons: the verb-specific action (Destructive variant) and "Cancel". Never "OK" or "Yes".

### 10.15 Toast

Glass, bottom-center (above the tab bar on mobile), one visible at a time. Success auto-dismisses after 4 seconds. Errors stay until dismissed. Use `aria-live="polite"` for success and `"assertive"` for errors. Include an action when there is a natural follow-up ("View incident").

### 10.16 Empty, loading, and error states

- **Empty:** a `serif-title` headline, one sentence of `body --text-2`, and one primary action. Dark mode may show a faint `--bloom`. No illustration, no emoji.
- **Loading:** skeletons that match the final layout. No spinner except inside a button.
- **Error:** specific, calm, with a way forward. Page-level errors use a `serif-title` headline, one sentence, and a "Try again" button. Always include the request ID from the API response in `meta --text-3` for support.

---

## 11. Screen compositions

These describe structure and intent. Build them with the components above.

### 11.0 Public landing page (the cinematic horizon moment)

```
┌──────────────────────────────────────────────┐
│ ◯• SERVICE DESK               [Sign in] [Get started] │  glass top bar
│                                              │
│            S E R V I C E   D E S K           │  display-brand, in deep sky (0–44%)
│  Every incident, from report to resolution.  │  display-xl headline
│  A quiet, precise service desk for teams.    │  lead sentence
│        [Get started]  [Sign in]              │  dual action CTAs
│                                              │
│  ENGINEERED FOR TEAMS THAT CANNOT AFFORD DOWNTIME│  floor tagline
├──────────────────────────────────────────────┤
│ ── The Journey: Sticky Lifecycle Bar ─────── │  Report → Close scroll progress
├──────────────────────────────────────────────┤
│ ── Roles Preview (Employee / Tech / Admin) ─ │  Real UI previews with live tokens
├──────────────────────────────────────────────┤
│ ── Capabilities: Editorial Hairline List ─── │  Impact matrix, routing, SLA alarms
├──────────────────────────────────────────────┤
│ ── The Island Strip (Notification Instrument)│  Interactive rest/peek/open demo
├──────────────────────────────────────────────┤
│ ── Closing CTA & Minimal Footer ──────────── │  Systems operational · copyright
└──────────────────────────────────────────────┘
```

- **Cinematic moment:** Hero uses `--horizon` gradient in Obsidian (and Ceramic daylight variant). Follow the strict placement rule in §4.6: all display text sits strictly in the upper 0% to 44% band where background contrast is ≥ 6.4:1. The floor holds the uppercase mono tagline.
- **Top bar:** Frosted glass, fixed/sticky with wordmark left, theme toggle and session-aware actions right ("Sign in" ghost + "Create account" primary; switches to "Open your workspace" if authenticated).
- **The journey:** Sticky `LifecycleBar` that fills as the visitor scrolls through the seven stages (Report, Assign, Acknowledge, Investigate, Resolve, Verify, Close). With reduced motion, shown static and complete.
- **Roles:** Segmented control toggling authentic UI previews for Employee, Technician, and Administrator using real design tokens and components (no screenshots, `aria-hidden` with accessible summary).
- **Capabilities:** Editorial hairline list separated by `--line-1` detailing dynamic priority scoring, dual routing strategies, SLA warning/breach escalation, tamper-evident audit trail, and notifications.
- **The Island strip:** Scripted demonstration of the Island notification instrument across Rest, Peek, and Open states.

### 11.1 Sign in and register (calm treatment)

```
┌──────────────────────────────────────────────┐
│ ◯• SERVICE DESK                      [ ◐ ]  │  wordmark left · glass theme button right
│                                              │
│                    •                         │  faint --bloom overhead
│                                              │
│        ┌─────────── glass panel ──────────┐  │  420 px, --r-xl
│        │ Sign in                          │  │  title-2
│        │ Email  [______________________]  │  │
│        │ Password [____________________]  │  │
│        │ [          Sign in           ]   │  │  primary, large
│        │ New here? Create an account      │  │
│        └──────────────────────────────────┘  │
│                                              │
│  Reliable service management. Engineered for clarity.│  eyebrow on floor
└──────────────────────────────────────────────┘
```

- Background is calm canvas `--bg` with a faint top-center `--bloom` and no `--horizon`.
- Centered glass panel (`.glass`, radius `--r-xl`, max-width 420 px) with smooth layout morphing between Sign in and Register.
- On submit, biometric reticle scanner smoothly morphs into an elastic checkmark before workspace entrance.
- Register is the same calm composition with fields for name, email, and password (minimum 12 characters). Never ask for a role.
- Authentication details (CSRF, form-encoded login) follow `docs/frontend-handoff.md`.

### 11.2 Employee home

1. `serif-title` greeting by time of day ("Good morning, Vatsal."). Time of day follows the user's local time.
2. Three stat tiles from `/dashboards/me`: **Active**, **Awaiting verification**, **Closed**, with `--bloom` faintly behind the row (dark).
3. A primary "Report an incident" button.
4. "Your incidents" list (cards on mobile, table on wide) with filters and the lifecycle bar.

### 11.3 Report an incident

A focused single-column form (max width 640 px) with progressive disclosure:
1. **What's happening:** title and description. As the user types, a non-blocking "Similar reports" panel appears beside or below the form (§12 for copy). If suggestions are unavailable (HTTP 503), show one quiet line and let them continue.
2. **Service and category:** native selects populated from the catalog.
3. **How serious is it?** Two segmented controls: impact (1–3) and urgency (1–3), each option with a one-line plain description. Labels must map to ascending values 1, 2, 3.
4. **Review and send:** a summary and a primary "Report incident" button. Success: a toast with the reference and a "View incident" action, and the check-draw moment.

### 11.4 Incident detail

```
┌──────────────────────────────────────────────────────────────┐
│ IN PROGRESS · P2 · RESPONSE MET                   (status strip)│
├────────────────────────────────────────┬───────────────────────┤
│ INC-000123                  meta       │ ┌ Next action ───────┐│
│ Payment application unavailable        │ │ [  Resolve  ]      ││
│ title-1                                │ └────────────────────┘│
│ ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬   │ Response    ▬▬▬▬  met │
│ Description …                          │ Resolution  ▬▬  01:12:40
│                                        │ Details: Service, …   │
│ History ○──● …                         │ (sticky)              │
│ Comments …                             │                       │
└────────────────────────────────────────┴───────────────────────┘
```

- The strip, then the reference (`meta`) and title, then the lifecycle bar, then the description.
- **The right column is sticky.** It holds exactly one prominent **Next action** (derived from role and status) and the SLA meters. Other actions live in an overflow menu. This is what makes the app feel guided rather than a form dump.
- The resolution narrative, when present, is set in `body-l` serif as a quote with a ring-node leader line.
- On compact screens the Next action becomes a sticky bottom bar above the tab bar.
- Optimistic-concurrency conflicts (HTTP 409): reload the incident and show "This incident changed while you were viewing it. We've loaded the latest version."

### 11.5 Technician queue

"Assigned to you" sorted by urgency (closest resolution deadline first, computed client-side from `resolutionDueAt`). A capacity meter shows `activeWorkload` of `capacity` as a segmented bar (one segment per slot, up to 10) with `meta` text "3 of 5". Each row shows the Next action inline (Acknowledge, Start investigation, Resolve) as a Ghost or Secondary button. Resolution suggestions appear on the detail screen as a quiet, advisory panel.

### 11.6 Admin overview and assignment

- Overview: four stat tiles (New and unassigned, Awaiting verification, At risk, Breached) linked to filtered lists, then the unassigned queue.
- Assignment: opens a **right drawer** (sheet on mobile). Header: a segmented control for the strategy (Skill-first / Load-first). Body: ranked candidates. Each row has a large rank numeral (`numeral` style, `--text-3`), the technician's name, a capacity segment bar ("2 of 5"), the reasons in `body-s`, and an "Assign" button. The top candidate is visually quiet, not highlighted. An empty candidate list is a valid result with its own empty state ("No one is eligible right now.") and a hint to check availability, capacity, and skills.
- Verification queue: Resolved incidents with the resolution narrative previewed; actions Verify and Reject resolution (Destructive) with a required reason.
- Reports: monochrome bar charts (§8.4) with a date-range control and a text-table fallback.
- Setup (skills, categories, services, SLA targets, technicians, users): a two-pane layout, list on the left and editor on the right (stacked on compact screens). SLA targets are edited as a four-row table (P1–P4) with response and resolution fields.

---

## 12. Voice and microcopy

**Tone: technical warmth.** Precise, calm, human. Short sentences. No hype, no apology theater, no jokes at the user's expense. Say what happened, what it means, and what to do next.

This section adopts the editorial rules of the Apple Style Guide (June 2026) for interface text, adapted to our context. Where we deliberately deviate, it is noted.

### 12.1 Rules

| Topic | Rule |
|---|---|
| **Contractions** | Use them: can't, isn't, you're, we're, don't, here's. Do not contract nouns ("The server's down" → "The server is down"). Avoid awkward ones (it'll, who've). |
| **"Please"** | Avoid it in instructions. Write "Follow the steps below", not "Please follow…". |
| **Capitalization** | **Sentence case** for headings, buttons, tabs, and menu items. *Deviation:* the Apple guide specifies title-style for button names in Apple's own UI; we use sentence case to match Nothing's guidance and our dark, editorial tone. Be consistent everywhere. Product and feature proper names stay capitalized. |
| **Sign in / out** | "Sign in" and "Sign out" (verbs), "sign-in" as a noun or adjective. Never "log in", "login" (as a verb), or "sign into". The backend route says `login`; the UI never does. |
| **Entering and choosing** | "Enter" for typing into a field ("Enter your email"). "Choose" for a menu or select item ("Choose a service"). Never "click on". Avoid naming the input device; name the action. |
| **Errors** | Do not use the phrase "error message" in product copy; describe what happened. Avoid "Oops", "Whoops", "failed" with no next step, and exclamation marks. |
| **OK** | Never "okay". Prefer a verb-specific button over "OK". |
| **Dialog** | Say "dialog", not "dialog box" (in docs and code comments too). |
| **Onscreen** | One word. |
| **Email** | One word. Addresses are `name@example.com`. |
| **"etc."** | Do not use. Write "and so on" or list the items. |
| **Ampersand** | Use "&" only when it is part of an onscreen name. Write "and" otherwise. |
| **Ellipsis** | Use the single character `…`, never three periods. Use it for in-progress states ("Saving…"). Do not append an ellipsis to a button name when you refer to it in running text. |
| **Numbers in prose** | Spell out one through nine ("three open incidents"). Use numerals for 10 and up, and always for units, times, IDs, and data ("3 min", "INC-000123"). Rephrase to avoid starting a sentence with a numeral. In stat tiles and tables, numerals always. |
| **Percent** | In prose, a numeral then the word: "5 percent". The `%` symbol is fine in tiles, tables, and charts. |
| **Dates** | Spell out the month: "November 8, 2026". Comma between day and year; with month and year only, no comma: "November 2026". Never "11/8/26". Use cardinal numbers with a month; ordinals ("the 8th") only without one. |
| **Times** | Numerals with lowercase "a.m." and "p.m." and a space: "10:45 a.m.". Ranges use an en dash: "10:00 a.m.–2:00 p.m.". Use "noon" and "midnight". |
| **Relative time** | Use for the last seven days ("2 hours ago", "yesterday"); show the full date and time in a tooltip or on the detail screen. Store and compare in UTC; display in the viewer's local time zone. |
| **Dark Mode** | A person turns Dark Mode on or off. Never say a device or app "is in Dark Mode". Theme options are labeled **Auto**, **Light**, **Dark**. |
| **Checkbox** | Do not instruct someone to "click a checkbox" (its state is ambiguous). Write "Select the checkbox" or name the setting ("Turn on email alerts"). |

### 12.2 Glossary (use exactly)

- **Incident** for the record, everywhere. The primary CTA is "Report an incident".
- **Technician**, **Administrator** (short form "admin" is fine in running UI text where space is tight), **Employee**.
- **Assign**, **Reassign**, **Acknowledge**, **Start investigation**, **Resolve**, **Verify**, **Reject resolution**, **Close**, **Reopen**.
- **Priority** with values P1 to P4. **SLA** is fine on first use with a tooltip: "Service level agreement".
- Status labels: New, Assigned, Acknowledged, In progress, Resolved, Verified, Closed.

### 12.3 Examples

| Instead of | Write |
|---|---|
| "Oops! Something went wrong." | "We couldn't save your changes. Check your connection and try again." |
| "Please enter a valid email!" | "Enter an email address like name@example.com." |
| "Log in" | "Sign in" |
| "Submit" | "Report incident" |
| "Invalid credentials" | "That email or password isn't right." |
| "Error 409: conflict" | "This incident changed while you were viewing it. We've loaded the latest version." |
| "Session expired" | "Your session ended. Sign in again to continue." |
| "No data" (employee, no incidents) | Title: "Nothing to report." Body: "When something stops working, report it here and track it to resolution." Action: "Report an incident" |
| "No eligible technician" | "No one is eligible right now. Check availability, capacity, and skills." |
| Suggestions unavailable (HTTP 503) | "Suggestions aren't available right now. You can still send your report." |
| "Are you sure you want to delete?" | Title "Reject this resolution?" Body "The incident returns to In progress and the technician is notified." Buttons "Reject resolution" / "Cancel" |
| Toast after assigning | "Assigned to Priya Nair." |
| Toast after reporting | "Incident INC-000123 reported." with action "View incident" |
| Greeting | "Good morning, Vatsal." |

### 12.4 Impact and urgency options (map to 1, 2, 3 in ascending order)

- **Impact:** 1 "One person", 2 "A team", 3 "A whole department or more".
- **Urgency:** 1 "Can wait", 2 "Soon", 3 "Right now".

---

## 13. Accessibility (required, not optional)

Target **WCAG 2.2 AA** as the minimum.

- **Contrast:** text 4.5:1, large text and graphics 3:1 (verified pairs in §4.5). Never convey meaning by color alone: status is dot plus label, priority is label plus outline, charts have text values.
- **Targets:** 44 × 44 px minimum on touch (Apple's guidance), 24 × 24 px absolute minimum elsewhere. Provide spacing between adjacent targets.
- **Keyboard:** everything works with the keyboard. Logical order. Visible focus (§10). Escape closes layers. Focus is trapped in dialogs and returned on close. Provide a skip link.
- **Semantics:** real `<button>`, `<a>`, `<table>`, `<th scope>`, `<label>`, landmarks, and heading order. Status changes and toasts use live regions.
- **Reduced motion, contrast, transparency:** honor `prefers-reduced-motion`, `prefers-contrast: more` (increase `--line-*` to 0.24 and 0.40 alpha and remove glass blur), and `forced-colors` (rely on system colors and visible borders).
- **Zoom and text size:** works at 200% zoom and with a larger default font size, with no horizontal scrolling at 320 CSS px wide.
- **Forms:** a visible label for every field, errors tied with `aria-describedby`, error summary at the top for multi-field failures, preserved input after errors.
- **Language and time:** set `lang`. Show time zones on detail screens where an SLA deadline is shown.

---

## 14. Implementation and review

### 14.1 Stack and structure

- **Allowed:** React, TypeScript, Vite, React Router, TanStack Query, `motion`, Radix UI primitives, `@phosphor-icons/react`, `clsx`. Dates via `Intl` (no moment.js). Styles via **CSS Modules + the tokens above**.
- **Not allowed:** component kits with their own look (MUI, Chakra, Ant Design), Tailwind default palette classes, arbitrary hex or pixel values in components, chart libraries, emoji fonts, icon packs other than Phosphor.
- If Tailwind is already present, map its theme to these tokens and forbid arbitrary values.

`AGENTS.md` lives at the **repository root** (Antigravity does not load rules from folders below the workspace folder). It is a short digest that points here. This file is 58 KB, which is over Antigravity's 24 KB per-rule limit, so it is read on demand rather than injected: agents MUST open it with a file read before any UI work.

```
AGENTS.md                      (repo root: short always-on digest)
frontend-react/
  DESIGN.md  design-refs/  design-tools/contrast.py
  src/
    styles/        tokens.css  base.css  typography.css
    components/ui/ Button Field Segmented Table Card StatTile LifecycleBar SlaMeter
                   StatusLabel PriorityMarker Timeline Comment Toast Dialog Sheet Nav …
    features/      auth  employee  technician  admin  notifications  reports
    lib/           api.ts (CSRF, errors, version)  format.ts (dates, relative time)
```

### 14.2 Definition of done for every screen

A screen is not done until all of these are true. State the evidence in the pull request.

1. Screenshots at **390, 768, and 1280** px in **both** themes.
2. No raw hex or pixel values outside `tokens.css` (search for `#[0-9a-f]{3,8}` in `src/**/*.css` and `.tsx`).
3. At most one cinematic moment (§2).
4. Loading, empty, error, and (where relevant) conflict states exist and follow §10.16.
5. Keyboard-only pass completed; focus is always visible.
6. Reduced motion verified: no movement, state still clear.
7. 200% zoom and 320 px width with no horizontal scroll.
8. All copy checked against §12 (sentence case, contractions, no "please", no exclamation marks, correct dates and times).
9. Only tokens, components, and fonts from this document were used.
10. Contrast verified for any new color pair with `design-tools/contrast.py`, and `--check` still passes.

### 14.3 Self-critique prompt (run before requesting review)

> Compare the screen to `design-refs/`. Is it quieter than it looks at first glance? Is there anything a template would also have? What is the single brightest element, and is it the right one? Which of the anti-patterns in §3 appears? Fix those before submitting.

---

## Appendix A. Reference images

Save the four CRED references in `design-refs/` with these names, and study them before building.

| File | What to take from it | Used for |
|---|---|---|
| `cred-1-garage-hero.png` | A deep sky that brightens to a luminous horizon over a dark floor. A widely tracked all-caps title with soft glow, placed in the deep band. A tiny tracked-caps tagline at the bottom. The mark top-left and a glass square button top-right. | Sign-in and register hero (§4.6, §11.1). |
| `cred-2-claims-status.png` | Pure black canvas. Three thin progress hairlines. A tinted status strip with tiny tracked caps. A single big colored word ("paid"). Mono-like caps section labels. A green success card. A bold, glowing headline with light subcopy. | Status strip (§10.9), lifecycle bar (§10.6), success moment, resolution card. |
| `cred-3-insurance-edge-light.png` | Tracked-caps eyebrow, bold headline, small right-aligned paragraph, and a leader line ending in a ring node pointing at the subject. | Timeline nodes (§10.10), annotation callouts (§8.3). |
| `cred-4-spends-ledger.png` | A **serif** screen title, a caps context label, a big numeral with a delta line, a secondary figure dimmed with smaller decimals, monochrome bars with one highlighted bar, single-letter month axis. | Dashboards, stat tiles (§10.5), reports (§8.4), serif usage (§5.3). |

**Ignore from the references:** the car and motorcycle imagery, CRED's logo, the rupee currency, and the all-lowercase text style.

## Appendix B. Sources and licensing

- **CRED:** four screenshots supplied by the project owner, used as visual reference for mood and structure only. No CRED assets, logos, or imagery are reproduced.
- **Nothing:** colors, grid rule, tone, and restraint principles from the community reference at nothing.wiki/nothing/brand_reference (an unofficial summary of Nothing's brand guidelines). The Nothing logotype, NType, NDot, Lettera Mono, and proprietary icons are not used.
- **Apple:** editorial rules from the Apple Style Guide, June 2026 (supplied by the project owner), applied to interface text. This is a writing guide, not the Human Interface Guidelines; interaction conventions in this document (44 px targets, springs, glass chrome, appearance modes) are common Apple-platform practice, adapted. SF Pro is not used.
- **Fonts:** Instrument Sans, Newsreader, and IBM Plex Mono are open-source (SIL Open Font License), self-hosted through Fontsource. **Icons:** Phosphor (MIT).
