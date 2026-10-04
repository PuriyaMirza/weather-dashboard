'use client';

import { useEffect, useRef } from 'react';
import { Icon } from '@/components/ui/icon';
import { WAKING_HOURS } from '@/lib/weather/activity-windows';
import { conditionIcon } from '@/lib/weather/condition-icon';
import { laterDayName } from '@/lib/weather/forecast-day';
import type { DailyForecastDay } from '@/lib/weather/types';
import type { WeatherCardProps } from './card-registry';
import { CardBoundary } from './card-frame';
import { describeTemperature, formatHour, formatTemperature } from '@/lib/weather/units';

const TITLE = 'Hourly Temperature';
const DESCRIPTION = 'Temperature trend for the next several hours.';

/**
 * Whether an hour falls between its own day's sunrise and sunset, so a 10 PM pill shows a moon
 * rather than a sun. Only picks the glyph — the condition itself is unchanged — and assumes day
 * when the sun times are missing rather than guessing night.
 */
function isDaytime(time: string, daily: DailyForecastDay[]): boolean {
  const day = daily.find((candidate) => candidate.date === time.slice(0, 10));
  if (!day?.sunrise || !day.sunset) return true;
  const at = new Date(time).getTime();
  return at >= new Date(day.sunrise).getTime() && at < new Date(day.sunset).getTime();
}

export function HourlyTemperatureCard({
  data,
  isLoading,
  errorMessage,
  unitSystem,
  forecastDay,
  isEditing,
  onRemove,
}: WeatherCardProps) {
  const timeZone = data?.location.timezone;
  const hourly = data?.hourly ?? [];
  const daily = data?.daily ?? [];
  const dayName = laterDayName(forecastDay);
  const stripRef = useRef<HTMLDivElement>(null);

  // A later day is a whole midnight-to-midnight day, and opening its strip on six moons is opening
  // it on the hours nobody is planning. It opens at the start of the waking day instead — scrolled
  // there, not cut, so the small hours stay one swipe back and the table and range still cover
  // them. Today's view always opens on now.
  const openingTime = dayName
    ? (hourly.find((point) => Number(point.time.slice(11, 13)) >= WAKING_HOURS.start)?.time ?? null)
    : null;

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const pill = openingTime ? strip.querySelector<HTMLElement>(`[data-time="${openingTime}"]`) : null;
    if (!pill) {
      strip.scrollLeft = 0;
      return;
    }
    const inset = Number.parseFloat(getComputedStyle(strip).paddingLeft) || 0;
    strip.scrollLeft += pill.getBoundingClientRect().left - strip.getBoundingClientRect().left - inset;
  }, [openingTime]);

  return (
    <CardBoundary
      title={TITLE}
      description={DESCRIPTION}
      subtitle={dayName ?? undefined}
      icon="schedule"
      isEditing={isEditing}
      onRemove={onRemove}
      isLoading={isLoading}
      errorMessage={errorMessage}
      isUnavailable={hourly.length === 0}
      loadingLabel="Loading hourly temperatures…"
      unavailableLabel="Hourly temperature data is unavailable."
    >
      {hourly.length > 0 && (
        <>
          {/* Hour pills, scrolling horizontally past the width the card affords rather than
              compressing below legibility. aria-hidden because the table below carries the same
              series to assistive tech — announcing both would be double. */}
          <div
            ref={stripRef}
            aria-hidden="true"
            className="-mx-4 flex flex-1 items-stretch gap-2 overflow-x-auto px-4 scrollbar-none"
          >
            {hourly.map((point) => (
              <div
                key={point.time}
                data-time={point.time}
                className="flex min-w-[4.25rem] flex-col items-center justify-center gap-1 rounded-xl bg-surface-container-highest px-2 py-3 text-center"
              >
                <span className="type-label-sm whitespace-nowrap text-on-surface-variant">
                  {formatHour(point.time, timeZone)}
                </span>
                <Icon
                  name={conditionIcon(point.condition, isDaytime(point.time, daily))}
                  size={24}
                  className="my-0.5 text-secondary-fixed"
                />
                <span className="type-label-lg font-bold text-primary">
                  {formatTemperature(point.temperatureF, unitSystem)}
                </span>
                <span className="type-label-sm whitespace-nowrap text-secondary-fixed">
                  {point.precipitationChance}% rain
                </span>
              </div>
            ))}
          </div>

          {/* The strip's text equivalent. Not decorative: this is how the data is conveyed to
              screen-reader users, so it carries the full series rather than a summary.
              The wrapper, not the table, is what is visually hidden: a table cannot shrink to
              sr-only's 1px (its nowrap text sets its minimum width), and clip-path leaves its
              full width in the page's scrollable area — a sideways scroll on a phone. */}
          <div className="sr-only">
            <table>
              <caption>{dayName ? `Hourly temperatures, ${dayName}` : 'Hourly temperatures'}</caption>
              <thead>
                <tr>
                  <th scope="col">Time</th>
                  <th scope="col">Temperature</th>
                  <th scope="col">Feels like</th>
                  <th scope="col">Rain chance</th>
                </tr>
              </thead>
              <tbody>
                {hourly.map((point) => (
                  <tr key={point.time}>
                    <th scope="row">{formatHour(point.time, timeZone)}</th>
                    <td>{describeTemperature(point.temperatureF, unitSystem)}</td>
                    <td>{describeTemperature(point.feelsLikeF, unitSystem)}</td>
                    <td>{point.precipitationChance}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 type-body-sm text-on-surface-variant">
            Range {formatTemperature(Math.min(...hourly.map((p) => p.temperatureF)), unitSystem)} to{' '}
            {formatTemperature(Math.max(...hourly.map((p) => p.temperatureF)), unitSystem)}{' '}
            {dayName ? `on ${dayName}.` : `over the next ${hourly.length} hours.`}
          </p>
        </>
      )}
    </CardBoundary>
  );
}
