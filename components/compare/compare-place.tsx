'use client';

import { useId, type ReactNode, type RefObject } from 'react';
import { MISSING } from '@/components/dashboard/current-conditions-summary';
import { Icon, type IconName } from '@/components/ui/icon';
import { CardState } from '@/components/weather/card-frame';
import { inferIsDay } from '@/lib/weather/atmosphere';
import { conditionIcon } from '@/lib/weather/condition-icon';
import { formatRegionLabel } from '@/lib/weather/location';
import type { WeatherDashboardData } from '@/lib/weather/types';
import { describeTemperature, formatPercent, formatTemperature, type UnitSystem } from '@/lib/weather/units';
import { shownWeather, type ComparedPlace } from './place-forecast-state';

/** Which side of the comparison a card stands for. */
export type CompareSide = 'main' | 'compared';

const SIDE_LABEL: Record<CompareSide, { icon: IconName; text: string }> = {
  main: { icon: 'location', text: 'Main location' },
  compared: { icon: 'compare-arrows', text: 'Compared with' },
};

/** 44px pill shared by the card's own controls. */
export const PLACE_ACTION =
  'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-4 type-label-lg outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-secondary-fixed disabled:cursor-not-allowed disabled:opacity-60';

const SECONDARY_ACTION = `${PLACE_ACTION} bg-secondary-container text-secondary-fixed hover:bg-surface-bright`;

interface ComparePlaceProps {
  place: ComparedPlace;
  side: CompareSide;
  unitSystem: UnitSystem;
  /** Compared side only: opens the picker. Receives the button, so focus can return to it. */
  onChange?: (trigger: HTMLElement) => void;
  /** Compared side only: makes this place the dashboard's location. */
  onSwap?: () => void;
  /** Lets the view put focus back on Change once a newly picked place replaces the empty state. */
  changeButtonRef?: RefObject<HTMLButtonElement | null>;
}

/**
 * The eyebrow, name and region every Compare card opens with — shared with the empty prompt, so
 * the two columns line up and each says which side it is in words, not by position alone.
 */
export function ComparePlaceHeader({
  side,
  headingId,
  title,
  region,
  actions,
}: {
  side: CompareSide;
  headingId: string;
  title: string;
  region?: string | null;
  actions?: ReactNode;
}) {
  const label = SIDE_LABEL[side];
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 type-label-sm uppercase text-secondary">
          <Icon name={label.icon} size={14} className="shrink-0" />
          {label.text}
        </p>
        <h4 id={headingId} className="mt-1 type-headline-sm break-words text-primary">
          {title}
        </h4>
        {region && <p className="type-body-sm text-on-surface-variant">{region}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

function temperatureOrMissing(fahrenheit: number | null | undefined, unitSystem: UnitSystem): string {
  return fahrenheit == null ? MISSING : formatTemperature(fahrenheit, unitSystem);
}

/** The reading itself: temperature, condition in words, and three quick stats. */
function Reading({ data, unitSystem }: { data: WeatherDashboardData; unitSystem: UnitSystem }) {
  const current = data.current;
  if (!current) return null;

  const isDay = current.isDay ?? inferIsDay(current.observedAt, data.sun?.sunrise ?? null, data.sun?.sunset ?? null);
  const stats: { icon: IconName; label: string; spoken: string; value: string; note?: string }[] = [
    {
      icon: 'thermostat',
      label: 'High / low',
      spoken: 'Today’s high and low',
      value: `${temperatureOrMissing(current.highF, unitSystem)} / ${temperatureOrMissing(current.lowF, unitSystem)}`,
    },
    { icon: 'feels-like', label: 'Feels', spoken: 'Feels like', value: temperatureOrMissing(current.feelsLikeF, unitSystem) },
    {
      icon: 'umbrella',
      label: 'Rain',
      spoken: 'Chance of rain in the next hour',
      value: current.precipitationChance == null ? MISSING : formatPercent(current.precipitationChance),
      note: 'next hour',
    },
  ];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <p className="flex items-baseline gap-1">
          <span aria-hidden="true" className="type-display-lg text-primary tabular-nums">
            {temperatureOrMissing(current.temperatureF, unitSystem)}
          </span>
          <span aria-hidden="true" className="type-headline-sm font-light text-on-surface-variant">
            {unitSystem === 'metric' ? 'C' : 'F'}
          </span>
          <span className="sr-only">{describeTemperature(current.temperatureF, unitSystem)}</span>
        </p>
        <p className="flex items-center gap-1.5 pb-1.5 type-body-md text-secondary-fixed">
          <Icon name={conditionIcon(current.condition, isDay)} size={20} className="shrink-0" />
          {current.conditionLabel}
        </p>
      </div>

      <dl className="grid grid-cols-3 gap-2 rounded-xl bg-surface-container/60 p-3">
        {stats.map((stat) => (
          <div key={stat.label} className="flex min-w-0 flex-col items-center text-center">
            <dt className="flex flex-col items-center gap-0.5 type-label-sm text-on-secondary-container">
              <Icon name={stat.icon} size={18} className="text-secondary" />
              <span aria-hidden="true">{stat.label}</span>
              <span className="sr-only">{stat.spoken}</span>
            </dt>
            <dd className="mt-0.5 type-label-md font-bold whitespace-nowrap text-primary tabular-nums">
              {stat.value}
              {stat.note && (
                // Visual only: the spoken label above already says "in the next hour".
                <span aria-hidden="true" className="block type-label-sm font-normal text-on-secondary-container">
                  {stat.note}
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}

/**
 * One place's "Right now" in the Compare view, in each of the four states a forecast can be in.
 *
 * A failed request keeps its last good reading on screen when there is one, saying so once — the
 * hero's rule — and always offers Try again for this place alone, since the two places are two
 * separate requests and one failing says nothing about the other.
 */
export function ComparePlace({ place, side, unitSystem, onChange, onSwap, changeButtonRef }: ComparePlaceProps) {
  const headingId = useId();
  const { location, weather } = place;
  const { state, refresh, isRefreshing } = weather;
  const data = shownWeather(weather);
  const failure = state.status === 'error' ? (state.errorMessage ?? 'Unable to load weather data.') : null;

  const actions =
    side === 'compared' && (onChange || onSwap) ? (
      <>
        {onChange && (
          <button
            ref={changeButtonRef}
            type="button"
            onClick={(event) => onChange(event.currentTarget)}
            aria-label={`Change compared place, currently ${location.name}`}
            className={SECONDARY_ACTION}
          >
            <Icon name="search" size={18} />
            Change
          </button>
        )}
        {onSwap && (
          // The visible word stays at the front of the name, so voice control can still say "Swap".
          <button
            type="button"
            onClick={onSwap}
            aria-label={`Swap: make ${location.name} my main location`}
            className={SECONDARY_ACTION}
          >
            <Icon name="swap-horiz" size={18} />
            Swap
          </button>
        )}
      </>
    ) : null;

  let body: ReactNode;
  if (state.status === 'loading') {
    body = <CardState label={`Loading current conditions for ${location.name}…`} />;
  } else if (failure && !data) {
    body = <CardState label={failure} tone="error" />;
  } else if (!data?.current) {
    body = <CardState label={`Current conditions for ${location.name} are unavailable.`} />;
  } else {
    body = <Reading data={data} unitSystem={unitSystem} />;
  }

  return (
    <article
      aria-labelledby={headingId}
      className="flex min-w-0 flex-col gap-4 rounded-xl bg-surface-container-high p-4 shadow-card"
    >
      <ComparePlaceHeader
        side={side}
        headingId={headingId}
        title={location.name}
        region={formatRegionLabel(location)}
        actions={actions}
      />

      {failure && data && (
        // role="status": the reading below is real, just not the newest — nothing is broken.
        <p role="status" className="flex items-start gap-2 rounded-lg bg-surface-container-highest/60 px-3 py-2 type-body-sm text-on-surface">
          <Icon name="info" size={18} className="mt-px shrink-0 text-secondary" />
          <span>Showing the last reading that loaded. {failure}</span>
        </p>
      )}

      {body}

      {failure && (
        <button
          type="button"
          onClick={refresh}
          disabled={isRefreshing}
          aria-label={`${isRefreshing ? 'Trying again' : 'Try again'} for ${location.name}`}
          className={`${SECONDARY_ACTION} self-start`}
        >
          <Icon name="refresh" size={18} />
          {isRefreshing ? 'Trying…' : 'Try again'}
        </button>
      )}
    </article>
  );
}
