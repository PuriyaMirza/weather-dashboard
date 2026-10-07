import { Icon } from '@/components/ui/icon';
import { isSamePlace } from '@/lib/weather/compare';
import { formatLocationLabel, type SelectedLocation } from '@/lib/weather/location';

interface CompareSavedPlacesProps {
  /** Already filtered: never includes the main location. See `placesToCompare`. */
  places: SelectedLocation[];
  /** The place being compared now, marked rather than hidden so the list doesn't reshuffle. */
  current: SelectedLocation | null;
  onSelect: (location: SelectedLocation) => void;
}

/**
 * The saved places that can stand beside `main` — every one except `main` itself, which would be
 * a comparison of a place with itself.
 */
export function placesToCompare(saved: SelectedLocation[], main: SelectedLocation): SelectedLocation[] {
  return saved.filter((location) => !isSamePlace(location, main));
}

/**
 * Saved places as one-tap chips: picking one compares with it immediately, with no search step.
 * Each chip's name spells out the region too, so two saved Portlands are never two identical
 * "Compare with Portland" buttons.
 */
export function CompareSavedPlaces({ places, current, onSelect }: CompareSavedPlacesProps) {
  return (
    <ul aria-label="Saved places" className="flex flex-wrap gap-2">
      {places.map((location) => {
        const isCurrent = current !== null && isSamePlace(location, current);
        return (
          <li key={location.id}>
            <button
              type="button"
              onClick={() => onSelect(location)}
              aria-label={`Compare with ${formatLocationLabel(location)}`}
              aria-current={isCurrent ? 'true' : undefined}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 type-label-lg outline-none focus-visible:ring-2 focus-visible:ring-secondary-fixed ${
                isCurrent
                  ? 'bg-secondary-container text-secondary-fixed'
                  : 'bg-surface-container-highest text-on-surface hover:bg-surface-bright'
              }`}
            >
              {/* The tick marks the place already being compared alongside aria-current, so it is
                  not colour alone. */}
              {isCurrent && <Icon name="check" size={16} />}
              {location.name}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
