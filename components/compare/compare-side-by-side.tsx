import { useId } from 'react';
import { DailyForecastTable } from '@/components/weather/daily-forecast-table';
import { sharedTemperatureScale } from '@/lib/weather/compare';
import type { UnitSystem } from '@/lib/weather/units';
import { ComparePlaceHeader, type CompareSide } from './compare-place';
import { PlaceForecastState, shownWeather, type ComparedPlace } from './place-forecast-state';

interface CompareSideBySideProps {
  main: ComparedPlace;
  compared: ComparedPlace;
  unitSystem: UnitSystem;
}

function PlaceWeek({
  place,
  side,
  scale,
  unitSystem,
}: {
  place: ComparedPlace;
  side: CompareSide;
  scale: { min: number; max: number } | null;
  unitSystem: UnitSystem;
}) {
  const headingId = useId();
  const data = shownWeather(place.weather);
  const days = data?.daily ?? [];
  const { name } = place.location;

  return (
    // @container: the table adapts to this column's width, as it does to a module's.
    <section
      aria-labelledby={headingId}
      className="@container flex min-w-0 flex-col gap-3 rounded-xl bg-surface-container-high p-4 shadow-card"
    >
      <ComparePlaceHeader side={side} headingId={headingId} title={name} />
      {days.length > 0 && scale ? (
        <DailyForecastTable
          days={days}
          scale={scale}
          unitSystem={unitSystem}
          timeZone={data?.location.timezone}
          caption={`7-day forecast for ${name}`}
        />
      ) : (
        <PlaceForecastState place={place} />
      )}
    </section>
  );
}

/**
 * Each place's week in its own column, read down rather than across — the same table the Daily
 * Forecast module uses, so it reads exactly like the dashboard. Both tables draw their bars on one
 * shared scale; scaled separately, a mild week and a hot one would both fill the bar edge to edge.
 *
 * Stacked on a phone, where two columns of seven rows would each be too narrow to read.
 */
export function CompareSideBySide({ main, compared, unitSystem }: CompareSideBySideProps) {
  const scale = sharedTemperatureScale(
    shownWeather(main.weather)?.daily ?? [],
    shownWeather(compared.weather)?.daily ?? [],
  );

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <PlaceWeek place={main} side="main" scale={scale} unitSystem={unitSystem} />
      <PlaceWeek place={compared} side="compared" scale={scale} unitSystem={unitSystem} />
    </div>
  );
}
