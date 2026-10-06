'use client';

import { Icon } from '@/components/ui/icon';
import { Surface } from '@/components/ui/surface';
import { compass, parkToday, type BirdingDay, type BirdingForecast, type OutlookLevel } from '@/lib/forecast/birding-outlook';
import { clockTime, dayLabel } from '@/lib/live/format';
import { useApi } from '@/lib/live/use-api';

// Bands reuse the severity scale tokens; each always shows its headline in words too.
const LEVEL_CLASS: Record<OutlookLevel, string> = {
  high: 'bg-scale-1-bg text-scale-1',
  'fallout-watch': 'bg-scale-5-bg text-scale-5',
  moderate: 'bg-scale-2-bg text-scale-2',
  low: 'bg-scale-3-bg text-scale-3',
  'off-season': 'bg-surface-container-highest text-on-surface',
};

function round(n: number | null, unit: string) {
  return n === null ? '—' : `${Math.round(n)}${unit}`;
}

function DayCard({ day, today, primary }: { day: BirdingDay; today: string; primary: boolean }) {
  const { morning, outlook } = day;
  const end = `${morning.sunrise.slice(0, 11)}${String(Number(morning.sunrise.slice(11, 13)) + 4).padStart(2, '0')}:${morning.sunrise.slice(14, 16)}`;
  return (
    <Surface tone="container" className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className={primary ? 'type-headline-sm text-primary' : 'type-label-lg text-primary'}>{dayLabel(day.date, today)}</h3>
        <span className="type-body-sm text-on-surface-variant">
          Best light {clockTime(morning.sunrise)}–{clockTime(end)}
        </span>
      </div>
      <div className={`flex flex-col gap-1 rounded-xl px-3 py-2 ${LEVEL_CLASS[outlook.level]}`}>
        <span className="type-label-lg">{outlook.headline}</span>
        {primary && <span className="type-body-sm">{outlook.reason}</span>}
      </div>
      {primary && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 type-body-sm">
          <div>
            <dt className="text-on-surface-variant">Temperature</dt>
            <dd className="type-label-lg text-on-surface">
              {round(morning.tempLowF, '°')}–{round(morning.tempHighF, '°F')}
            </dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">Chance of rain</dt>
            <dd className="type-label-lg text-on-surface">{round(morning.maxRainChance, '%')}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">Wind</dt>
            <dd className="type-label-lg text-on-surface">
              {morning.windFromDeg === null ? '' : `${compass(morning.windFromDeg)} `}
              up to {round(morning.maxWindMph, ' mph')}
            </dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">Sunrise · sunset</dt>
            <dd className="type-label-lg text-on-surface">
              {clockTime(morning.sunrise)} · {clockTime(morning.sunset)}
            </dd>
          </div>
        </dl>
      )}
    </Surface>
  );
}

/** This morning's birding conditions plus a glance at tomorrow. */
export function MorningForecast() {
  const { state, reload } = useApi<BirdingForecast>('/api/forecast');
  const today = parkToday();

  if (state.status === 'loading') return (
      <Surface tone="container" role="status" className="h-40 animate-pulse">
        <span className="sr-only">Loading forecast…</span>
      </Surface>
    );
  if (state.status === 'error')
    return (
      <Surface tone="container" className="flex flex-col items-start gap-2 p-4">
        <p className="type-body-md text-on-surface">{state.message}</p>
        <button type="button" onClick={reload} className="inline-flex min-h-11 items-center gap-1 type-label-lg text-secondary-fixed">
          <Icon name="refresh" size={18} />
          Try again
        </button>
      </Surface>
    );

  const [first, second] = state.data.days;
  if (!first) return <p className="type-body-md text-on-surface-variant">No forecast available right now.</p>;
  return (
    <div className="flex flex-col gap-3">
      <DayCard day={first} today={today} primary />
      {second && <DayCard day={second} today={today} primary={false} />}
      <p className="type-body-sm text-on-surface-variant">
        The migration outlook is a rule of thumb from overnight wind and rain. For the radar-based forecast, see{' '}
        <a href="https://birdcast.info/migration-tools/migration-forecast-maps/" target="_blank" rel="noopener noreferrer" className="text-secondary-fixed underline">
          BirdCast<span className="sr-only"> (opens in a new tab)</span>
        </a>
        . Weather: Open-Meteo.
      </p>
    </div>
  );
}
