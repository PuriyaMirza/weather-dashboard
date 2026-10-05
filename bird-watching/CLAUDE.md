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
                     /log, /log/outing?id= (query param: outings live only in IndexedDB), /log/lists
components/ui/       Primitives copied from the weather app (Icon subset, Surface, Chip, SectionHeader)
components/guide/    FieldGuide (client search/filters), SpeciesRow, SpeciesDetail, ToggleChip
components/log/      LogHome, OutingEditor, OutingDetails, QuickAdd, ObservationRow, SpeciesLists
components/shell/    SiteHeader, BottomNav
lib/birds/           schema.ts (Zod, the data contract), species.ts (server-only loader), search.ts,
                     labels.ts (size classes, colour/habitat labels), glossary.ts
lib/ebird/schemas.ts eBird API response shapes
lib/log/             schema.ts (Outing/Observation/Backup), repository.ts (SightingsRepository + memory impl),
                     indexeddb-repository.ts, ebird-csv.ts (Record Format Extended), life-list.ts, backup.ts
data/                species-content.json (hand-written), species.json (generated — don't hand-edit)
scripts/             build-species.ts (run with Node type stripping, imports only zod + lib/*/schema*.ts)
store/               In-memory Zustand store for guide filters
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
- eBird CSV: 19 columns, no header. Breeding codes travel in species comments (no column for them).

## Commands

```bash
npm run dev          # http://localhost:3100 (3100 so it can run beside the weather app on 3000)
npm run qa           # lint + typecheck + test + build + playwright
PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npx playwright test   # in the cloud sandbox
```

Playwright: `mobile-chrome` (Pixel 7) runs everything; `chromium` (desktop) runs `accessibility.spec.ts`
only. Add every new page/state to `tests/e2e/accessibility.spec.ts`.

## Gotchas

- `npm install` from scratch hits an npm arborist `edgesOut` bug; the lockfile was seeded from the
  root one. Use `npm ci`, or `npm install <pkg>` against the existing lockfile.
- `next.config.ts` pins `turbopack.root` to this folder — the repo root's lockfile would otherwise win.
- The cloud sandbox blocks eBird/Open-Meteo/Wikimedia; run data scripts locally and commit the JSON.
