# Roadmap

Source of truth for what's done and what's next. Work proceeds one milestone at a time.

## Milestone 1 — Scaffold — done

Next.js App Router project with TypeScript, Tailwind CSS, Zustand, dnd-kit, Recharts, Zod, Vitest, and Playwright wired up. No weather functionality yet.

## Milestone 2 — Mock-data UI — done

Card registry, card frame, and three cards (current conditions, comfort, hourly temperature) rendering against static mock Portland data.

## Milestone 3 — Open-Meteo provider and normalization — done

`lib/weather/providers/open-meteo.ts`, `lib/weather/normalize-open-meteo.ts`, `lib/weather/schemas.ts`, `lib/weather/weather-codes.ts`. Zod schemas validating upstream responses, conversion of Open-Meteo's parallel arrays into hourly objects, WMO weather-code mapping, missing-data handling, unit-aware request parameters, and test fixtures for valid, malformed, and partial responses. The provider is not imported by card components — cards only ever see the normalized `WeatherDashboardData` model.

## Milestone 4 — Internal API routes — done

`app/api/weather/route.ts` and `app/api/geocode/route.ts`. Query validation, coordinate bounds checking, normalized JSON responses, and consistent error shapes (`{ error: string }` on every failure path). No proxying of arbitrary external URLs by construction — the routes accept coordinates and a place name, never a URL.

Response caching is set via `Cache-Control` aimed at the CDN: weather `s-maxage=600` (Open-Meteo's current block updates every 15 min), geocoding `s-maxage=86400` (coordinates are effectively static), and `no-store` on every error so a transient upstream blip is never pinned. Request limits are a fixed-window per-IP limiter (30 requests/minute per route) returning 429 with `Retry-After`.

**Known limitation:** the rate limiter lives in process memory (`lib/rate-limit.ts`), so on serverless each instance keeps its own counters — the effective global ceiling is roughly limit x live instances, and counters reset when an instance recycles. It is a guardrail against a single client hammering one instance, not a strict global quota. A shared store (Redis/Vercel KV) would be needed for that, which this local-first MVP intentionally does not have.

## Milestone 5 — Location selection — done

Debounced city and postal-code search via an editable combobox (WAI-ARIA APG pattern), a current-location option with distinct messages for each geolocation failure mode, timezone-aware selected location, and persistence through Zustand with `skipHydration` so the first client render matches the server's.

## Milestone 6 — Remaining cards — done

All eight cards exist: Current Conditions, Comfort, Hourly Temperature, Precipitation, Wind, Daily Forecast, Sun and UV, Atmospheric Details. The four states are enforced by a shared `CardBoundary` and verified by a test that walks the registry, so a card added later without them fails automatically.

Unit-aware formatting is handled by `lib/weather/units.ts` with an imperial/metric toggle persisted alongside the location. The internal model stays imperial (matching its `...F`/`...Mph` field names) and unit choice is purely presentational — switching units re-renders rather than re-fetches.

`forecast_days` was raised from 1 to 7, which was the blocker preventing the Daily Forecast card from being buildable at all.

**Known gap:** air quality still reads "Unavailable" — it comes from Open-Meteo's separate air-quality API, which this provider does not call.

## Milestone 7 — Customization — done

Edit mode, add-card drawer, remove-card action, card size controls, pointer reordering (dnd-kit), keyboard reordering, move-up/move-down buttons, restore-defaults, and persistence through Zustand browser storage.

Reordering never depends on dragging: every card carries labelled move-earlier/move-later buttons that name the card, and dnd-kit's keyboard sensor gives arrow-key dragging for those who want it. Edit mode is transient and deliberately not persisted, so a reload never reopens it.

Persisted layouts are reconciled against the card registry on load (`lib/weather/card-layout.ts`), so a layout saved by an older version referencing a card that no longer exists degrades to the remaining valid cards rather than rendering a hole or crashing.

**Fixed here:** the Playwright suite was pointing at `127.0.0.1` while the Next dev server treats `localhost` as its origin. Next blocks cross-origin dev resources, so the client bundle never loaded and the e2e tests were only ever exercising server-rendered HTML — no hydration, no interactivity. Dev-only (production was unaffected), but it meant the e2e suite was substantially weaker than it looked.

## Milestone 8 — Deployment and CI — done

GitHub Actions runs lint, typecheck, unit tests, build, and now the Playwright end-to-end suite on every PR and push to `main`. Vercel is connected with per-PR preview deployments and production deploys from `main`.

Open-Meteo attribution and the location privacy note are in `components/dashboard/site-footer.tsx`. Open-Meteo publishes under CC BY 4.0, which requires crediting the source, linking the licence, and indicating that changes were made — all three are covered, since this app converts units and reshapes the response.

E2E runs against the **production build** in CI rather than the dev server, so it exercises the artifact that actually ships. `PLAYWRIGHT_CHROMIUM_PATH` overrides the browser binary for environments that provide their own.

## v2 — Visual identity, saved locations, air quality — done

A round of product work after v1.0 shipped.

- **Design tokens + dark mode.** `app/globals.css` defines semantic tokens (`--canvas`, `--card`, `--ink`, `--muted`, `--line`, `--accent`, plus chart and severity scales) mapped into Tailwind, so components use `bg-card`/`text-ink` rather than palette classes. Dark mode follows the system by default with a Light/Auto/Dark override, applied before first paint by an inline script in `app/layout.tsx` so there is no flash. Both palettes are verified against WCAG AA.
- **Weather-reactive hero.** `lib/weather/atmosphere.ts` maps condition + day/night onto the sky behind a new hero. Purely decorative — the condition and day/night are also stated in words. In dark mode the night palette is always used, so a bright hero never lands on a dark page.
- **Saved locations.** Keep up to 8 places and switch between them; every control names its location.
- **Air quality.** Closes the long-standing gap. `lib/weather/providers/open-meteo-air-quality.ts` calls Open-Meteo's separate air-quality host; `app/api/weather/route.ts` settles both upstreams independently so air quality can fail without taking the forecast down. Fills the previously always-null `ComfortMetrics.airQualityIndex` and adds an Air Quality card.
- **Layout presets.** Commuter, Cyclist, Gardener, and Everything, built from the PRD's personas.

**Bug fixed along the way:** times rendered in the *viewer's* timezone rather than the location's, so looking up another city showed its sunrise at your own local hour. `formatTime`/`formatHour` now take the location's IANA zone.
