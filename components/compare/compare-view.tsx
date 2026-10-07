'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import type { UseWeatherDataResult } from '@/lib/hooks/use-weather-data';
import { describeCurrentDifference, type CompareLayout } from '@/lib/weather/compare';
import type { SelectedLocation } from '@/lib/weather/location';
import type { UnitSystem } from '@/lib/weather/units';
import { CompareByDay } from './compare-by-day';
import { CompareLayoutToggle } from './compare-layout-toggle';
import { ComparePlace, ComparePlaceHeader, PLACE_ACTION } from './compare-place';
import { CompareSavedPlaces, placesToCompare } from './compare-saved-places';
import { CompareSideBySide } from './compare-side-by-side';

interface CompareViewProps {
  /** The dashboard's own location ("A"). */
  mainLocation: SelectedLocation;
  /** The place set beside it ("B"); null until one has been picked. */
  compareLocation: SelectedLocation | null;
  /** The dashboard's existing request for A — Compare never fetches A a second time. */
  mainWeather: UseWeatherDataResult;
  compareWeather: UseWeatherDataResult;
  unitSystem: UnitSystem;
  layout: CompareLayout;
  onLayoutChange: (layout: CompareLayout) => void;
  /** For the empty prompt's one-tap chips. */
  savedLocations: SelectedLocation[];
  onSelectCompare: (location: SelectedLocation) => void;
  /** Opens the picker; receives the control that opened it, for focus to return to. */
  onChangeCompare: (trigger: HTMLElement) => void;
  onSwap: () => void;
  onDone: () => void;
}

/** The prompt standing in for the compared place until one is picked. */
function CompareEmpty({
  mainLocation,
  savedLocations,
  onSelect,
  onChoose,
}: {
  mainLocation: SelectedLocation;
  savedLocations: SelectedLocation[];
  onSelect: (location: SelectedLocation) => void;
  onChoose: (trigger: HTMLElement) => void;
}) {
  const headingId = useId();
  const others = placesToCompare(savedLocations, mainLocation);

  return (
    <article
      aria-labelledby={headingId}
      className="flex min-w-0 flex-col gap-4 rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-4"
    >
      <ComparePlaceHeader side="compared" headingId={headingId} title="Pick a place to compare with" />
      <p className="type-body-sm text-on-surface-variant">
        See its weather right now and its week beside {mainLocation.name}.
      </p>
      <button
        type="button"
        onClick={(event) => onChoose(event.currentTarget)}
        className={`${PLACE_ACTION} self-start bg-secondary-fixed text-on-secondary hover:bg-primary-fixed`}
      >
        <Icon name="search" size={18} />
        Choose a place
      </button>
      {others.length > 0 && (
        <div className="flex flex-col gap-2">
          <p aria-hidden="true" className="type-label-sm uppercase text-secondary">
            Or one of your saved places
          </p>
          <CompareSavedPlaces places={others} current={null} onSelect={onSelect} />
        </div>
      )}
    </article>
  );
}

/**
 * The Compare view: the dashboard's location beside one other place — right now, then the week.
 *
 * It is handed both forecasts and never fetches; the dashboard owns both requests, so A's is the
 * very one the grid uses and B's exists only while this view is open. Switching units re-renders
 * both sides and re-fetches nothing.
 */
export function CompareView({
  mainLocation,
  compareLocation,
  mainWeather,
  compareWeather,
  unitSystem,
  layout,
  onLayoutChange,
  savedLocations,
  onSelectCompare,
  onChangeCompare,
  onSwap,
  onDone,
}: CompareViewProps) {
  const headingId = useId();
  const rightNowId = useId();
  const weekId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const changeButtonRef = useRef<HTMLButtonElement>(null);
  const [announcement, setAnnouncement] = useState('');

  // The view replaces the whole dashboard below the header, so focus moves to its heading: the
  // change is announced, and the next Tab starts at the top of the view rather than back in the
  // header.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  // Picking a place swaps the empty prompt for that place's card, which removes whatever control
  // in the prompt had focus. Focus would fall to <body>, so it goes to the new card's Change.
  const compareId = compareLocation?.id ?? null;
  const previousCompareId = useRef(compareId);
  useEffect(() => {
    if (previousCompareId.current === compareId) return;
    previousCompareId.current = compareId;
    const active = document.activeElement;
    if (!active || active === document.body) changeButtonRef.current?.focus();
  }, [compareId]);

  const main = { location: mainLocation, weather: mainWeather };
  const compared = compareLocation ? { location: compareLocation, weather: compareWeather } : null;

  // Only from two fresh readings: a sentence built on a stale one would state an old gap as now.
  const difference =
    compared && mainWeather.state.status === 'ready' && compareWeather.state.status === 'ready'
      ? describeCurrentDifference(mainWeather.state.data!, compareWeather.state.data!, unitSystem)
      : null;

  function swap() {
    if (!compareLocation) return;
    onSwap();
    // Nothing else is announced: the button keeps focus and only the names around it change.
    setAnnouncement(`${compareLocation.name} is now your main location, compared with ${mainLocation.name}.`);
  }

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-6">
      <div>
        <div className="flex items-center justify-between gap-3">
          <h2
            ref={headingRef}
            id={headingId}
            tabIndex={-1}
            className="flex items-center gap-2 rounded-lg type-headline-md text-primary outline-none focus-visible:ring-2 focus-visible:ring-secondary-fixed"
          >
            <Icon name="compare-arrows" size={26} className="shrink-0 text-secondary-fixed" />
            Compare
          </h2>
          <button
            type="button"
            onClick={onDone}
            className={`${PLACE_ACTION} bg-secondary-fixed px-5 text-on-secondary hover:bg-primary-fixed focus-visible:ring-offset-2 focus-visible:ring-offset-surface`}
          >
            <Icon name="check" size={18} />
            Done
          </button>
        </div>
        {/* Live, and present before it has anything to say: the sentence arrives with the second
            forecast, and a region that appears already filled is often not announced at all. */}
        <p aria-live="polite" className="mt-2 type-body-md text-on-surface">
          {difference}
        </p>
        <p aria-live="polite" className="sr-only">
          {announcement}
        </p>
      </div>

      <section aria-labelledby={rightNowId}>
        <h3 id={rightNowId} className="mb-3 type-headline-sm text-primary">
          Right now
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ComparePlace place={main} side="main" unitSystem={unitSystem} />
          {compared ? (
            <ComparePlace
              place={compared}
              side="compared"
              unitSystem={unitSystem}
              onChange={onChangeCompare}
              onSwap={swap}
              changeButtonRef={changeButtonRef}
            />
          ) : (
            <CompareEmpty
              mainLocation={mainLocation}
              savedLocations={savedLocations}
              onSelect={onSelectCompare}
              onChoose={onChangeCompare}
            />
          )}
        </div>
      </section>

      {/* Nothing to set a week beside until a second place is picked. */}
      {compared && (
        <section aria-labelledby={weekId} className="flex flex-col gap-3">
          {/* The toggle's legend is the visible title; this names the region for heading navigation. */}
          <h3 id={weekId} className="sr-only">
            7-day forecast
          </h3>
          <CompareLayoutToggle value={layout} onChange={onLayoutChange} />
          {layout === 'by-day' ? (
            <CompareByDay main={main} compared={compared} unitSystem={unitSystem} />
          ) : (
            <CompareSideBySide main={main} compared={compared} unitSystem={unitSystem} />
          )}
        </section>
      )}
    </section>
  );
}
