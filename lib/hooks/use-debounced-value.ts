'use client';

import { useEffect, useState } from 'react';

/**
 * Returns `value` only after it has stopped changing for `delayMs`. Used to keep keystrokes in the
 * location search from firing one geocoding request per character.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debouncedValue;
}
