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

## Milestone 5 — Location selection — not started

Debounced city and postal-code search, accessible result list, a current-location option, a graceful fallback when geolocation is denied, timezone-aware selected location, and persistence of the choice.

## Milestone 6 — Remaining cards — not started

Precipitation, Wind, Daily Forecast, Sun and UV, Atmospheric Details. Every card needs a ready state, loading state, error state, and unavailable-data state, plus unit-aware formatting, sensible mobile behavior, and an accessible text summary.

## Milestone 7 — Customization — not started

Edit mode, add-card drawer, remove-card action, card size controls, pointer reordering, keyboard reordering, move-up/move-down buttons, restore-defaults, persistence through Zustand browser storage, and safe hydration handling. This is the core feature of the product.

## Milestone 8 — Deployment and CI — in progress

GitHub Actions validation, Vercel Git integration with PR preview deployments, Open-Meteo attribution, and a location privacy note. Vercel is already connected and CI (`.github/workflows/ci.yml`) is running lint/typecheck/test/build on every PR and push to `main`. Attribution and privacy-note copy are not yet added anywhere in the UI.
