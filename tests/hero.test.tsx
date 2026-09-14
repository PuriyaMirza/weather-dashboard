import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Dashboard } from '@/components/dashboard/dashboard';
import { DEFAULT_CARD_LAYOUT } from '@/lib/weather/card-layout';
import { DEFAULT_LOCATION } from '@/lib/weather/location';
import { mockWeatherData } from '@/lib/weather/mock-data';
import { useDashboardStore } from '@/store/dashboard-store';

function ok(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
}

beforeEach(() => {
  window.localStorage.clear();
  useDashboardStore.setState({
    location: DEFAULT_LOCATION,
    unitSystem: 'imperial',
    cards: DEFAULT_CARD_LAYOUT,
    isEditing: false,
    hasOnboarded: true,
  });
});

describe('hero high/low', () => {
  it('shows today\'s high and low alongside the current reading', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok(mockWeatherData)));

    render(<Dashboard />);

    // The hero's condition line is one text node broken up by JSX expressions, so it is matched by
    // its accumulated text content rather than an exact string.
    const conditionLine = await screen.findByText((_content, element) => {
      if (element?.tagName !== 'P') return false;
      const text = element.textContent ?? '';
      return text.includes('High 79°') && text.includes('Low 58°');
    });
    expect(conditionLine).toBeInTheDocument();
  });
});
