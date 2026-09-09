import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ModuleBoundary } from '@/components/weather/module-boundary';
import { CardFrame } from '@/components/weather/card-frame';

/**
 * React logs caught render errors to console.error regardless of the boundary, which would bury
 * the real test output. Silenced here, and asserted on where it matters.
 */
let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
});

function Exploding(): never {
  throw new Error('upstream field disappeared');
}

function Healthy() {
  return (
    <CardFrame title="Humidity" description="Relative humidity.">
      <p>54%</p>
    </CardFrame>
  );
}

describe('ModuleBoundary', () => {
  it('renders its child untouched when nothing goes wrong', () => {
    render(
      <ModuleBoundary title="Humidity" description="Relative humidity.">
        <Healthy />
      </ModuleBoundary>,
    );

    expect(screen.getByText('54%')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('replaces a throwing module with a failed state instead of propagating', () => {
    render(
      <ModuleBoundary title="Dew Point" description="The temperature at which air becomes saturated.">
        <Exploding />
      </ModuleBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/ran into a problem/i);
  });

  it('still names the module, so the failure says which one broke', () => {
    render(
      <ModuleBoundary title="Dew Point" description="The temperature at which air becomes saturated.">
        <Exploding />
      </ModuleBoundary>,
    );

    expect(screen.getByRole('heading', { name: 'Dew Point' })).toBeInTheDocument();
  });

  /**
   * The whole point. Without a boundary per module, React unmounts the entire tree on any throw —
   * one bad reading would cost the user every other module, their location and their layout.
   */
  it('contains the failure to its own module, leaving the others rendering', () => {
    render(
      <div>
        <ModuleBoundary title="Dew Point" description="Dew point.">
          <Exploding />
        </ModuleBoundary>
        <ModuleBoundary title="Humidity" description="Relative humidity.">
          <Healthy />
        </ModuleBoundary>
      </div>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    // The healthy neighbour is untouched.
    expect(screen.getByText('54%')).toBeInTheDocument();
  });

  it('reports the failure rather than swallowing it, so a bug is not merely hidden', () => {
    render(
      <ModuleBoundary title="Dew Point" description="Dew point.">
        <Exploding />
      </ModuleBoundary>,
    );

    const calls = consoleError.mock.calls as unknown[][];
    const reported = calls.some((call) =>
      call.some((argument) => typeof argument === 'string' && argument.includes('"Dew Point" module failed')),
    );
    expect(reported, 'the boundary must log the failure it caught').toBe(true);
  });
});
