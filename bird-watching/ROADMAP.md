# Roadmap — Central Park Birding

Audience: beginner to intermediate birders. Storage: on-device now, Supabase later behind a
repository interface. Phone-first, installable, offline-capable.

| # | Milestone | Status |
|---|---|---|
| 1 | Scaffold, CI, species data pipeline, field guide (search, filters, species pages, glossary) | **Done** — 55 hand-written species; full park list pending eBird key |
| 2 | Weekly abundance from eBird bar chart → "Around this week" on Today; Wikimedia photos + recordings with credits | **Done** (abundance + Today section, New York County 2010–2026 chart); recordings still open |
| 3 | eBird-style sighting log (outings, counts, breeding codes), life/year lists, eBird CSV + JSON backup/restore | **Done** — on-device (IndexedDB) |
| 4 | Today: birding forecast (Open-Meteo, migration rule-of-thumb) + live eBird sightings (`/sightings`) | **Done** — sightings need `EBIRD_API_KEY` on the server |
| 5 | PWA: manifest, service worker, offline guide + log; a11y/e2e pass | **Done** — installable; live sightings/forecast stay online-only |
| 6 | Photo → Claude ID → confirm → log; general log with Central Park as home base | **Done** — needs `ANTHROPIC_API_KEY` on Vercel |
| — | Park map with hotspots and "you are here" | Deferred |
| — | Supabase sync / accounts | Deferred |

## Needs from the owner

- Anthropic API key (console.anthropic.com) → Vercel env `ANTHROPIC_API_KEY` for nyc-bird-tracker, plus a monthly
  spend limit in the Console.

- Refresh `data/ebird-barchart.tsv` yearly (ebird.org/barchart?byr=2016&eyr=2026&bmo=1&emo=12&r=US-NY-061, "Download Histogram Data"), then `npm run data:abundance`.
- eBird API key (https://ebird.org/api/keygen) → `bird-watching/.env.local` as `EBIRD_API_KEY`, then
  `npm run data:species` to replace the 55-species seed with the full park list.
- Network access for api.ebird.org, api.open-meteo.com, www.wikidata.org, commons.wikimedia.org,
  upload.wikimedia.org, en.wikipedia.org if data scripts should run in the cloud sandbox.
