# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

See [ROADMAP.md](./ROADMAP.md) for the source of truth on what's done and what comes next.

See [PRD.md](./PRD.md) for the full product requirements: goals, non-goals, feature requirements with status, architecture, standing constraints, known limitations, and the definition of done.

## Commands

```bash
npm run dev         # Next dev server on http://localhost:3000
npm run build       # production build
npm run lint        # eslint (next/core-web-vitals)
npm run typecheck   # tsc --noEmit (strict)
npm run test        # vitest run — unit + component tests (jsdom)
npm run test:e2e    # playwright (Chromium)
```

Node >= 22 is required. CI (`.github/workflows/ci.yml`) runs lint → typecheck → test → build → e2e on every PR and push to `main`; all five must pass.

Running a single test:

```bash
npx vitest run tests/units.test.ts          # one file
npx vitest run -t "converts hPa to inHg"    # by test name
npx playwright test tests/e2e/home.spec.ts  # one e2e spec
```

E2E specifics: Playwright's `baseURL` must be `http://localhost:3000`, **not** `127.0.0.1` — Next blocks cross-origin dev resources, so a mismatched host silently prevents the client bundle from loading and tests then only assert server HTML. In CI the e2e suite runs against `npm run start` (the production build); locally it uses `npm run dev`. `PLAYWRIGHT_CHROMIUM_PATH` overrides the browser binary.

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
