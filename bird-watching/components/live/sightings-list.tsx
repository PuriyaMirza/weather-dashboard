'use client';

import Link from 'next/link';
import { useId, useMemo, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { Surface } from '@/components/ui/surface';
import type { ParkSighting, SightingsResponse } from '@/lib/ebird/sightings';
import { parkToday } from '@/lib/forecast/birding-outlook';
import { whenObserved } from '@/lib/live/format';
import { useApi } from '@/lib/live/use-api';
import { buildSpeciesList } from '@/lib/log/life-list';
import { useLog } from '@/lib/log/use-log';

const DAY_OPTIONS = [1, 3, 7, 14] as const;

interface SightingsListProps {
  guideCodes: string[];
  /** Show only the first few rows with a link to the full page (the Today preview). */
  preview?: number;
}

function SightingRow({ sighting, today, linkable, isNew }: { sighting: ParkSighting; today: string; linkable: boolean; isNew: boolean }) {
  return (
    <li className="flex min-h-14 items-center gap-3 px-3 py-2.5">
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {linkable ? (
            <Link href={`/guide/${sighting.speciesCode}`} className="type-label-lg text-primary underline-offset-2 hover:underline">
              {sighting.commonName}
            </Link>
          ) : (
            <span className="type-label-lg text-primary">{sighting.commonName}</span>
          )}
          {sighting.notable && (
            <span className="rounded-full bg-scale-5-bg px-2 py-0.5 type-label-sm text-scale-5">
              Rare here{sighting.unconfirmed ? ' · unconfirmed' : ''}
            </span>
          )}
          {isNew && <span className="rounded-full bg-scale-1-bg px-2 py-0.5 type-label-sm text-scale-1">New for you</span>}
        </span>
        <span className="block type-body-sm text-on-surface-variant">
          {sighting.area} · {whenObserved(sighting.observedAt, today)}
          {sighting.count !== null && sighting.count > 1 ? ` · ${sighting.count} seen` : ''}
        </span>
      </span>
      <a
        href={sighting.checklistUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high"
      >
        <Icon name="link" size={18} />
        <span className="sr-only">eBird checklist for {sighting.commonName} (opens in a new tab)</span>
      </a>
    </li>
  );
}

/** Recent reports from the park on eBird, rare birds first. */
export function SightingsList({ guideCodes, preview }: SightingsListProps) {
  const [days, setDays] = useState<(typeof DAY_OPTIONS)[number]>(preview ? 3 : 7);
  const [area, setArea] = useState('');
  const areaId = useId();
  const { state, reload } = useApi<SightingsResponse>(`/api/sightings?days=${days}`);
  const { state: log } = useLog();
  const today = parkToday();
  const linkable = useMemo(() => new Set(guideCodes), [guideCodes]);
  const seen = useMemo(
    () =>
      log.status === 'ready'
        ? new Set(buildSpeciesList(log.outings, log.observations).map((e) => e.speciesCode).filter(Boolean))
        : null,
    [log],
  );

  const controls = !preview && (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label="How far back" className="grid grid-cols-4 gap-2">
        {DAY_OPTIONS.map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={days === d}
            onClick={() => setDays(d)}
            className={`inline-flex min-h-11 items-center justify-center gap-1 rounded-full border type-label-lg ${
              days === d ? 'border-secondary-fixed bg-secondary-fixed text-on-secondary' : 'border-outline-variant text-on-surface'
            }`}
          >
            {days === d && <Icon name="check" size={16} />}
            {d === 1 ? 'Today' : `${d} days`}
          </button>
        ))}
      </div>
    </div>
  );

  if (state.status === 'loading')
    return (
      <div className="flex flex-col gap-3">
        {controls}
        <Surface tone="container" role="status" className="h-32 animate-pulse">
          <span className="sr-only">Loading sightings…</span>
        </Surface>
      </div>
    );
  if (state.status === 'error')
    return (
      <div className="flex flex-col gap-3">
        {controls}
        <Surface tone="container" className="flex flex-col items-start gap-2 p-4">
          <p className="type-body-md text-on-surface">{state.message}</p>
          {state.httpStatus !== 503 && (
            <button type="button" onClick={reload} className="inline-flex min-h-11 items-center gap-1 type-label-lg text-secondary-fixed">
              <Icon name="refresh" size={18} />
              Try again
            </button>
          )}
        </Surface>
      </div>
    );

  const areas = [...new Set(state.data.sightings.map((s) => s.area))].sort();
  const filtered = state.data.sightings.filter((s) => !area || s.area === area);
  const shown = preview ? filtered.slice(0, preview) : filtered;

  return (
    <div className="flex flex-col gap-3">
      {controls}
      {!preview && areas.length > 1 && (
        <div className="flex flex-col gap-1">
          <label htmlFor={areaId} className="type-label-md text-on-surface-variant">
            Where in the park
          </label>
          <select
            id={areaId}
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="h-11 rounded-xl border border-outline-variant bg-surface-container-low px-3 type-body-md text-on-surface"
          >
            <option value="">Anywhere in the park</option>
            {areas.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </div>
      )}
      <p aria-live="polite" className="type-label-lg text-on-surface-variant">
        {filtered.length} species reported{' '}
        {state.data.days === 1 ? 'today' : `in the last ${state.data.days} days`}
        {filtered.some((s) => s.notable) ? `, ${filtered.filter((s) => s.notable).length} rare` : ''}
      </p>
      {shown.length === 0 ? (
        <p className="rounded-xl bg-surface-container px-4 py-6 text-center type-body-md text-on-surface-variant">No reports yet.</p>
      ) : (
        <Surface tone="container" className="py-1">
          <ul className="flex flex-col">
            {shown.map((s) => (
              <SightingRow
                key={s.speciesCode}
                sighting={s}
                today={today}
                linkable={linkable.has(s.speciesCode)}
                isNew={seen !== null && !seen.has(s.speciesCode)}
              />
            ))}
          </ul>
        </Surface>
      )}
      {preview && filtered.length > preview && (
        <Link href="/sightings" className="flex items-center justify-end gap-1 type-label-lg text-secondary-fixed">
          All {filtered.length} recent species <Icon name="chevron-right" size={18} />
        </Link>
      )}
      <p className="type-body-sm text-on-surface-variant">
        Reports from{' '}
        <a href="https://ebird.org/region/US-NY-061" target="_blank" rel="noopener noreferrer" className="text-secondary-fixed underline">
          eBird<span className="sr-only"> (opens in a new tab)</span>
        </a>
        , updated every 15 minutes. &ldquo;Rare here&rdquo; is eBird&rsquo;s own flag for unusual birds.
      </p>
    </div>
  );
}
