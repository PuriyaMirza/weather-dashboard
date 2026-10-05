'use client';

import { useId, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { minutesSince } from '@/lib/log/factory';
import { PARK_AREAS } from '@/lib/log/park-areas';
import { PROTOCOLS, type Outing } from '@/lib/log/schema';

interface OutingDetailsProps {
  outing: Outing;
  onChange: (patch: Partial<Outing>) => void;
}

const PROTOCOL_LABEL: Record<Outing['protocol'], string> = {
  traveling: 'Walking',
  stationary: 'Staying put',
  incidental: 'Incidental',
};

const PROTOCOL_HELP: Record<Outing['protocol'], string> = {
  traveling: 'You walked a route while birding (eBird "traveling").',
  stationary: 'You birded from one spot (within about 30 m).',
  incidental: 'Birding wasn’t the main point — e.g. birds noticed on a run.',
};

const field = 'h-11 w-full rounded-xl border border-outline-variant bg-surface-container-low px-3 type-body-md text-on-surface';
const labelClass = 'type-label-md text-on-surface-variant';

function toNumber(value: string): number | null {
  if (value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Where, when, and how — the "effort" eBird needs to make a checklist count for science. */
export function OutingDetails({ outing, onChange }: OutingDetailsProps) {
  const ids = {
    area: useId(),
    start: useId(),
    duration: useId(),
    distance: useId(),
    observers: useId(),
    comments: useId(),
    protocol: useId(),
  };
  const [locating, setLocating] = useState<'idle' | 'busy' | 'failed'>('idle');

  function shareLocation() {
    if (!('geolocation' in navigator)) return setLocating('failed');
    setLocating('busy');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setLocating('idle');
      },
      () => setLocating('failed'),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor={ids.area} className={labelClass}>
          Where in the park
        </label>
        <select id={ids.area} value={outing.area} onChange={(e) => onChange({ area: e.target.value })} className={field}>
          {PARK_AREAS.map((area) => (
            <option key={area}>{area}</option>
          ))}
        </select>
        <div className="flex flex-wrap items-center gap-2 pt-1 type-body-sm text-on-surface-variant">
          {outing.latitude !== null && outing.longitude !== null ? (
            <>
              <span>
                Exact spot saved ({outing.latitude.toFixed(4)}, {outing.longitude.toFixed(4)}).
              </span>
              <button type="button" className="min-h-11 px-1 text-secondary-fixed underline" onClick={() => onChange({ latitude: null, longitude: null })}>
                Forget it
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={shareLocation}
              disabled={locating === 'busy'}
              className="inline-flex min-h-11 items-center gap-1 text-secondary-fixed underline"
            >
              <Icon name="location" size={18} />
              {locating === 'busy' ? 'Finding you…' : 'Use my exact location (optional)'}
            </button>
          )}
          {locating === 'failed' && <span role="status">Couldn&rsquo;t get your location; the park area is enough.</span>}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={ids.start} className={labelClass}>
          Started
        </label>
        <input
          id={ids.start}
          type="datetime-local"
          value={outing.startTime}
          onChange={(e) => e.target.value && onChange({ startTime: e.target.value })}
          className={field}
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className={`${labelClass} mb-1`}>How you birded</legend>
        <div className="grid grid-cols-3 gap-2">
          {PROTOCOLS.map((protocol) => (
            <label
              key={protocol}
              className={`flex min-h-11 cursor-pointer items-center justify-center gap-1 rounded-full border px-2 text-center type-label-lg ${
                outing.protocol === protocol
                  ? 'border-secondary-fixed bg-secondary-fixed text-on-secondary'
                  : 'border-outline-variant text-on-surface'
              }`}
            >
              <input
                type="radio"
                name={ids.protocol}
                value={protocol}
                checked={outing.protocol === protocol}
                onChange={() => onChange({ protocol })}
                className="sr-only"
              />
              {outing.protocol === protocol && <Icon name="check" size={16} />}
              {PROTOCOL_LABEL[protocol]}
            </label>
          ))}
        </div>
        <p className="type-body-sm text-on-surface-variant">{PROTOCOL_HELP[outing.protocol]}</p>
      </fieldset>

      {outing.protocol !== 'incidental' && (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor={ids.duration} className={labelClass}>
              Minutes birding
            </label>
            <input
              id={ids.duration}
              type="number"
              inputMode="numeric"
              min={0}
              value={outing.durationMin ?? ''}
              onChange={(e) => onChange({ durationMin: toNumber(e.target.value) === null ? null : Math.round(Number(e.target.value)) })}
              className={field}
            />
            <button
              type="button"
              onClick={() => onChange({ durationMin: minutesSince(outing.startTime) })}
              className="inline-flex min-h-11 items-center gap-1 self-start type-label-md text-secondary-fixed underline"
            >
              <Icon name="schedule" size={16} />
              Set from start time
            </button>
          </div>
          {outing.protocol === 'traveling' && (
            <div className="flex flex-col gap-1">
              <label htmlFor={ids.distance} className={labelClass}>
                Miles walked
              </label>
              <input
                id={ids.distance}
                type="number"
                inputMode="decimal"
                min={0}
                step={0.1}
                value={outing.distanceMi ?? ''}
                onChange={(e) => onChange({ distanceMi: toNumber(e.target.value) })}
                className={field}
              />
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={ids.observers} className={labelClass}>
            People in your party
          </label>
          <input
            id={ids.observers}
            type="number"
            inputMode="numeric"
            min={1}
            value={outing.observers}
            onChange={(e) => {
              const n = Math.round(Number(e.target.value));
              if (n >= 1) onChange({ observers: n });
            }}
            className={field}
          />
        </div>
        <label className="flex min-h-11 items-center gap-2 self-end type-body-md text-on-surface">
          <input
            type="checkbox"
            className="h-5 w-5 accent-[var(--secondary-fixed)]"
            checked={outing.allReported}
            onChange={(e) => onChange({ allReported: e.target.checked })}
          />
          Complete list
        </label>
      </div>
      <p className="-mt-2 type-body-sm text-on-surface-variant">
        &ldquo;Complete&rdquo; means you&rsquo;re listing every bird you identified, not just highlights — it makes the
        checklist far more useful to eBird&rsquo;s science.
      </p>

      <div className="flex flex-col gap-1">
        <label htmlFor={ids.comments} className={labelClass}>
          Checklist notes (weather, route)
        </label>
        <textarea
          id={ids.comments}
          rows={2}
          value={outing.comments}
          onChange={(e) => onChange({ comments: e.target.value })}
          className="rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2 type-body-md text-on-surface"
        />
      </div>
    </div>
  );
}
