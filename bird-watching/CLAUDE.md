# CLAUDE.md — Central Park Birding

A phone-first field companion for birding Central Park. Separate Next.js app inside the
weather-dashboard repo: own package.json, lockfile, configs, and CI (`.github/workflows/bird-watching.yml`).
The root app's tsconfig/eslint/vitest exclude this folder; don't import across the two.

See [ROADMAP.md](./ROADMAP.md) for milestones and status. The root CLAUDE.md conventions apply
(named exports outside `app/`, kebab-case files, flat `tests/`, why-comments, no new deps without
discussion, check `node_modules/next/dist/docs/` before touching Next APIs).

## Structure

```
app/                 / (Today), /guide, /guide/[code] (prerendered), /guide/glossary,
                     /log, /log/outing?id= (query param: outings live only in IndexedDB), /log/lists,
                     /log/photo, /sightings; api/sightings (eBird, needs EBIRD_API_KEY), api/forecast (Open-Meteo),
                     api/identify (POST photo crop + note → Claude Sonnet 5.5, needs ANTHROPIC_API_KEY),
                     api/species-photo?sci= (credited reference photo per suggestion; CDN-cached a week),
                     api/rare-highlight (Today's hero: newest rare bird with a credited species photo)
components/ui/       Primitives copied from the weather app (Icon subset, Surface, Chip, SectionHeader)
components/guide/    FieldGuide (client search/filters), SpeciesRow, SpeciesDetail, ToggleChip
components/log/      LogHome, OutingEditor, OutingDetails, QuickAdd, ObservationRow, SpeciesLists, PhotoAdd, PhotoThumb
components/live/     MorningForecast, SightingsList, RareBirdHero (client-fetched from our routes)
components/shell/    BottomNav, ServiceWorkerRegistrar; SiteHeader exists but is not rendered (hidden
                     for later iteration — re-add it in app/layout.tsx)
lib/birds/           season.ts (ebirdWeek, picksForWeek — client-safe), abundance.ts (server loader), schema.ts (Zod, the data contract), species.ts (server-only loader), search.ts,
                     labels.ts (size classes, colour/habitat labels), glossary.ts
lib/ebird/          schemas.ts (eBird response shapes), sightings.ts (geo/recent + notable → ParkSighting)
lib/forecast/       open-meteo.ts (provider), birding-outlook.ts (morning conditions + migration rule of thumb)
lib/media/          wikipedia.ts (species lead photo + Commons credit; server-only, cached 1 week)
lib/live/           rare-highlight.ts (pick a rare sighting with a credited photo), use-api.ts, format.ts
lib/api/            http.ts (jsonError, CACHE_CONTROL, fetchJson → UpstreamError), request-timeout.ts
lib/identify/        schema.ts (request/model/response Zod), claude.ts (the one vision call), resolve.ts (eBird
                     taxonomy → codes, Open-Meteo geocode → map point), image.ts (client crop/downscale)
lib/log/             schema.ts (Outing/Observation/Backup), repository.ts (SightingsRepository + memory impl),
                     indexeddb-repository.ts, ebird-csv.ts (Record Format Extended), life-list.ts, backup.ts
data/                species-content.json (hand-written), species.json + abundance.json (generated — don't hand-edit;
                     abundance comes from ebird-barchart.tsv via `npm run data:abundance`, county chart, 48 eBird weeks)
scripts/             build-species.ts (run with Node type stripping, imports only zod + lib/*/schema*.ts)
store/               In-memory Zustand store for guide filters
app/manifest.ts      PWA manifest; icons in public/icon-*.png (+ maskable), iOS touch icon app/apple-icon.png
public/sw.js         Hand-written service worker (production only): network-first pages, cache-first
                     static/images, /api untouched. Shell pages precached; bump VERSION to drop caches.
```

## Data rules

- `data/species.json` is generated: `npm run data:species -- --offline` (seed from content only) or
  `EBIRD_API_KEY=… npm run data:species` (every species eBird has from Central Park hotspots, also
  writes `data/hotspots.json`). Online builds fail if hand-written codes/scientific names disagree
  with eBird taxonomy — fix the content, don't bypass the check.
- To add guide content: add an entry to `species-content.json` (kept in taxonomic order), then rebuild.
  Every content field is required by `speciesContentSchema`.
- Never invent data: species without content render only their taxonomy plus outbound links.
- `lib/birds/species.ts` is server-only; pass arrays to client components as props.
- Size is derived from `lengthIn` (`sizeClassOf`), never stored.
- The log goes through `SightingsRepository` only (`getRepository()`); records use client UUIDs,
  `updatedAt`, and soft deletes (`deletedAt`) so a sync backend can be added without a migration.
  Unit tests use the memory repository; IndexedDB is covered by `tests/e2e/log.spec.ts`.
- External calls only in route handlers; the browser sees `ParkSighting` / `BirdingForecast`, never
  eBird or Open-Meteo shapes. `EBIRD_API_KEY` is read per request and never reaches the client;
  missing key → 503 with a readable message. e2e stubs `/api/*` with `page.route`.
- Photos only with credit: `getSpeciesPhoto` returns null for non-Commons files, missing or non-free
  licences, or any fetch failure — never show an uncredited image. Offline builds render no photos.
- The log is general (park = home base): `outing.area` is a park area or a free place name; `isParkArea`
  decides the "Central Park--" prefix and the park-centre coordinate fallback. Optional `stateCode`/`countryCode`
  (absent = NY/US) and `observation.photoId` (photo Blob in IndexedDB store `photos`, DB v2; not in JSON backup).
- Photo ID: send only the tapped crop (≤768px ≈ 800 image tokens), no species list in the prompt, effort low;
  never trust the model for codes or coordinates (resolve.ts does both); the user always confirms before saving.
  Lookalikes cost a 2nd call (`exclude`), made only on "Show me more options". Reference photos load per row from
  /api/species-photo, never inline — keep Wikipedia load to ~1 request per species per week (CDN cache, throttle).
- eBird CSV: 19 columns, no header. Breeding codes travel in species comments (no column for them).

## Commands

```bash
npm run dev          # http://localhost:3100 (3100 so it can run beside the weather app on 3000)
npm run qa           # lint + typecheck + test + build + playwright
PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npx playwright test   # in the cloud sandbox
```

`tests/live-upstream.test.ts` hits the real APIs; it only runs with `LIVE_UPSTREAM=1` (nightly
workflow, eBird only if the `EBIRD_API_KEY` repo secret is set).

Playwright: `mobile-chrome` (Pixel 7) runs everything; `chromium` (desktop) runs `accessibility.spec.ts`
only. Add every new page/state to `tests/e2e/accessibility.spec.ts`. Service workers are blocked
(so `page.route` stubs work) except in `offline.spec.ts`, which needs a production build (`CI=1`) and
aborts requests via `context.route` — `setOffline` alone doesn't stop the worker's own fetches.

## Gotchas

- `npm install` from scratch hits an npm arborist `edgesOut` bug; the lockfile was seeded from the
  root one. Use `npm ci`, or `npm install <pkg>` against the existing lockfile.
- `next.config.ts` pins `turbopack.root` to this folder — the repo root's lockfile would otherwise win.
- The cloud sandbox blocks eBird/Open-Meteo/Wikimedia; run data scripts locally and commit the JSON.
- Design: light olive tokens in `app/globals.css` (dark green only for accents); `tests/theme-contrast.test.ts`
  checks every text/surface pair. Figma mockup: file `6sbBeTvlvGi4gIAd7YPzb4`.
- Layout uses `viewportFit: 'cover'` so `env(safe-area-inset-*)` works; the bottom nav pads by
  `--nav-bottom-gap` (iPhone home indicator, min 0.75rem) and `main` clears it. Keep both when editing the shell.
- Deploys: Vercel project `nyc-bird-tracker` (Root Directory `bird-watching`, prod https://nyc-bird-tracker.vercel.app);
  its Ignored Build Step skips builds when nothing under `bird-watching/` changed. `EBIRD_API_KEY` is a Vercel env
  var and a GitHub repo secret (nightly), never `NEXT_PUBLIC_`. `ANTHROPIC_API_KEY` is Vercel-only; set a monthly
  spend limit in the Anthropic Console (the per-IP limiter is per instance).
- Regenerate PNG icons from `app/icon.svg` by rendering with Playwright's Chromium (no image deps installed).
