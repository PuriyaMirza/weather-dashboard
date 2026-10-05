import { Fragment } from 'react';
import { Icon } from '@/components/ui/icon';
import { RangeBar } from '@/components/ui/range-bar';
import { alignForecastDays, sharedTemperatureScale } from '@/lib/weather/compare';
import { conditionIcon } from '@/lib/weather/condition-icon';
import type { DailyForecastDay } from '@/lib/weather/types';
import { formatPercent, formatTemperature, formatWeekday, type UnitSystem } from '@/lib/weather/units';
import { PlaceForecastState, shownWeather, type ComparedPlace } from './place-forecast-state';

interface CompareByDayProps {
  main: ComparedPlace;
  compared: ComparedPlace;
  unitSystem: UnitSystem;
}

interface RowLabel {
  /** What the row header shows: "Today", "Tomorrow", "Sat", or "Fri 17". */
  text: string;
  /** The same day in a sentence: "today", "on Saturday", "on Friday 17". */
  spoken: string;
  isToday: boolean;
}

/** `YYYY-MM-DD` plus whole days, in calendar arithmetic only — no clock, no timezone. */
function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/**
 * Names each row relative to the reference place's first forecast day, which is that place's
 * today. A date before it exists only because the other place is a calendar day behind; a bare
 * weekday there would read as next week's, so it carries its date ("Fri 17"). So does any weekday
 * that occurs twice in the table — the eighth day a one-day offset adds shares its first's weekday.
 */
function labelRows(dates: string[], firstDate: string | undefined): Map<string, RowLabel> {
  const weekdayCounts = new Map<string, number>();
  for (const date of dates) {
    const weekday = formatWeekday(date);
    weekdayCounts.set(weekday, (weekdayCounts.get(weekday) ?? 0) + 1);
  }
  const tomorrow = firstDate ? addDays(firstDate, 1) : undefined;

  return new Map(
    dates.map((date): [string, RowLabel] => {
      if (date === firstDate) return [date, { text: 'Today', spoken: 'today', isToday: true }];
      if (date === tomorrow) return [date, { text: 'Tomorrow', spoken: 'tomorrow', isToday: false }];

      const short = formatWeekday(date);
      const long = formatWeekday(date, 'long');
      const needsDate = (firstDate !== undefined && date < firstDate) || (weekdayCounts.get(short) ?? 0) > 1;
      const dayOfMonth = Number(date.slice(8, 10));
      return [
        date,
        needsDate
          ? { text: `${short} ${dayOfMonth}`, spoken: `on ${long} ${dayOfMonth}`, isToday: false }
          : { text: short, spoken: `on ${long}`, isToday: false },
      ];
    }),
  );
}

/** Divides the second place's columns from the first's, so each group reads as one place. */
const GROUP_DIVIDER = 'border-l border-outline-variant pl-3';

/** The three cells one place contributes to a row. */
function PlaceCells({
  day,
  isToday,
  isFirstGroup,
  scale,
  unitSystem,
}: {
  day: DailyForecastDay;
  isToday: boolean;
  isFirstGroup: boolean;
  scale: { min: number; max: number };
  unitSystem: UnitSystem;
}) {
  return (
    <>
      <td className={`py-1.5 pr-2 ${isFirstGroup ? '' : GROUP_DIVIDER}`}>
        <span className="flex items-center gap-2">
          <Icon
            name={conditionIcon(day.condition)}
            size={20}
            className={`shrink-0 ${isToday ? 'text-secondary-fixed' : 'text-secondary'}`}
          />
          {/* Words only once each place has room for them; always there for assistive tech. */}
          {/* The inner span holds the nowrap: `not-sr-only` resets white-space, which would let
              "Partly cloudy" break over two lines and double the row's height. */}
          <span className="sr-only type-body-sm text-on-surface-variant @[54rem]:not-sr-only">
            <span className="whitespace-nowrap">{day.conditionLabel}</span>
          </span>
        </span>
      </td>
      <td className="w-1/2 py-1.5 pr-2">
        <span className="sr-only">
          Low {formatTemperature(day.lowF, unitSystem)}, high {formatTemperature(day.highF, unitSystem)}
        </span>
        {/* Narrow: high stacked over low, bar hidden — two places' worth of low–bar–high does not
            fit a phone. Wider: the single-place table's low–bar–high, on the shared scale. */}
        <span aria-hidden="true" className="flex flex-col-reverse @[34rem]:flex-row @[34rem]:items-center @[34rem]:gap-2">
          <span className="shrink-0 type-label-sm whitespace-nowrap text-on-surface-variant @[34rem]:w-8 @[34rem]:text-right">
            {formatTemperature(day.lowF, unitSystem)}
          </span>
          <RangeBar
            min={scale.min}
            max={scale.max}
            low={day.lowF}
            high={day.highF}
            tone={isToday ? 'secondary-fixed' : 'secondary'}
            className="hidden min-w-8 flex-1 @[34rem]:block"
          />
          <span className="shrink-0 type-label-md font-bold whitespace-nowrap text-primary @[34rem]:w-8">
            {formatTemperature(day.highF, unitSystem)}
          </span>
        </span>
      </td>
      <td className="py-1.5 pr-3 text-right type-label-sm whitespace-nowrap text-on-surface-variant">
        {day.precipitationChance == null ? '—' : formatPercent(day.precipitationChance)}
      </td>
    </>
  );
}

/**
 * The week as one table, a row per calendar date with both places in it — so "which is nicer on
 * Saturday?" is answered by reading across one row.
 *
 * Rows are matched by date, not position (`alignForecastDays`): two places a timezone apart can be
 * on different days, so one may have no forecast for a row's date. That side shows a dash, said
 * aloud as "No forecast for …", never a borrowed neighbouring day. Both places' bars share one
 * scale, so the warmer place's bars visibly sit further right.
 *
 * A place with no forecast to show gets its column group dropped and a line saying why, rather
 * than a column of dashes that would look like seven missing days.
 */
export function CompareByDay({ main, compared, unitSystem }: CompareByDayProps) {
  const mainDays = shownWeather(main.weather)?.daily ?? [];
  const comparedDays = shownWeather(compared.weather)?.daily ?? [];

  const groups = [
    { key: 'a' as const, place: main, days: mainDays },
    { key: 'b' as const, place: compared, days: comparedDays },
  ].filter((group) => group.days.length > 0);
  const missing = [
    { place: main, days: mainDays },
    { place: compared, days: comparedDays },
  ].filter((group) => group.days.length === 0);

  const rows = alignForecastDays(mainDays, comparedDays);
  const scale = sharedTemperatureScale(mainDays, comparedDays);
  const labels = labelRows(
    rows.map((row) => row.date),
    mainDays[0]?.date ?? comparedDays[0]?.date,
  );
  const names = groups.map((group) => group.place.location.name);

  return (
    <div className="flex flex-col gap-3">
      {missing.map(({ place }) => (
        <PlaceForecastState key={place.location.id} place={place} />
      ))}

      {groups.length > 0 && scale && (
        <div className="@container rounded-xl bg-surface-container-high p-4 shadow-card">
          <table className="w-full border-collapse">
            <caption className="sr-only">7-day forecast by day for {names.join(' and ')}</caption>
            <colgroup>
              <col />
            </colgroup>
            {groups.map((group) => (
              <colgroup key={group.key} span={3} />
            ))}
            <thead>
              <tr>
                <td />
                {groups.map((group, index) => (
                  <th
                    key={group.key}
                    scope="colgroup"
                    colSpan={3}
                    className={`pb-2 text-left align-bottom type-label-md break-words text-primary ${
                      index === 0 ? '' : GROUP_DIVIDER
                    }`}
                  >
                    {group.place.location.name}
                  </th>
                ))}
              </tr>
              <tr>
                <th scope="col" className="sr-only">
                  Day
                </th>
                {groups.map((group) => (
                  <Fragment key={group.key}>
                    <th scope="col" className="sr-only">
                      Conditions
                    </th>
                    <th scope="col" className="sr-only">
                      Low and high
                    </th>
                    <th scope="col" className="sr-only">
                      Rain
                    </th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const label = labels.get(row.date)!;
                return (
                  <tr key={row.date} className="border-t border-outline-variant/60">
                    <th
                      scope="row"
                      className={`py-1.5 pr-3 text-left type-label-md whitespace-nowrap uppercase ${
                        label.isToday ? 'font-bold text-secondary-fixed' : 'text-on-surface'
                      }`}
                    >
                      {label.text}
                    </th>
                    {groups.map((group, index) => {
                      const day = row[group.key];
                      if (day) {
                        return (
                          <PlaceCells
                            key={group.key}
                            day={day}
                            isToday={label.isToday}
                            isFirstGroup={index === 0}
                            scale={scale}
                            unitSystem={unitSystem}
                          />
                        );
                      }
                      return (
                        <td
                          key={group.key}
                          colSpan={3}
                          className={`py-1.5 pr-3 type-label-md text-on-surface-variant ${index === 0 ? '' : GROUP_DIVIDER}`}
                        >
                          <span aria-hidden="true">—</span>
                          <span className="sr-only">
                            No forecast for {group.place.location.name} {label.spoken}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
