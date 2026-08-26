'use client';

import { formatLocationLabel, type SelectedLocation } from '@/lib/weather/location';

interface SavedLocationsProps {
  active: SelectedLocation;
  saved: SelectedLocation[];
  onSelect: (location: SelectedLocation) => void;
  onSave: (location: SelectedLocation) => void;
  onRemove: (id: string) => void;
}

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
            className={`inline-flex items-center rounded-full border text-xs font-semibold ${
              isActive ? 'border-transparent bg-ink text-card' : 'border-line bg-card text-ink'
            }`}
          >
            <button
              type="button"
              onClick={() => onSelect(location)}
              aria-current={isActive ? 'true' : undefined}
              className="rounded-l-full py-1.5 pl-3 pr-2 outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {location.name}
              <span className="sr-only">{`Show weather for ${label}`}</span>
            </button>
            <button
              type="button"
              onClick={() => onRemove(location.id)}
              aria-label={`Remove ${label} from saved locations`}
              className="rounded-r-full py-1.5 pl-1 pr-3 opacity-70 outline-none hover:opacity-100 focus-visible:ring-2 focus-visible:ring-accent"
            >
              <span aria-hidden="true">×</span>
            </button>
          </span>
        );
      })}

      {!isActiveSaved && (
        <button
          type="button"
          onClick={() => onSave(active)}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-line-strong bg-transparent px-3 py-1.5 text-xs font-semibold text-muted outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-accent"
        >
          <span aria-hidden="true">+</span> Save {active.name}
        </button>
      )}
    </div>
  );
}
