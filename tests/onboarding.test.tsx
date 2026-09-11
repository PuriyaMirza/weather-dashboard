import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
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
    expect(within(dialog).getByText('Step 1 of 3')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /where are you/i })).toBeInTheDocument();
  });

  it('builds a dashboard from the activities chosen', () => {
    const { onComplete } = renderFlow();

    next();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Cycle' }));
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

    fireEvent.click(screen.getByRole('button', { name: /use this dashboard/i }));
    const ids = onComplete.mock.calls[0][0].cards.map((card) => card.id);
    expect(ids).toContain('dew-point');
    expect(ids).not.toContain('wind-speed');
  });

  it('refuses to finish with an empty dashboard, and says why', () => {
    renderFlow();

    next();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Walk' }));
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
