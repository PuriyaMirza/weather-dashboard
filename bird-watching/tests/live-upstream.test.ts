// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { fetchParkSightings } from '@/lib/ebird/sightings';
import { parkToday, toBirdingForecast } from '@/lib/forecast/birding-outlook';
import { fetchParkForecast } from '@/lib/forecast/open-meteo';
import { getSpeciesPhoto } from '@/lib/media/wikipedia';

/*
  Contract checks against the real upstreams. Every other test runs on recorded fixtures, so an
  upstream change would pass PR CI and only break in production. These run nightly
  (.github/workflows/nightly.yml) and are skipped everywhere else — PR CI must not depend on a
  third party being up, and the cloud sandbox can't reach these hosts anyway.
*/
const live = Boolean(process.env.LIVE_UPSTREAM);
const ebirdKey = process.env.EBIRD_API_KEY;

describe.skipIf(!live)('upstreams, live', { timeout: 30_000 }, () => {
  it('Open-Meteo forecast still matches our schema and yields birding days', async () => {
    const forecast = toBirdingForecast(await fetchParkForecast(), new Date().toISOString(), parkToday());
    expect(forecast.days.length).toBeGreaterThan(0);
  });

  // getSpeciesPhoto swallows failures into null by design, so null here means the Wikipedia or
  // Commons response shape moved — every species page would silently lose its photo.
  it('Wikipedia still returns a credited photo for American Robin', async () => {
    const photo = await getSpeciesPhoto('Turdus migratorius');
    expect(photo).not.toBeNull();
  });

  // The key is a repository secret; forks and repos without it skip rather than fail.
  it.skipIf(!ebirdKey)('eBird still returns Central Park sightings', async () => {
    const sightings = await fetchParkSightings(ebirdKey!, 7);
    expect(sightings.length).toBeGreaterThan(0);
  });
});
