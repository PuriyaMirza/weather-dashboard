import { describe, expect, it } from 'vitest';
import {
  coordinatesToLocation,
  formatLocationLabel,
  geocodingResultToLocation,
} from '@/lib/weather/location';
import type { OpenMeteoGeocodingResult } from '@/lib/weather/schemas';

describe('geocodingResultToLocation', () => {
  it('maps a full geocoding result', () => {
    const result: OpenMeteoGeocodingResult = {
      id: 5746545,
      name: 'Portland',
      latitude: 45.52345,
      longitude: -122.67621,
      admin1: 'Oregon',
      country: 'United States',
    };

    expect(geocodingResultToLocation(result)).toEqual({
      id: '5746545',
      name: 'Portland',
      region: 'Oregon',
      country: 'United States',
      latitude: 45.52345,
      longitude: -122.67621,
    });
  });

  it('falls back to empty strings when optional administrative fields are absent', () => {
    const result: OpenMeteoGeocodingResult = { id: 1, name: 'Nowhere', latitude: 0, longitude: 0 };
    const location = geocodingResultToLocation(result);

    expect(location.region).toBe('');
    expect(location.country).toBe('');
  });
});

describe('formatLocationLabel', () => {
  it('joins the populated parts', () => {
    expect(
      formatLocationLabel({
        id: '1',
        name: 'Portland',
        region: 'Oregon',
        country: 'United States',
        latitude: 0,
        longitude: 0,
      }),
    ).toBe('Portland, Oregon, United States');
  });

  it('skips empty parts instead of leaving stray separators', () => {
    expect(
      formatLocationLabel({ id: 'current', name: 'Current location', region: '', country: '', latitude: 0, longitude: 0 }),
    ).toBe('Current location');
  });
});

describe('coordinatesToLocation', () => {
  it('labels browser-provided coordinates generically', () => {
    expect(coordinatesToLocation(45.5, -122.6)).toEqual({
      id: 'current',
      name: 'Current location',
      region: '',
      country: '',
      latitude: 45.5,
      longitude: -122.6,
    });
  });
});
