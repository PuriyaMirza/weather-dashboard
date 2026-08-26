'use client';

import { useEffect, useId, useState } from 'react';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { coordinatesToLocation, geocodingResultToLocation, type SelectedLocation } from '@/lib/weather/location';
import type { OpenMeteoGeocodingResult } from '@/lib/weather/schemas';

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;
const GEOLOCATION_TIMEOUT_MS = 10_000;

type SearchStatus = 'idle' | 'searching' | 'done' | 'error';

interface SearchOutcome {
  query: string;
  results: SelectedLocation[];
  status: 'done' | 'error';
}

interface LocationSearchProps {
  onSelect: (location: SelectedLocation) => void;
}

function geolocationErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'Location permission was denied. You can still search for a place by name above.';
    case error.POSITION_UNAVAILABLE:
      return 'Your location could not be determined. You can still search for a place by name above.';
    case error.TIMEOUT:
      return 'Finding your location took too long. You can still search for a place by name above.';
    default:
      return 'Your location is unavailable. You can still search for a place by name above.';
  }
}

/**
 * Editable combobox with list autocomplete, following the WAI-ARIA APG pattern: DOM focus stays on
 * the input at all times and `aria-activedescendant` points at the visually highlighted option, so
 * arrow-key browsing works for screen-reader and sighted keyboard users alike.
 *
 * Note on state shape: results and the active option are stored *against the query that produced
 * them*, and everything else is derived. That way a new query implicitly means "no results yet,
 * nothing active" without an effect having to reset state, which would cause cascading renders.
 */
export function LocationSearch({ onSelect }: LocationSearchProps) {
  const [query, setQuery] = useState('');
  const [outcome, setOutcome] = useState<SearchOutcome | null>(null);
  const [active, setActive] = useState<{ query: string; index: number } | null>(null);
  const [dismissedQuery, setDismissedQuery] = useState<string | null>(null);
  const [geolocationError, setGeolocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const baseId = useId();
  const listboxId = `${baseId}-listbox`;
  const optionId = (index: number) => `${baseId}-option-${index}`;

  const debouncedQuery = useDebouncedValue(query.trim(), DEBOUNCE_MS);
  const isTooShort = debouncedQuery.length < MIN_QUERY_LENGTH;

  const currentOutcome = !isTooShort && outcome?.query === debouncedQuery ? outcome : null;
  const results = currentOutcome?.results ?? [];
  const status: SearchStatus = isTooShort ? 'idle' : (currentOutcome?.status ?? 'searching');
  const activeIndex = active?.query === debouncedQuery ? active.index : -1;
  const isOpen = results.length > 0 && dismissedQuery !== debouncedQuery;

  useEffect(() => {
    if (debouncedQuery.length < MIN_QUERY_LENGTH) return;

    const controller = new AbortController();

    async function search() {
      try {
        const response = await fetch(`/api/geocode?name=${encodeURIComponent(debouncedQuery)}`, {
          signal: controller.signal,
        });
        const body = await response.json();

        if (!response.ok) {
          setOutcome({ query: debouncedQuery, results: [], status: 'error' });
          return;
        }

        const locations = ((body?.results ?? []) as OpenMeteoGeocodingResult[]).map(geocodingResultToLocation);
        setOutcome({ query: debouncedQuery, results: locations, status: 'done' });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setOutcome({ query: debouncedQuery, results: [], status: 'error' });
      }
    }

    void search();
    return () => controller.abort();
  }, [debouncedQuery]);

  function choose(location: SelectedLocation) {
    onSelect(location);
    setQuery('');
    setActive(null);
    // Keep the list dismissed for the query that was just resolved.
    setDismissedQuery(debouncedQuery);
    setGeolocationError(null);
  }

  function moveActive(delta: number) {
    if (results.length === 0) return;
    const next =
      activeIndex < 0
        ? delta > 0
          ? 0
          : results.length - 1
        : (activeIndex + delta + results.length) % results.length;
    setActive({ query: debouncedQuery, index: next });
    setDismissedQuery(null);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveActive(1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveActive(-1);
      return;
    }

    if (event.key === 'Enter') {
      if (isOpen && activeIndex >= 0 && results[activeIndex]) {
        event.preventDefault();
        choose(results[activeIndex]);
      }
      return;
    }

    if (event.key === 'Escape') {
      setDismissedQuery(debouncedQuery);
      setActive(null);
    }
  }

  // Not named use* — it is an event handler, and the hooks lint rule treats that prefix as a hook.
  function requestCurrentLocation() {
    setGeolocationError(null);

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeolocationError(
        'This browser does not support location sharing. You can still search for a place by name above.',
      );
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        choose(coordinatesToLocation(position.coords.latitude, position.coords.longitude));
      },
      (error) => {
        setIsLocating(false);
        setGeolocationError(geolocationErrorMessage(error));
      },
      { timeout: GEOLOCATION_TIMEOUT_MS },
    );
  }

  const statusMessage =
    status === 'searching'
      ? 'Searching…'
      : status === 'error'
        ? 'Location search is unavailable right now.'
        : status === 'done'
          ? results.length === 0
            ? 'No matching locations found.'
            : `${results.length} location${results.length === 1 ? '' : 's'} found.`
          : '';

  return (
    <div className="w-full">
      <label htmlFor={`${baseId}-input`} className="block text-sm font-medium text-ink">
        Search for a city or postal code
      </label>

      <div className="relative mt-2">
        <input
          id={`${baseId}-input`}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={isOpen && activeIndex >= 0 ? optionId(activeIndex) : undefined}
          aria-describedby={`${baseId}-status`}
          value={query}
          placeholder="e.g. Portland, or 97201"
          onChange={(event) => {
            setQuery(event.target.value);
            // Typing re-opens a list the user previously dismissed with Escape.
            setDismissedQuery(null);
          }}
          onKeyDown={handleKeyDown}
          className="w-full rounded-2xl border border-line-strong bg-card px-4 py-2.5 text-ink shadow-sm outline-none placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent"
        />

        <ul
          id={listboxId}
          role="listbox"
          aria-label="Location results"
          hidden={!isOpen}
          className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-2xl border border-line bg-card py-1 shadow-lg"
        >
          {results.map((location, index) => (
            <li
              key={location.id}
              id={optionId(index)}
              role="option"
              aria-selected={index === activeIndex}
              // mousedown fires before the input's blur, so the selection isn't lost to the list closing.
              onMouseDown={(event) => {
                event.preventDefault();
                choose(location);
              }}
              onMouseEnter={() => setActive({ query: debouncedQuery, index })}
              className={`cursor-pointer px-4 py-2 text-sm ${
                index === activeIndex ? 'bg-accent text-card' : 'text-ink'
              }`}
            >
              <span className="font-medium">{location.name}</span>
              {(location.region || location.country) && (
                <span className={index === activeIndex ? 'text-accent-soft' : 'text-muted'}>
                  {' — '}
                  {[location.region, location.country].filter(Boolean).join(', ')}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Announces result counts to screen readers without stealing focus from the input. */}
      <p id={`${baseId}-status`} role="status" aria-live="polite" className="sr-only">
        {statusMessage}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={requestCurrentLocation}
          disabled={isLocating}
          className="rounded-full border border-line-strong bg-card px-4 py-2 text-sm font-medium text-ink shadow-sm outline-none hover:bg-canvas focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLocating ? 'Finding your location…' : 'Use my current location'}
        </button>
      </div>

      {geolocationError && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {geolocationError}
        </p>
      )}
    </div>
  );
}
