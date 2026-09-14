# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

See [ROADMAP.md](./ROADMAP.md) for the source of truth on what's done and what comes next.

See [PRD.md](./PRD.md) for the full product requirements: goals, non-goals, feature requirements with status, architecture, standing constraints, known limitations, and the definition of done.

## Project structure

```
app/                      Next.js App Router. page.tsx (static shell) + layout.tsx (theme script) +
                           api/weather, api/geocode route handlers. No other pages — this is a
                           single-dashboard app.
components/
  dashboard/               Dashboard shell, menu, arrange-mode toolbar, hero, card grid/sorting.
  weather/                 One file per card + card-registry.tsx (the extension point) +
                           card-frame.tsx (shared loading/error/unavailable/ready states).
  location/                Location search and the change-location dialog.
  onboarding/               First-run flow.
lib/
  weather/                 Domain logic: schemas (Zod), providers (Open-Meteo fetch), normalizer,
                           types (WeatherDashboardData — the only shape cards see), units, metrics,
                           card-layout (registry/defaults/presets), activity-windows, share-link.
  hooks/                   use-weather-data, use-has-hydrated, use-dialog-focus, use-escape-key, etc.
  api/http.ts              jsonError() — the shared { error: string } response shape.
  rate-limit.ts, theme.ts  Cross-cutting utilities.
store/dashboard-store.ts   Single Zustand store: location, saved locations, units, theme, card
                           layout, activities, hasOnboarded (persisted) + isEditing (transient).
tests/                     Flat directory, mirrors lib/components by filename (not colocated).
  e2e/                     Playwright specs + support.ts helpers.
  fixtures/open-meteo/     Recorded upstream JSON used by provider/schema tests.
.claude/agents/            Subagent definitions (feature-researcher, ui-critic) used for research
                           and UI-review passes — read-only, write to findings/.
findings/                  Dated research/critique reports produced by the above subagents.
ROADMAP.md, PRD.md         Source of truth for status and requirements — check before planning work.
```

## Tech stack

- **Next.js 16** (App Router, Turbopack) — see the "not the Next.js you know" note below before
  touching routing, config, or any Next API.
- **React 19**, **TypeScript** (`strict: true`, path alias `@/*` → repo root).
- **Tailwind CSS 4** via `@tailwindcss/postcss`; semantic design tokens in `app/globals.css`.
- **Zustand 5** (`persist` + `skipHydration`) for all client state — no other state management.
- **Zod 4** for schema validation of upstream JSON and API route query params.
- **@dnd-kit** (core/sortable/modifiers/accessibility/utilities) for drag reordering; tap-to-place
  is a from-scratch keyboard/pointer-agnostic alternative alongside it, not built on dnd-kit.
- **Recharts** for charts, always paired with a text/table equivalent (accessibility requirement).
- **Vitest 4** + **@testing-library/react** + **jsdom** for unit/component tests.
- **Playwright 1.6x** + **@axe-core/playwright** for e2e and accessibility scans.
- **ESLint 9** (`eslint-config-next/core-web-vitals`), no other lint config.
- Data source: **Open-Meteo** (forecast + air quality + geocoding), free/non-commercial tier — no
  API key, no paid radar/alerts data. Node ≥ 22 required.

## Conventions

- **Named exports only** — no `export default` anywhere in `components/`, `lib/`, or `store/`.
- **Filenames kebab-case**, matching the component/hook name (`daily-forecast-card.tsx` →
  `DailyForecastCard`; `use-weather-data.ts` → `useWeatherData`).
- **Comments explain *why*, not *what*** — a hidden constraint, a rejected alternative, a subtle
  invariant. Well-named code and JSDoc-style block comments above functions/components carry the
  "what"; inline comments are rare and load-bearing when present. Match this style rather than
  adding routine comments.
- **Cards never see third-party shapes** — every card reads only `WeatherDashboardData`
  (`lib/weather/types.ts`). Adding a card means: add it to `weatherCardRegistry`
  (`components/weather/card-registry.tsx`), add its id to `ALL_CARD_IDS`
  (`lib/weather/card-layout.ts`), and bump the persist `version` in `store/dashboard-store.ts`.
- **Never invent data** — a missing upstream field becomes `null` and the card renders its
  "unavailable" state (via `CardBoundary`), never a fabricated value.
- **Tests are flat, not colocated**: `tests/<name>.test.ts(x)` mirrors the source file's base name
  regardless of its directory (`lib/weather/units.ts` → `tests/units.test.ts`). E2e specs live in
  `tests/e2e/*.spec.ts`. A registry-walking test (`tests/weather-cards.test.tsx`) enforces that
  every card in the registry has all four `CardBoundary` states, so a new card without them fails
  automatically.
- **Accessibility is enforced, not aspirational**: every interactive path has a non-drag/non-mouse
  equivalent (keyboard move buttons alongside dnd-kit dragging, tap-to-place alongside both), no
  information is conveyed by colour alone, and `tests/e2e/accessibility.spec.ts` runs an axe scan
  (serious/critical only) over every major UI state — extend that file when adding a new state.
- **No new dependencies without discussion.** Local-first: no auth, no database, no accounts —
  preferences live in `localStorage`; the only "sync" mechanism is a self-contained shareable link
  (`lib/weather/share-link.ts`).

## Common commands

```bash
npm run dev         # Next dev server on http://localhost:3000
npm run build       # production build
npm run lint        # eslint (next/core-web-vitals)
npm run typecheck   # tsc --noEmit (strict)
npm run test        # vitest run — unit + component tests (jsdom)
npm run test:e2e    # playwright — chromium (full suite) + mobile-chrome/webkit (scoped, see below)
npm run qa          # lint + typecheck + test + build + full playwright run — the whole local gate
```

Node >= 22 is required. CI (`.github/workflows/ci.yml`) has two jobs on every PR and push to `main`:
`build-and-test` (audit → lint → typecheck → test → build → e2e) and `qa` (build → `qa-smoke.spec.ts`
+ `accessibility.spec.ts` against the production build). `npm audit --audit-level=high` blocks on
high/critical advisories only.

Running a single test:

```bash
npx vitest run tests/units.test.ts          # one file
npx vitest run -t "converts hPa to inHg"    # by test name
npx playwright test tests/e2e/home.spec.ts  # one e2e spec
```

## Known gotchas / in-progress decisions

- **E2E `baseURL` must be `http://localhost:3000`, not `127.0.0.1`** — Next blocks cross-origin dev
  resources, so a mismatched host silently prevents the client bundle from loading and tests then
  only assert server HTML.
- **Playwright projects**: `chromium` runs the full `tests/e2e/**` suite; `mobile-chrome` (Pixel 7)
  and `webkit` are scoped via `testMatch` to `accessibility.spec.ts` and `customization.spec.ts`
  only — the two specs with width- or engine-dependent behaviour (arrange-mode/drag controls).
  Don't assume a new e2e spec runs on all three projects; add it to the `testMatch` regex if it needs to.
- `PLAYWRIGHT_CHROMIUM_PATH` overrides the Chromium binary for environments that ship their own and
  forbid downloading one (applied per-project so it never hands WebKit a Chromium binary).
- In CI the e2e suite runs against `npm run start` (the production build); locally it uses
  `npm run dev`.
- **Bump `store/dashboard-store.ts`'s persist `version`** whenever the persisted shape changes
  (new card id, changed field shape, etc.) — `merge`/`reconcileLayout` handle migrating or falling
  back, but only if `version` actually changed.
- **Check `node_modules/next/dist/docs/` before touching routing/config/any Next API** — this
  project pins a Next.js version with breaking changes from what most training data reflects. The
  `<!-- BEGIN:nextjs-agent-rules -->…`  block at the end of this file is regenerated by `next dev`
  on every run; commit it along with your other changes rather than reverting it.
- **The internal weather model is always imperial** (`temperatureF`, `windMph`, …); unit choice
  (`lib/weather/units.ts`) is purely presentational and never triggers a re-fetch.
- Historical/past weather is an explicit **non-goal** (PRD §3) — don't build backward-looking views.

## Architecture

### Rendering model — static shell, client-fetched weather

`app/page.tsx` is a static shell that renders `<Dashboard>` (a client component). There is no server-rendered weather: the location and card layout live in client-only, `localStorage`-persisted preferences the server cannot see, so the browser fetches the forecast after mount via `/api/weather`.

### Weather data pipeline

```
Open-Meteo API
  → Zod schemas            lib/weather/schemas.ts        (validate or reject upstream JSON)
  → provider               lib/weather/providers/*.ts    (fetch + throw typed errors)
  → normalizer             lib/weather/normalize-open-meteo.ts  (parallel arrays → per-hour objects, WMO codes, unit math)
  → WeatherDashboardData   lib/weather/types.ts          (the ONLY shape the UI ever sees)
  → route handler          app/api/weather/route.ts
  → useWeatherData hook    lib/hooks/use-weather-data.ts
  → cards                  components/weather/*-card.tsx
```

**Load-bearing rule:** cards never receive a third-party API response — only `WeatherDashboardData`. Swapping Open-Meteo for another source should touch the provider and normalizer only, with zero card changes. A registry-walking test enforces adjacent invariants.

Other standing constraints (see PRD §5.3):
- One shared weather request per forecast, handed to every card. Cards never fetch for themselves.
- External API calls happen only in route handlers, never in browser components. The browser calls our routes; our routes call Open-Meteo.
- Never invent data: a missing upstream field becomes `null` and the card renders its "unavailable" state; individual hourly points with missing data are dropped, not interpolated.
- The internal model is always imperial (field names like `temperatureF`, `windMph`). Unit choice (`lib/weather/units.ts`) is purely presentational — switching units re-renders, never re-fetches.
- No new dependencies without discussion. Local-first: no auth, no database, no accounts.
- Check current Next docs in `node_modules/next/dist/docs/` before changing an integration (see the block below).

### Cards and the registry

`components/weather/card-registry.tsx` is the single extension point for cards — the dashboard has no per-card conditionals. Each card renders only its ready state and wraps it in `CardBoundary` (`components/weather/card-frame.tsx`), which supplies the loading / error / unavailable / ready states. `tests/weather-cards.test.tsx` walks the registry, so a card added without those states fails automatically.

**To add a card:** add its definition to `weatherCardRegistry`, add its id to `ALL_CARD_IDS` in `lib/weather/card-layout.ts`, and bump the persist `version` in `store/dashboard-store.ts`.

### Client state and hydration

`store/dashboard-store.ts` is a Zustand store with `persist` and `skipHydration: true`. It holds location, saved locations, unit system, theme, and card layout; `isEditing` is transient and deliberately not persisted.

Because of `skipHydration`, the store rehydrates explicitly after mount via `useHasHydrated` (`lib/hooks/use-has-hydrated.ts`, built on `useSyncExternalStore` with a server snapshot), keeping the first client render identical to the server's. The card grid renders a neutral placeholder until hydration completes so a saved layout never flashes as the defaults first.

`partialize` persists preferences only. `merge` reconciles the saved layout against the current registry (`reconcileLayout` — unknown ids dropped, empty result falls back to defaults) and re-validates the persisted theme, because a stale layout or bad theme value would otherwise reach the pre-paint script. Bump `version` whenever the persisted shape changes.

### Theming and design tokens

`app/globals.css` defines semantic tokens (`--canvas`, `--card`, `--ink`, `--muted`, `--line`, `--accent`, plus chart and severity scales) mapped into Tailwind. Use `bg-card` / `text-ink`, not raw palette classes. Both light and dark palettes are verified against WCAG AA.

Dark mode follows the system with a Light / Auto / Dark override. An inline script in `app/layout.tsx` sets `data-theme` before first paint (no flash); `Dashboard` keeps the attribute in sync when the user changes it afterward. `prefers-reduced-motion` is handled globally in `globals.css` so it also covers Recharts and dnd-kit.

### API routes

`app/api/weather/route.ts` (forecast by coordinates) and `app/api/geocode/route.ts` (place-name search). Both: Zod query validation, coordinate bounds (±90 / ±180), a consistent `{ error: string }` shape via `jsonError` (`lib/api/http.ts`), and `Cache-Control` aimed at the CDN (`s-maxage`) — weather 600s, geocode 86400s, every error `no-store`. Routes accept coordinates and names, never a URL, so they cannot proxy arbitrary hosts.

Rate limiting: a fixed-window per-IP limiter (`lib/rate-limit.ts`), 30 requests/minute per route, returning 429 + `Retry-After`. It lives in process memory, so on serverless each instance keeps its own counters — a guardrail against one client hammering one instance, not a global quota.

The weather route settles the forecast and air-quality upstreams independently with `Promise.allSettled`: air quality is supplementary and its failure must not take down a good forecast. Only the forecast is allowed to fail the request.

### Accessibility is a build requirement

Every customization action works by keyboard alone — each card carries labelled move-earlier / move-later buttons alongside dnd-kit dragging. Every chart has a text or table equivalent. No information is conveyed by colour alone (UV risk, wind strength, pressure trend all carry words). Keep this parity when touching cards or edit mode.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Maintenance
After completing a task that changes project structure, introduces a new convention, or changes how something should be built or tested, update the relevant section above before finishing — terse, one line, not a paragraph.

Do not update this file after every task. Skip it for one-off fixes, small bug patches, or anything that won't recur. Only update when something durable about the project changed.
