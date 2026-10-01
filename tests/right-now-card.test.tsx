import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RightNowCard } from '@/components/weather/right-now-card';
import { mockWeatherData } from '@/lib/weather/mock-data';
import type { UnitSystem } from '@/lib/weather/units';

function renderCard(data = mockWeatherData, unitSystem: UnitSystem = 'imperial') {
  return render(<RightNowCard data={data} unitSystem={unitSystem} />);
}

describe('right now module', () => {
  it('shows the temperature, condition and next-hour rain odds under its own heading', () => {
    renderCard();

    expect(screen.getByRole('heading', { name: 'Right Now' })).toBeInTheDocument();
    expect(screen.getByText('72 degrees Fahrenheit')).toBeInTheDocument();
    expect(screen.getByText('Partly cloudy')).toBeInTheDocument();
    expect(screen.getByText('12%')).toBeInTheDocument();
    expect(screen.getByText('Next hour')).toBeInTheDocument();
  });

  it('does not repeat its title inside the body', () => {
    renderCard();
    expect(screen.queryByText('Right now')).toBeNull();
  });

  it('follows the unit setting', () => {
    renderCard(mockWeatherData, 'metric');
    expect(screen.getByText('22 degrees Celsius')).toBeInTheDocument();
  });

  it('shows its unavailable state rather than inventing a reading', () => {
    renderCard({ ...mockWeatherData, current: null });
    expect(screen.getByText('Current conditions are unavailable.')).toBeInTheDocument();
  });
});
