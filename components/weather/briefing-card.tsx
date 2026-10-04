import { buildBriefing } from '@/lib/weather/briefing';
import { laterDayName } from '@/lib/weather/forecast-day';
import type { WeatherCardProps } from './card-registry';
import { CardBoundary } from './card-frame';

const TITLE = 'Briefing';
const DESCRIPTION = 'The day ahead in a few plain sentences: rain, temperature, wind, and how it compares.';

/**
 * The forecast as a person would say it, for whoever wants the gist before the numbers.
 *
 * A list rather than one paragraph: each sentence answers a different question (rain, warmth,
 * wind, tomorrow), and as separate items a screen reader announces how many there are and lets
 * someone step through them. Everything is worked out by `buildBriefing`; this only lays it out.
 */
export function BriefingCard({
  data,
  isLoading,
  errorMessage,
  unitSystem,
  forecastDay,
  isEditing,
  onRemove,
}: WeatherCardProps) {
  const dayName = laterDayName(forecastDay);
  const sentences = data ? buildBriefing(data, { unitSystem, forecastDay }) : [];

  return (
    <CardBoundary
      title={TITLE}
      description={DESCRIPTION}
      subtitle={dayName ?? undefined}
      icon="info"
      isEditing={isEditing}
      onRemove={onRemove}
      isLoading={isLoading}
      errorMessage={errorMessage}
      // buildBriefing returns nothing without hourly data, so this also covers a day with no hours.
      isUnavailable={sentences.length === 0}
      loadingLabel="Putting the briefing together…"
      unavailableLabel="Not enough forecast data for a briefing."
    >
      {sentences.length > 0 && (
        <ul className="flex flex-col gap-2">
          {sentences.map((sentence) => (
            <li
              key={sentence}
              className="border-l-2 border-secondary-container pl-3 type-body-md text-on-surface"
            >
              {sentence}
            </li>
          ))}
        </ul>
      )}
    </CardBoundary>
  );
}
