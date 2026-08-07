# Weather Dashboard — Product Requirements Document

**Version:** 1.0 · **Last updated:** 6 August 2026 · **Reflects:** `main` at commit `b46f503`

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

**Current overall status: 🟡 In progress.** The data foundation is finished and live; the headline customization feature has not been started.

---

## 2. Status snapshot

| # | Milestone | Status | Notes |
|---|---|---|---|
| 1 | Scaffold | ✅ Complete | Next.js + TypeScript + Tailwind + tooling |
| 2 | Mock-data UI | ✅ Complete | Card registry, card frame, 3 cards |
| 3 | Open-Meteo provider & normalization | ✅ Complete | Validation, WMO codes, missing-data handling |
| 4 | Internal API routes | ✅ Complete | Caching, rate limits, consistent error shapes |
| 5 | Location selection | ⬜ Not started | Dashboard is hardcoded to Portland, Oregon |
| 6 | Remaining cards | ⬜ Not started | 3 of 8 cards exist |
| 7 | **Customization** | ⬜ Not started | **The core product feature** |
| 8 | Deployment & CI | 🟡 In progress | CI + Vercel live; attribution & privacy note missing |

**Blunt read:** the plumbing is solid and the product isn't built yet. Milestones 1–4 are all infrastructure — a user visiting today sees a fixed, non-customizable three-card page for a city they can't change. Milestones 5–7 are where this becomes the product described above.

---

## 3. Goals and non-goals

### Goals

| Goal | Status |
|---|---|
| Show accurate current, hourly, and daily weather from a free source | 🟡 Current + hourly done; daily data not yet surfaced |
| Let users choose which cards appear, and in what order and size | ⬜ Not started |
| Remember each user's layout across visits | ⬜ Not started |
| Let users pick their location | ⬜ Not started |
| Work equally well on mobile and desktop | 🟡 Responsive grid exists; untested against real card variety |
| Be fully usable by keyboard and screen reader | 🟡 Good foundation; key pieces missing (see §7, F8) |
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

**Current reality:** they see three fixed cards for Portland, Oregon, and can change nothing.

---

## 5. Architecture

### 5.1 Stack

| Layer | Technology | Status |
|---|---|---|
| Framework | Next.js (App Router) 16.2.10 | ✅ |
| Language | TypeScript 6.x, `strict: true` | ✅ |
| Styling | Tailwind CSS 4.x | ✅ |
| Client state | Zustand 5.x | ⬜ Installed, not yet used |
| Drag & drop | dnd-kit | ⬜ Installed, not yet used |
| Charts | Recharts 3.x | ✅ Used by Hourly Temperature |
| Validation | Zod 4.x | ✅ |
| Unit tests | Vitest + jsdom | ✅ 63 tests, 11 files |
| E2E tests | Playwright (Chromium) | 🟡 1 test; not wired into CI |
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
Orchestrator              lib/weather/get-dashboard-weather.ts
      ↓
Page (server component)   app/page.tsx
      ↓  (props)
Cards                     components/weather/*-card.tsx
```

**The load-bearing rule:** cards never see a third-party API response. They only ever receive `WeatherDashboardData`. Swapping Open-Meteo for another provider would touch the provider and normalizer files only — zero card changes. ✅ **Enforced today.**

### 5.3 Standing architectural constraints

| # | Constraint | Status |
|---|---|---|
| 1 | Third-party responses never reach UI components | ✅ Enforced |
| 2 | One shared weather request per forecast, distributed to all cards — never one per card | ✅ Enforced |
| 3 | External API calls go through Next.js route handlers, not browser components | ✅ Routes exist; nothing calls from the browser yet |
| 4 | New cards are added via the card registry, not hardcoded conditionals | ✅ Enforced |
| 5 | Accessibility must not depend on dragging or charts | 🟡 Partial (see §7, F8) |
| 6 | Local-first: no auth, no database, no accounts | ✅ Held |
| 7 | No new dependencies without discussion | ✅ Held — no deps added since scaffold |
| 8 | Check current official docs before changing an integration | ✅ Practiced |

> **Note on constraint 3:** `app/page.tsx` calls the shared library functions *directly* rather than HTTP-fetching its own API routes. This is deliberate and correct — a server component fetching its own route handler adds a pointless network round-trip, and current Next.js guidance advises against it. The routes exist for **browser-side** calls, which arrive in Milestone 5.

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

### F4 — Location selection ⬜ Not started

| Requirement | Status |
|---|---|
| Debounced city search | ⬜ |
| Postal-code search | ⬜ |
| Accessible results list (keyboard navigable, screen-reader announced) | ⬜ |
| "Use my current location" via browser geolocation | ⬜ |
| Graceful fallback when geolocation is denied or unavailable | ⬜ |
| Timezone-aware selected location | 🟡 Pipeline is timezone-aware; no UI to select |
| Persist chosen location | ⬜ |

> Today the location is a hardcoded constant, `DEFAULT_PLACE = 'Portland, Oregon'`, in `app/page.tsx`.

### F5 — Card catalogue 🟡 In progress — 3 of 8

| Card | Status | Data available today? |
|---|---|---|
| Current Conditions | ✅ Complete | ✅ Yes |
| Comfort | ✅ Complete | 🟡 Partial — air quality always shows "Unavailable" (see §9.5) |
| Hourly Temperature | ✅ Complete | ✅ Yes |
| Precipitation | ⬜ Not started | 🟡 Probability yes; amounts need new request variables |
| Wind | ⬜ Not started | 🟡 Current wind yes; hourly wind + gusts need new variables |
| Daily Forecast | ⬜ Not started | ❌ **No** — blocked, see §9.1 |
| Sun & UV | ⬜ Not started | 🟡 UV yes; sunrise/sunset need new daily variables |
| Atmospheric Details | ⬜ Not started | 🟡 Pressure/visibility yes; others need new variables |

Every new card must ship with: ready state, loading state, error state, unavailable-data state, unit-aware formatting, sensible mobile behaviour, and an accessible text summary.

### F6 — Customization ⬜ Not started — **this is the core product feature**

| Requirement | Status |
|---|---|
| Edit mode toggle | ⬜ |
| Add-card drawer showing available cards | ⬜ |
| Remove-card action | ⬜ |
| Card size controls (single/wide) | ⬜ |
| Pointer reordering (drag & drop, via dnd-kit) | ⬜ |
| Keyboard reordering | ⬜ |
| Move-up / move-down buttons as a drag-free alternative | ⬜ |
| Restore-defaults action | ⬜ |
| Persistence via Zustand browser storage | ⬜ |
| Safe hydration handling (no server/client mismatch flash) | ⬜ |

> **Hydration is the sharp edge here.** The server has no access to the user's saved layout, so it must render a default while the browser renders the saved layout. Done naively this produces a visible flash of the wrong layout, or a React hydration error. This needs a deliberate pattern, not an afterthought.

### F7 — Persistence ⬜ Not started

| Requirement | Status |
|---|---|
| Card layout (which cards, order, sizes) persisted locally | ⬜ |
| Selected location persisted locally | ⬜ |
| Schema versioning so a future layout change doesn't corrupt saved state | ⬜ *Recommended — not yet in any milestone* |
| Graceful handling when storage is unavailable or disabled | ⬜ |

A Zustand store exists (`store/dashboard-store.ts`) with a `selectedCity` field, but **nothing imports it** and it has no persistence middleware.

### F8 — Accessibility 🟡 In progress *(cross-cutting requirement)*

| Requirement | Status |
|---|---|
| Semantic headings and landmarks | ✅ |
| `aria-labelledby` / `aria-label` on cards and regions | ✅ |
| `role="status"` / `role="alert"` on loading and error states | ✅ |
| Text alternative for every chart | ✅ Hourly chart has a screen-reader-only data table |
| Large temperature glyph has a readable label (`"72 degrees Fahrenheit"`, not `"72°"`) | ✅ |
| Never use colour as the only signal | 🟡 Holds today; needs re-checking as chart-heavy cards land |
| Keyboard reordering + move-up/down buttons alongside drag | ⬜ Blocked on F6 |
| Respect `prefers-reduced-motion` | ⬜ **Not implemented anywhere** |
| Focus management in edit mode and the add-card drawer | ⬜ Blocked on F6 |
| Automated accessibility testing in CI | ⬜ Not set up |

### F9 — Deployment, CI, and compliance 🟡 In progress

| Requirement | Status |
|---|---|
| GitHub Actions running lint, typecheck, test, build on every PR and push to `main` | ✅ |
| Node 22 with npm caching | ✅ |
| Vercel Git integration with per-PR preview deployments | ✅ |
| Production deploys from `main` | ✅ |
| **Open-Meteo attribution displayed in the UI** | ⬜ **Not started — required by their licence terms** |
| **Location privacy note** | ⬜ Not started |
| E2E tests running in CI | ⬜ Not wired into the workflow |

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
| **Dark mode** | — | ⬜ Not implemented; light-only (`color-scheme: light`) |

---

## 9. Known limitations and technical debt

Ordered by how likely they are to bite.

| # | Issue | Impact | Status |
|---|---|---|---|
| 1 | **`forecast_days=1`** in the provider — only one day of data is requested | **Blocks the Daily Forecast card entirely.** Must be raised (to ~7) before F5's Daily Forecast is buildable | ⬜ Unresolved |
| 2 | **Rate limiter is in-process memory** | On serverless each instance has its own counter, so the real ceiling is `30 × live instances`, and it resets when an instance recycles. A guardrail against one client hammering one instance — not a true global quota. Fixing properly needs a shared store (Redis/Vercel KV), which conflicts with the no-database constraint | 🟡 Documented, accepted |
| 3 | **`package.json` pins every dependency to `"latest"`** | Builds are not reproducible from `package.json` alone; the lockfile is doing all the work. A fresh install could silently pull breaking majors | ⬜ Known, deferred by choice |
| 4 | **5 high-severity `npm audit` findings** | Next.js (SSRF, cache confusion, DoS), plus transitive `postcss`, `sharp`, `brace-expansion`, `undici`. Some fix non-breaking; the Next.js cluster needs a deliberate version bump | ⬜ Deferred to a single pass with #3 |
| 5 | **Air quality always `null`** | Comfort card permanently shows "Unavailable" for AQI. Open-Meteo serves air quality from a *separate* API that this app doesn't call | ⬜ Unresolved |
| 6 | **Units hardcoded** to Fahrenheit / mph / inches | F5 requires "unit-aware formatting"; there is no unit system or toggle. Needs designing before the remaining 5 cards, or they'll each hardcode too | ⬜ Not designed |
| 7 | **No `prefers-reduced-motion` handling** | Violates a stated accessibility requirement; matters more once drag-and-drop animations land | ⬜ Unresolved |
| 8 | **Orphaned scaffold code** — `lib/weather-schema.ts` + its test | Dead code from Milestone 1, unconnected to the real model. Harmless but misleading to a newcomer | ⬜ Safe to delete |
| 9 | **`store/dashboard-store.ts` unused** | Placeholder shape (`selectedCity: string`) that doesn't match what F6/F7 will need | ⬜ Will be replaced |
| 10 | **Mock data still in the tree** | `lib/weather/mock-data.ts` no longer feeds the page but is still used by its own test. Fine as a fixture; should not be mistaken for live behaviour | ✅ Intentional |
| 11 | **E2E tests not in CI**, and some environments need a Chromium path override to run them | Regressions in real browser rendering won't be caught automatically | ⬜ Unresolved |
| 12 | **`feelsLike` computed but never plotted** on the hourly chart | Minor dead computation; possibly an intended second chart line | ⬜ Decide: plot it or drop it |
| 13 | **No upstream response caching** — only CDN response caching | A CDN cache miss always hits Open-Meteo. Acceptable given the CDN absorbs most traffic | 🟡 Acceptable |

---

## 10. Risks and open questions

| Risk / question | Why it matters | Recommendation |
|---|---|---|
| **Hydration flash** when restoring saved layouts (F6) | Most likely source of user-visible bugs in the core feature | Design the pattern before writing the store |
| **No unit system designed** (§9.6) | Building 5 more cards without it means 5 places to retrofit | Decide before Milestone 6 |
| **Card count vs. one shared request** | 8 cards need more Open-Meteo variables. Adding all of them to one request keeps the "one request" rule but grows the payload | Keep one request; add variables as cards need them |
| **Milestone ordering** — customization is last | The headline feature is the least de-risked part of the project | Consider pulling a thin slice of F6 forward |
| **Open-Meteo attribution missing** | A licence-terms obligation, not a nice-to-have | Cheap to add; do it soon |
| **Free-tier quota under real traffic** | Rate limiting is a guardrail, not a guarantee (§9.2) | Watch Open-Meteo usage after any traffic spike |

---

## 11. Definition of done (v1.0)

The product ships when all of the following are true:

- [ ] A user can search for and select any city or postal code, and it's remembered
- [ ] All 8 cards exist, each with ready / loading / error / unavailable states
- [ ] A user can add, remove, reorder, and resize cards, and it's remembered
- [ ] Every customization action works by keyboard alone, with no dragging required
- [ ] Every chart has a text equivalent; no information is conveyed by colour alone
- [ ] `prefers-reduced-motion` is respected
- [ ] Open-Meteo attribution and a location privacy note are visible
- [x] `npm run lint`, `typecheck`, `test`, and `build` all pass in CI on every PR
- [ ] E2E tests run in CI
- [ ] Dependencies are pinned to real version ranges with no high-severity advisories

**Currently satisfied: 1 of 10.**

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
| `store/dashboard-store.ts` | Zustand store | ⬜ Unused placeholder |
| `lib/weather/mock-data.ts` | Mock fixture, test-only | ✅ |
| `lib/weather-schema.ts` | Orphaned Milestone 1 scaffold | ⬜ Delete candidate |
| `.github/workflows/ci.yml` | CI: lint, typecheck, test, build | ✅ |
| `ROADMAP.md` | Milestone execution order | ✅ |
