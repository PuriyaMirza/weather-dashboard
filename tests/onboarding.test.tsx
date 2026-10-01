import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Dashboard } from '@/components/dashboard/dashboard';
import { Onboarding } from '@/components/onboarding/onboarding';
import { DEFAULT_CARD_LAYOUT } from '@/lib/weather/card-layout';
import { DEFAULT_LOCATION } from '@/lib/weather/location';
import { useDashboardStore } from '@/store/dashboard-store';
import type { OnboardingResult } from '@/store/dashboard-store';

beforeEach(() => {
  window.localStorage.clear();
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'stubbed' }), { status: 502 })),
  );
  useDashboardStore.setState({
    location: DEFAULT_LOCATION,
    cards: DEFAULT_CARD_LAYOUT,
    activities: [],
    hasOnboarded: false,
    isEditing: false,
  });
});

function renderFlow(overrides: Partial<Parameters<typeof Onboarding>[0]> = {}) {
  const onComplete = vi.fn<(result: OnboardingResult) => void>();
  const onSkip = vi.fn();
  render(
    <Onboarding initialLocation={DEFAULT_LOCATION} onComplete={onComplete} onSkip={onSkip} {...overrides} />,
  );
  return { onComplete, onSkip };
}

const next = () => fireEvent.click(screen.getByRole('button', { name: /continue/i }));

describe('the onboarding flow', () => {
  it('presents as a labelled dialog and states the step in words', () => {
    renderFlow();

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    // Position in the flow is spoken, not carried by a row of marks alone.
    expect(within(dialog).getByText('Step 1 of 4')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /where are you/i })).toBeInTheDocument();
  });

  it('builds a dashboard from the activities chosen', () => {
    const { onComplete } = renderFlow();

    next();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Cycle' }));
    next();
    next();

    expect(screen.getByRole('heading', { name: /here is your dashboard/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /use this dashboard/i }));

    expect(onComplete).toHaveBeenCalledTimes(1);
    const result = onComplete.mock.calls[0][0];
    expect(result.activities).toEqual(['cycle']);
    const ids = result.cards.map((card) => card.id);
    expect(ids).toEqual(expect.arrayContaining(['wind-speed', 'wind', 'activity-windows']));
  });

  it('recomposes when an answer is changed on the way back', () => {
    // Going back, changing the answer and returning must not leave the previous answer's layout on
    // screen — the most obvious way a multi-step form lies to the person filling it in.
    const { onComplete } = renderFlow();

    next();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Cycle' }));
    next();
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Cycle' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Garden' }));
    next();
    next();

    fireEvent.click(screen.getByRole('button', { name: /use this dashboard/i }));
    const ids = onComplete.mock.calls[0][0].cards.map((card) => card.id);
    expect(ids).toContain('dew-point');
    expect(ids).not.toContain('wind-speed');
  });

  it('hands back the four default favorites when the step is left alone', () => {
    const { onComplete } = renderFlow();

    next();
    next();
    expect(screen.getByRole('heading', { name: /pick your four favorites/i })).toBeInTheDocument();
    next();
    fireEvent.click(screen.getByRole('button', { name: /use this dashboard/i }));

    expect(onComplete.mock.calls[0][0].favoriteMetrics).toEqual(['range', 'feels', 'dew', 'pressure']);
  });

  it('lets a favorite be swapped, and stops at four', () => {
    const { onComplete } = renderFlow();

    next();
    next();
    // Four are preselected, so everything else is locked until one is turned off.
    expect(screen.getByRole('checkbox', { name: 'Pin Humidity' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('4 of 4 chosen');

    fireEvent.click(screen.getByRole('checkbox', { name: 'Pin Dew point' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Pin Air quality' }));
    next();
    fireEvent.click(screen.getByRole('button', { name: /use this dashboard/i }));

    expect(onComplete.mock.calls[0][0].favoriteMetrics).toEqual(['range', 'feels', 'pressure', 'air-quality']);
  });

  it('refuses to finish with an empty dashboard, and says why', () => {
    renderFlow();

    next();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Walk' }));
    next();
    next();

    for (const box of screen.getAllByRole('checkbox')) {
      if ((box as HTMLInputElement).checked) fireEvent.click(box);
    }

    expect(screen.getByRole('button', { name: /use this dashboard/i })).toBeDisabled();
    expect(screen.getByText(/keep at least one module/i)).toBeInTheDocument();
  });

  it('treats skipping as a real answer, from the control and from Escape', () => {
    const { onSkip, onComplete } = renderFlow();

    fireEvent.click(screen.getByRole('button', { name: /skip setup/i }));
    expect(onSkip).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onSkip).toHaveBeenCalledTimes(2);
    expect(onComplete).not.toHaveBeenCalled();
  });
});

describe('choosing a place during the flow', () => {
  const NEW_YORK = {
    results: [{ id: 5128581, name: 'New York', latitude: 40.71427, longitude: -74.00597, admin1: 'New York', country: 'United States' }],
  };

  /** Geocode answers with New York; the weather request stays a permanent error, as above. */
  function stubGeocode() {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        String(url).includes('/api/geocode')
          ? new Response(JSON.stringify(NEW_YORK), { status: 200 })
          : new Response(JSON.stringify({ error: 'stubbed' }), { status: 502 }),
      ),
    );
  }

  async function search(query: string) {
    const input = screen.getByRole('combobox', { name: /search for a city or postal code/i });
    fireEvent.change(input, { target: { value: query } });
    await screen.findByRole('option', { name: /new york/i });
    return input;
  }

  function finish() {
    next();
    next();
    next();
    fireEvent.click(screen.getByRole('button', { name: /use this dashboard/i }));
  }

  it('closes only the suggestion list on Escape, never the whole flow', async () => {
    // The reported bug: Escape to dismiss the suggestions also reached the dialog's own Escape
    // handler, which skipped setup — leaving the default place and never asking again.
    stubGeocode();
    render(<Dashboard />);

    const input = await search('New York');
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(screen.getByRole('dialog', { name: /where are you/i })).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(useDashboardStore.getState().hasOnboarded).toBe(false);
  });

  it('keeps a place picked with Enter through to the finished dashboard', async () => {
    stubGeocode();
    render(<Dashboard />);

    const input = await search('New York');
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(screen.getByText(/using/i)).toHaveTextContent(/new york/i));
    finish();

    expect(useDashboardStore.getState().location).toMatchObject({ name: 'New York', region: 'New York' });
    expect(useDashboardStore.getState().hasOnboarded).toBe(true);
  });
});

describe('the dashboard and the flow', () => {
  it('greets a first-time visitor with it', () => {
    render(<Dashboard />);
    expect(screen.getByRole('dialog', { name: /where are you/i })).toBeInTheDocument();
  });

  it('does not show it again once it has been answered', () => {
    render(<Dashboard />);
    fireEvent.click(screen.getByRole('button', { name: /skip setup/i }));

    expect(useDashboardStore.getState().hasOnboarded).toBe(true);
    expect(screen.queryByRole('dialog', { name: /where are you/i })).not.toBeInTheDocument();
  });

  it('leaves an existing dashboard alone when the flow is skipped', () => {
    render(<Dashboard />);
    fireEvent.click(screen.getByRole('button', { name: /skip setup/i }));
    expect(useDashboardStore.getState().cards).toEqual(DEFAULT_CARD_LAYOUT);
  });
});
