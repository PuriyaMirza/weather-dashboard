import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { WeatherEffect } from '@/components/dashboard/weather-effect';
import type { WeatherCondition } from '@/lib/weather/types';

/** Conditions the existing static fog-band art already covers without any added motion. */
const NO_EFFECT_CONDITIONS: WeatherCondition[] = ['partly-cloudy', 'cloudy', 'fog'];

describe('WeatherEffect', () => {
  it('renders nothing for conditions the static art already covers', () => {
    for (const condition of NO_EFFECT_CONDITIONS) {
      const { container } = render(<WeatherEffect condition={condition} isDay />);
      expect(container).toBeEmptyDOMElement();
    }
  });

  it('renders no glow for a clear night — there is no sun in it to glow', () => {
    const { container } = render(<WeatherEffect condition="sunny" isDay={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('is always aria-hidden, since the condition is already stated in words in the hero heading', () => {
    const { container } = render(<WeatherEffect condition="rain" isDay />);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('draws falling streaks for rain', () => {
    const { container } = render(<WeatherEffect condition="rain" isDay />);
    const streaks = container.querySelectorAll('.weather-effect-streak');
    expect(streaks.length).toBeGreaterThan(0);
    expect(container.querySelectorAll('.weather-effect-flash')).toHaveLength(0);
  });

  it('draws denser streaks plus a flash for storm', () => {
    const rain = render(<WeatherEffect condition="rain" isDay />).container.querySelectorAll('.weather-effect-streak');
    const { container } = render(<WeatherEffect condition="storm" isDay />);
    const streaks = container.querySelectorAll('.weather-effect-streak');
    expect(streaks.length).toBeGreaterThan(rain.length);
    expect(container.querySelectorAll('.weather-effect-flash')).toHaveLength(1);
  });

  it('draws flakes for snow', () => {
    const { container } = render(<WeatherEffect condition="snow" isDay />);
    expect(container.querySelectorAll('.weather-effect-flake').length).toBeGreaterThan(0);
  });

  it('draws a glow for sunny by day only', () => {
    const { container } = render(<WeatherEffect condition="sunny" isDay />);
    expect(container.querySelectorAll('.weather-effect-glow')).toHaveLength(1);
  });

  it('stays lightweight — the busiest condition (storm: 20 streaks, 1 flash, 1 wrapper) stays under 25 nodes', () => {
    const { container } = render(<WeatherEffect condition="storm" isDay />);
    expect(container.querySelectorAll('*').length).toBeLessThanOrEqual(25);
  });

  it('is the same markup every render, since it only ever mounts after real data has loaded', () => {
    const first = render(<WeatherEffect condition="rain" isDay />).container.innerHTML;
    const second = render(<WeatherEffect condition="rain" isDay />).container.innerHTML;
    expect(first).toBe(second);
  });
});
