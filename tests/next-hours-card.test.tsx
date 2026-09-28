import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { NextHoursCard } from '@/components/weather/next-hours-card';
import { rainRangeLabel } from '@/components/dashboard/hourly-strip';
import { mockWeatherData } from '@/lib/weather/mock-data';

function renderCard(data = mockWeatherData) {
  return render(<NextHoursCard data={data} unitSystem="imperial" />);
}

describe('next hours strip', () => {
  it('lists each hour with its time, temperature and condition in text', () => {
    renderCard();

    const list = screen.getByRole('list', { name: /next hours/i });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(mockWeatherData.hourly.length);
    expect(items[0]).toHaveTextContent('9 AM');
    expect(items[0]).toHaveTextContent('62°');
    expect(items[0]).toHaveTextContent('Clouds');
    expect(items[0]).toHaveTextContent('8% chance of rain');
  });

  it('marks the hour containing the observation as now, with the observed reading and its clock hour', () => {
    renderCard();

    const items = within(screen.getByRole('list', { name: /next hours/i })).getAllByRole('listitem');
    const now = items.find((item) => item.textContent?.includes('Now'));
    expect(now).toBeDefined();
    expect(now).toHaveTextContent('3 PM');
    // The observed 72°, not the 77° forecast for the hour, so it matches the card above it.
    expect(now).toHaveTextContent('72°');
  });

  it('summarises the rain range of the hours shown', () => {
    renderCard();
    expect(screen.getByText('Rain 6–18%')).toBeInTheDocument();
    expect(rainRangeLabel([])).toBeNull();
    expect(rainRangeLabel(mockWeatherData.hourly.slice(0, 1))).toBe('Rain 8%');
  });

  // The wrapping CardBoundary already renders "Next Hours" as its own <h2> — the strip must not
  // repeat it as a second visible heading once it lives in the grid instead of the hero.
  it('does not repeat its own "Next Hours" heading — the card frame already renders one', () => {
    renderCard();
    expect(screen.getAllByRole('heading', { name: /next hours/i })).toHaveLength(1);
  });
});

describe('next hours card states', () => {
  it('is unavailable when there is no hourly data', () => {
    render(<NextHoursCard data={{ ...mockWeatherData, hourly: [] }} unitSystem="imperial" />);
    expect(screen.getByRole('status')).toHaveTextContent(/hourly data is unavailable/i);
  });

  it('is unavailable with no data at all, and loading while a request is in flight', () => {
    render(<NextHoursCard unitSystem="imperial" />);
    expect(screen.getByRole('status')).toHaveTextContent(/hourly data is unavailable/i);

    render(<NextHoursCard isLoading unitSystem="imperial" />);
    expect(screen.getAllByRole('status').at(-1)).toHaveTextContent(/loading the next hours/i);
  });
});
