# Roadmap — Central Park Birding

Audience: beginner to intermediate birders. Storage: on-device now, Supabase later behind a
repository interface. Phone-first, installable, offline-capable.

| # | Milestone | Status |
|---|---|---|
| 1 | Scaffold, CI, species data pipeline, field guide (search, filters, species pages, glossary) | **Done** — 55 hand-written species; full park list pending eBird key |
| 2 | Weekly abundance from eBird bar chart → "what's around this week" checklist; Wikimedia photos + recordings with credits | Next — needs bar chart TSV download |
| 3 | eBird-style sighting log (outings, counts, breeding codes), life/year lists, eBird CSV + JSON backup/restore | **Done** — on-device (IndexedDB) |
| 4 | Today: birding forecast (Open-Meteo, migration rule-of-thumb) + live eBird sightings | Planned — needs `EBIRD_API_KEY` |
| 5 | PWA: manifest, service worker, offline guide + log; a11y/e2e pass | Planned |
| — | Park map with hotspots and "you are here" | Deferred |
| — | Supabase sync / accounts | Deferred |

## Needs from the owner

- eBird API key (https://ebird.org/api/keygen) → `bird-watching/.env.local` as `EBIRD_API_KEY`, then
  `npm run data:species` to replace the 55-species seed with the full park list.
- Network access for api.ebird.org, api.open-meteo.com, www.wikidata.org, commons.wikimedia.org,
  upload.wikimedia.org, en.wikipedia.org if data scripts should run in the cloud sandbox.
