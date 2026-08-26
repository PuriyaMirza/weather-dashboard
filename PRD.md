# Weather Dashboard — Product Requirements Document

**Version:** 2.0 · **Last updated:** 26 August 2026 · **Reflects:** `main` after the v2 visual identity work

**Status key used throughout:**

| Label | Meaning |
|---|---|
| ✅ **Complete** | Built, tested, merged to `main` |
| 🟡 **In progress** | Partially built, or built but not yet merged |
| ⬜ **Not started** | No implementation exists |

See [ROADMAP.md](./ROADMAP.md) for the milestone-by-milestone execution order. This document covers the *what* and *why*; the roadmap covers the *when*.

---

## 1. Product summary

A **customizable weather dashboard**. The user sees a grid of weather cards and controls which ones appear — adding, removing, reordering, and resizing them — with their layout remembered between visits. It runs on free Open-Meteo data, works on phones and desktops, and treats accessibility as a build requirement rather than a later cleanup pass.

**The distinguishing feature is customization.** Plenty of sites show the weather; this one lets each person decide what "the weather" means to them — a cyclist wants wind and precipitation, a gardener wants UV and humidity, a commuter just wants the next six hours.

**One-line pitch:** *Your weather, showing only what you actually care about.*

**Current overall status: ✅ v1.0 complete.** Every milestone is merged and all ten definition-of-done criteria are met.

---

## 2. Status snapshot

| # | Milestone | Status | Notes |
|---|---|---|---|
| 1 | Scaffold | ✅ Complete | Next.js + TypeScript + Tailwind + tooling |
| 2 | Mock-data UI | ✅ Complete | Card registry, card frame, 3 cards |
| 3 | Open-Meteo provider & normalization | ✅ Complete | Validation, WMO codes, missing-data handling |
| 4 | Internal API routes | ✅ Complete | Caching, rate limits, consistent error shapes |
| 5 | Location selection | ✅ Complete | Accessible combobox search, geolocation, persisted |
| 6 | Remaining cards | ✅ Complete | All 8 cards, plus the imperial/metric unit system |
| 7 | **Customization** | ✅ Complete | **The core product feature** — add/remove/reorder/resize, persisted |
| 8 | Deployment & CI | ✅ Complete | CI (incl. e2e) + Vercel; attribution and privacy note shipped |

**Blunt read:** the product described at the top now exists. A visitor picks any location, chooses which of eight cards to show, reorders and resizes them by mouse or keyboard, and finds it all as they left it next visit. Remaining work is genuine enhancement, not missing basics — see §9.

---

## 3. Goals and non-goals

### Goals

| Goal | Status |
|---|---|
| Show accurate current, hourly, and daily weather from a free source | ✅ Complete |
| Let users choose which cards appear, and in what order and size | ✅ Complete |
| Remember each user's layout across visits | ✅ Complete |
| Let users pick their location | ✅ Complete |
| Work equally well on mobile and desktop | 🟡 Responsive across all eight cards; not yet tested on real devices or at small viewports in CI |
| Be fully usable by keyboard and screen reader | 🟡 Every feature is keyboard-operable and chart data has text equivalents; no automated a11y check or real screen-reader testing yet (see §7, F8) |
| Stay within Open-Meteo's free non-commercial tier | ✅ Caching + rate limits in place |

### Non-goals (deliberately excluded)

| Non-goal | Rationale |
|---|---|
| User accounts, login, authentication | Local-first MVP; nothing to protect |
| Server-side database | Preferences live in the browser |
| Cross-device sync | Follows from having no accounts or database |
| Commercial use | Open-Meteo free tier is non-commercial only |
| Weather alerts / severe warnings | Not offered by the chosen data source |
| Historical weather or climate data | Out of scope for a "today" dashboard |
| Native mobile apps | Responsive web only |

---

## 4. Users and scenarios

*Inferred from the project brief — not from user research. Treat as working assumptions, not validated findings.*

| User | Need | Cards they'd keep |
|---|---|---|
| **Commuter** | Will I get rained on in the next few hours? | Hourly Temperature, Precipitation |
| **Cyclist / runner** | Is it windy, and how will it actually feel? | Wind, Current Conditions, Comfort |
| **Gardener** | Frost risk, sun exposure, humidity | Daily Forecast, Sun & UV, Comfort |
| **Person with light sensitivity or asthma** | UV and air quality | Sun & UV, Atmospheric Details |
| **Keyboard / screen-reader user** | Full control without a mouse or charts | All — via text alternatives and button-based reordering |

**Primary scenario (target end state):** A user opens the dashboard, sees a default set of cards for their location, enters edit mode, removes cards they don't care about, adds two they do, drags one to the top (or uses move-up buttons), makes it full-width, and leaves. Next visit, it's exactly as they left it.

**This is now the actual behaviour**, not a target. The default layout is four curated cards; the other four are one click away in the add-card drawer.

---

## 5. Architecture

### 5.1 Stack

| Layer | Technology | Status |
|---|---|---|
| Framework | Next.js (App Router) 16.3.0 | ✅ |
| Language | TypeScript 6.x, `strict: true` | ✅ |
| Styling | Tailwind CSS 4.x | ✅ |
| Client state | Zustand 5.x (with `persist`) | ✅ Location, units, and card layout |
| Drag & drop | dnd-kit | ✅ Pointer and keyboard reordering |
| Charts | Recharts 3.x | ✅ Hourly Temperature and Precipitation |
| Validation | Zod 4.x | ✅ |
| Unit tests | Vitest + jsdom + Testing Library | ✅ 198 tests, 18 files |
| E2E tests | Playwright (Chromium) | ✅ 4 tests, running in CI against the production build |
| Hosting | Vercel | ✅ |
| Weather data | Open-Meteo (free, no API key) | ✅ |

### 5.2 Data flow

```
Open-Meteo API
      ↓  (raw JSON: parallel arrays, WMO integer codes)
Zod schemas               lib/weather/schemas.ts
      ↓  (validated, or rejected with a clear error)
Provider                  lib/weather/providers/open-meteo.ts
      ↓
Normalizer                lib/weather/normalize-open-meteo.ts
      ↓  (WeatherDashboardData — the ONLY shape the UI ever sees)
Route handler             app/api/weather/route.ts
      ↓  (one HTTP response per location change)
useWeatherData hook       lib/hooks/use-weather-data.ts
      ↓  (props, identical for every card)
Cards                     components/weather/*-card.tsx
```

**The load-bearing rule:** cards never see a third-party API response. They only ever receive `WeatherDashboardData`. Swapping Open-Meteo for another provider would touch the provider and normalizer files only — zero card changes. ✅ **Enforced today.**

### 5.3 Standing architectural constraints

| # | Constraint | Status |
|---|---|---|
| 1 | Third-party responses never reach UI components | ✅ Enforced |
| 2 | One shared weather request per forecast, distributed to all cards — never one per card | ✅ Enforced |
| 3 | External API calls go through Next.js route handlers, not browser components | ✅ Enforced — the browser calls our routes, never Open-Meteo directly |
| 4 | New cards are added via the card registry, not hardcoded conditionals | ✅ Enforced |
| 5 | Accessibility must not depend on dragging or charts | ✅ Enforced — move buttons alongside drag, data tables alongside charts |
| 6 | Local-first: no auth, no database, no accounts | ✅ Held |
| 7 | No new dependencies without discussion | ✅ Held — no deps added since scaffold |
| 8 | Check current official docs before changing an integration | ✅ Practiced |

> **Note on rendering:** the page is a **static shell** and weather is fetched in the browser, because the location and layout live in client-only preferences the server cannot see. The trade-off is no server-rendered weather on first paint, accepted because a personal dashboard driven by local preferences cannot meaningfully server-render them.

---

## 6. Data model ✅ Complete

The internal model every card consumes (`lib/weather/types.ts`):

| Type | Fields | Notes |
|---|---|---|
| `WeatherDashboardData` | `location`, `current`, `comfort`, `hourly[]`, `updatedAt`, `source` | Root object. `current` and `comfort` are **nullable** — missing upstream data yields `null`, never a fabricated number |
| `WeatherLocation` | `name`, `region`, `country`, `timezone`, `latitude`, `longitude` | |
| `CurrentConditions` | `observedAt`, `condition`, `conditionLabel`, `temperatureF`, `feelsLikeF`, `highF`, `lowF`, `windMph`, `windDirection`, `precipitationChance` | |
| `ComfortMetrics` | `humidityPercent`, `dewPointF`, `uvIndex`, `visibilityMiles`, `pressureInHg`, `airQualityIndex` | `uvIndex` and `airQualityIndex` nullable |
| `HourlyTemperaturePoint` | `time`, `temperatureF`, `feelsLikeF`, `precipitationChance`, `condition` | |
| `WeatherCondition` | `sunny \| partly-cloudy \| cloudy \| rain \| snow \| storm \| fog` | Mapped from WMO code table 4677 |

**Design principle — never invent data.** If a required field is missing upstream, that slice becomes `null` and the card renders its "unavailable" state. Individual hourly points with missing data are dropped rather than interpolated. ✅ Implemented and tested.

---

## 7. Feature requirements

### F1 — Dashboard shell and card system ✅ Complete

| Requirement | Status |
|---|---|
| Responsive card grid (1-col mobile, 2-col desktop) | ✅ |
| Card registry drives rendering; no per-card conditionals in the page | ✅ |
| Shared `CardFrame` giving every card consistent heading structure | ✅ |
| Cards support `single` and `wide` column spans | ✅ |
| Every card implements ready / loading / error / unavailable states | ✅ For the 3 existing cards |

### F2 — Weather data pipeline ✅ Complete

| Requirement | Status |
|---|---|
| Zod validation of every upstream response | ✅ |
| Array-length consistency checks (Open-Meteo returns parallel arrays that must align with its `time` array) | ✅ |
| Convert parallel arrays → per-hour objects | ✅ |
| WMO weather-code → condition + human label, with safe fallback for unknown codes | ✅ |
| Unit conversions: hPa→inHg, metres→miles, degrees→compass point | ✅ |
| Timestamps: Open-Meteo returns naive local time + a separate UTC offset; normalizer produces proper offset-qualified ISO strings | ✅ |
| Missing-data handling that never fabricates values | ✅ |
| Test fixtures: valid, malformed, partial | ✅ |
| Provider never imported by card components | ✅ |

### F3 — Internal API layer ✅ Complete

| Requirement | Status |
|---|---|
| `GET /api/weather` — forecast by coordinates | ✅ |
| `GET /api/geocode` — place-name search | ✅ |
| Zod query validation; coordinate bounds checked (±90 / ±180) | ✅ |
| Consistent error shape `{ error: string }` on every failure path | ✅ |
| No proxying of arbitrary external URLs (routes accept coordinates/names, never a URL) | ✅ By construction |
| Response caching — weather `s-maxage=600`, geocoding `s-maxage=86400`, errors `no-store` | ✅ |
| Request limits — 30/min per client IP, `429` + `Retry-After` | ✅ *(with a real caveat — see §9.2)* |

### F4 — Location selection ✅ Complete

| Requirement | Status |
|---|---|
| Debounced city search | ✅ |
| Postal-code search | ✅ |
| Accessible results list (keyboard navigable, screen-reader announced) | ✅ |
| "Use my current location" via browser geolocation | ✅ |
| Graceful fallback when geolocation is denied or unavailable | ✅ |
| Timezone-aware selected location | ✅ Timezone resolved from coordinates by the forecast request |
| Persist chosen location | ✅ |

> Portland remains the *default* for a first-time visitor, but it is now a starting point rather than a limit.

### F5 — Card catalogue ✅ Complete — 8 of 8

| Card | Status | Data available today? |
|---|---|---|
| Current Conditions | ✅ Complete | ✅ Yes |
| Comfort | ✅ Complete | ✅ Yes — including air quality |
| Hourly Temperature | ✅ Complete | ✅ Yes |
| Precipitation | ✅ Complete | ✅ Yes |
| Wind | ✅ Complete | ✅ Yes |
| Daily Forecast | ✅ Complete | ✅ Yes — `forecast_days` raised from 1 to 7 |
| Sun & UV | ✅ Complete | ✅ Yes |
| Atmospheric Details | ✅ Complete | ✅ Yes |

Every card ships with a ready, loading, error, and unavailable-data state, enforced by a shared `CardBoundary` and verified by a test that walks the registry — so a card added later without them fails automatically.

### F6 — Customization ✅ Complete — **the core product feature**

| Requirement | Status |
|---|---|
| Edit mode toggle | ✅ |
| Add-card drawer showing available cards | ✅ |
| Remove-card action | ✅ |
| Card size controls (single/wide) | ✅ |
| Pointer reordering (drag & drop, via dnd-kit) | ✅ |
| Keyboard reordering | ✅ |
| Move-up / move-down buttons as a drag-free alternative | ✅ |
| Restore-defaults action | ✅ |
| Persistence via Zustand browser storage | ✅ |
| Safe hydration handling (no server/client mismatch flash) | ✅ |

> **How hydration was handled:** the store uses `skipHydration` and rehydrates after mount, so the first client render matches the server's exactly. Until that completes the grid shows a neutral placeholder rather than the default layout, so a saved layout never visibly flashes as something else first. `useHasHydrated` is built on `useSyncExternalStore` with an explicit server snapshot.

### F7 — Persistence ✅ Complete

| Requirement | Status |
|---|---|
| Card layout (which cards, order, sizes) persisted locally | ✅ |
| Selected location persisted locally | ✅ |
| Schema versioning so a future layout change doesn't corrupt saved state | ✅ `version: 3` plus a `merge` that reconciles saved layouts against the registry |
| Graceful handling when storage is unavailable or disabled | ✅ |

A saved layout referencing a card this version no longer has degrades to the remaining valid cards rather than rendering a hole; one that reconciles to nothing falls back to defaults. Measurement units persist alongside. Edit mode is deliberately *not* persisted, so a reload never reopens it.

### F8 — Accessibility 🟡 Largely complete *(cross-cutting requirement)*

| Requirement | Status |
|---|---|
| Semantic headings and landmarks | ✅ |
| `aria-labelledby` / `aria-label` on cards and regions | ✅ |
| `role="status"` / `role="alert"` on loading and error states | ✅ |
| Text alternative for every chart | ✅ Hourly chart has a screen-reader-only data table |
| Large temperature glyph has a readable label (`"72 degrees Fahrenheit"`, not `"72°"`) | ✅ |
| Never use colour as the only signal | ✅ UV risk, wind strength, cloud cover, and pressure trend all carry words, not just colour or a glyph |
| Keyboard reordering + move-up/down buttons alongside drag | ✅ Both, and every control names its card |
| Respect `prefers-reduced-motion` | ✅ Complete — handled globally in `globals.css` |
| Focus management in edit mode and the add-card drawer | ✅ Focus moves into the drawer on open; Escape closes it |
| Automated accessibility testing in CI | ⬜ Not set up — the strongest remaining a11y gap, since current coverage asserts intent rather than scanning for violations |

### F9 — Deployment, CI, and compliance ✅ Complete

| Requirement | Status |
|---|---|
| GitHub Actions running lint, typecheck, test, build on every PR and push to `main` | ✅ |
| Node 22 with npm caching | ✅ |
| Vercel Git integration with per-PR preview deployments | ✅ |
| Production deploys from `main` | ✅ |
| **Open-Meteo attribution displayed in the UI** | ✅ Complete — source, CC BY 4.0 licence link, and a note that data is modified |
| **Location privacy note** | ✅ Complete |
| E2E tests running in CI | ✅ Complete — runs against the production build |

---

## 8. Non-functional requirements

| Area | Requirement | Status |
|---|---|---|
| **Data freshness** | Weather no more than ~10 min stale | ✅ `s-maxage=600` |
| **Upstream quota** | Stay under Open-Meteo's ~10k requests/day non-commercial limit | ✅ CDN caching collapses bursts into one upstream call |
| **Abuse resistance** | No single client can exhaust the quota | 🟡 Guardrail only — see §9.2 |
| **Error transparency** | Every failure returns a consistent JSON shape; UI shows a human-readable message | ✅ |
| **Rendering** | Live data must render per-request, never frozen at build time | ✅ `dynamic = 'force-dynamic'` |
| **Type safety** | `strict: true`, no `any` in the data pipeline | ✅ |
| **Browser support** | Modern evergreen browsers | ✅ Implicit |
| **Dark mode** | Follows the system, with a manual override | ✅ Complete — semantic token layer, verified AA in both palettes |

---

## 9. Known limitations and technical debt

Ordered by how likely they are to bite.

| # | Issue | Impact | Status |
|---|---|---|---|
| 1 | ~~**`forecast_days=1`**~~ | Resolved: raised to 7, which unblocked the Daily Forecast card. The hourly series is trimmed to 24h during normalization so the extra span costs nothing at the card level | ✅ Resolved |
| 2 | **Rate limiter is in-process memory** | On serverless each instance has its own counter, so the real ceiling is `30 × live instances`, and it resets when an instance recycles. A guardrail against one client hammering one instance — not a true global quota. Fixing properly needs a shared store (Redis/Vercel KV), which conflicts with the no-database constraint | 🟡 Documented, accepted |
| 3 | ~~**`package.json` pins every dependency to `"latest"`**~~ | Resolved: every dependency now carries a caret range at its known-good version, and `engines.node` documents the runtime CI already used | ✅ Resolved |
| 4 | ~~**5 high-severity `npm audit` findings**~~ | Resolved: `npm audit` reports zero. Real ranges let the fixes apply without `--force`; Next went 16.2.10 → 16.3.0 | ✅ Resolved |
| 1 | ~~**Air quality always `null`**~~ | Resolved: the separate air-quality API is now called, degrading independently so its failure never costs the user their forecast | ✅ Resolved |
| 6 | ~~**Units hardcoded**~~ | Resolved: `lib/weather/units.ts` with a persisted imperial/metric toggle. The internal model stays imperial and unit choice is presentational, so switching re-renders rather than re-fetches | ✅ Resolved |
| 7 | ~~**No `prefers-reduced-motion` handling**~~ | Resolved: handled globally in `globals.css`, so it covers third-party animation (Recharts, dnd-kit) rather than relying on each component | ✅ Resolved |
| 8 | ~~**Orphaned scaffold code**~~ | Resolved: `lib/weather-schema.ts` and its test are deleted. Nothing imported them but the test itself | ✅ Resolved |
| 9 | ~~**`store/dashboard-store.ts` unused**~~ | Resolved: it is now the real preferences store — location, units, and card layout, with versioning and reconciliation | ✅ Resolved |
| 10 | **Mock data still in the tree** | `lib/weather/mock-data.ts` no longer feeds the page but is still used by its own test. Fine as a fixture; should not be mistaken for live behaviour | ✅ Intentional |
| 11 | ~~**E2E tests not in CI**~~ | Resolved: CI installs Chromium and runs Playwright against the production build. `PLAYWRIGHT_CHROMIUM_PATH` overrides the binary where an environment supplies its own | ✅ Resolved |
| 12 | ~~**`feelsLike` computed but never plotted**~~ | Resolved: it now appears in the chart's screen-reader data table, so it is no longer dead | ✅ Resolved |
| 13 | **No upstream response caching** — only CDN response caching | A CDN cache miss always hits Open-Meteo. Acceptable given the CDN absorbs most traffic | 🟡 Acceptable |

---

## 10. Risks and open questions

| Risk / question | Why it matters | Recommendation |
|---|---|---|
| **Free-tier quota under real traffic** | Rate limiting is a guardrail, not a guarantee (§9.2) | Watch Open-Meteo usage after any traffic spike; add a shared store if it becomes real |
| **No automated accessibility scanning** | Current a11y coverage asserts the intent we wrote; it cannot catch a regression nobody thought to assert | Add axe to the Playwright suite — cheap, and the e2e harness now exists |
| **No real screen-reader or device testing** | The ARIA is correct by construction and by test, but has not been driven by an actual screen reader or on a real phone | Worth one manual pass before calling the accessibility goal met |
| **Layout schema will drift** | Saved layouts are reconciled and versioned, but each future card change still needs the version bumped deliberately | Keep `ALL_CARD_IDS` and the version in step; the registry test catches half of it |

---

## 11. Definition of done (v1.0)

The product ships when all of the following are true:

- [x] A user can search for and select any city or postal code, and it's remembered
- [x] All 8 cards exist, each with ready / loading / error / unavailable states
- [x] A user can add, remove, reorder, and resize cards, and it's remembered
- [x] Every customization action works by keyboard alone, with no dragging required
- [x] Every chart has a text equivalent; no information is conveyed by colour alone
- [x] `prefers-reduced-motion` is respected
- [x] Open-Meteo attribution and a location privacy note are visible
- [x] `npm run lint`, `typecheck`, `test`, and `build` all pass in CI on every PR
- [x] E2E tests run in CI
- [x] Dependencies are pinned to real version ranges with no high-severity advisories

**Currently satisfied: 10 of 10.**

---

## 12. Appendix — file map

| Path | Purpose | Status |
|---|---|---|
| `app/page.tsx` | Dashboard page; async server component fetching live data | ✅ |
| `app/api/weather/route.ts` | Forecast-by-coordinates endpoint | ✅ |
| `app/api/geocode/route.ts` | Place-name search endpoint | ✅ |
| `components/weather/card-registry.tsx` | Card catalogue — the extension point for new cards | ✅ |
| `components/weather/card-frame.tsx` | Shared card chrome and state placeholders | ✅ |
| `components/weather/*-card.tsx` | The 3 built cards | ✅ |
| `lib/weather/types.ts` | Internal model — the contract cards depend on | ✅ |
| `lib/weather/schemas.ts` | Zod schemas for upstream responses | ✅ |
| `lib/weather/weather-codes.ts` | WMO code → condition/label | ✅ |
| `lib/weather/providers/open-meteo.ts` | Forecast fetch + validation | ✅ |
| `lib/weather/providers/open-meteo-geocoding.ts` | Geocoding fetch + validation | ✅ |
| `lib/weather/normalize-open-meteo.ts` | Raw → internal model | ✅ |
| `lib/weather/get-dashboard-weather.ts` | Geocode → forecast → normalize orchestration | ✅ |
| `lib/rate-limit.ts` | Fixed-window limiter | ✅ |
| `lib/api/http.ts` | Shared error shape + cache constants | ✅ |
| `store/dashboard-store.ts` | Preferences store: location, units, card layout | ✅ |
| `lib/weather/mock-data.ts` | Mock fixture, test-only | ✅ |
| `.github/workflows/ci.yml` | CI: lint, typecheck, test, build | ✅ |
| `ROADMAP.md` | Milestone execution order | ✅ |
