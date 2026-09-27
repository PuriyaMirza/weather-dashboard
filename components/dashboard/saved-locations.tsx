'use client';

import { Icon } from '@/components/ui/icon';
import { formatLocationLabel, type SelectedLocation } from '@/lib/weather/location';

interface SavedLocationsProps {
  active: SelectedLocation;
  saved: SelectedLocation[];
  onSelect: (location: SelectedLocation) => void;
  onSave: (location: SelectedLocation) => void;
  onRemove: (id: string) => void;
}

const FOCUS_RING = 'outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-secondary-fixed';

/**
 * Quick-switch row for places the user keeps. Every control names its location, so a screen-reader
 * user never meets a row of identical "Remove" buttons.
 */
export function SavedLocations({ active, saved, onSelect, onSave, onRemove }: SavedLocationsProps) {
  const isActiveSaved = saved.some((location) => location.id === active.id);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <h2 className="sr-only">Saved locations</h2>

      {saved.map((location) => {
        const isActive = location.id === active.id;
        const label = formatLocationLabel(location);
        return (
          <span
            key={location.id}
            className={`inline-flex min-h-11 items-center overflow-hidden rounded-full type-label-lg ${
              isActive
                ? 'bg-secondary-container text-secondary-fixed'
                : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
            }`}
          >
            <button
              type="button"
              onClick={() => onSelect(location)}
              aria-current={isActive ? 'true' : undefined}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-l-full py-2 pl-4 pr-1.5 ${FOCUS_RING}`}
            >
              {/* The pin marks the current place alongside aria-current, so it is not colour alone. */}
              {isActive && <Icon name="location" size={16} />}
              {location.name}
              <span className="sr-only">{`Show weather for ${label}`}</span>
            </button>
            <button
              type="button"
              onClick={() => onRemove(location.id)}
              aria-label={`Remove ${label} from saved locations`}
              className={`flex h-11 w-10 items-center justify-center rounded-r-full pr-1 opacity-80 hover:opacity-100 ${FOCUS_RING}`}
            >
              <Icon name="close" size={16} />
            </button>
          </span>
        );
      })}

      {!isActiveSaved && (
        <button
          type="button"
          onClick={() => onSave(active)}
          className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border border-dashed border-on-surface-variant px-4 type-label-lg text-on-surface-variant hover:border-secondary-fixed hover:text-secondary-fixed ${FOCUS_RING}`}
        >
          <Icon name="bookmark" size={16} />
          Save {active.name}
        </button>
      )}
    </div>
  );
}
