import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LocationSearch } from '@/components/location/location-search';

const GEOCODE_RESULTS = {
  results: [
    { id: 5746545, name: 'Portland', latitude: 45.52345, longitude: -122.67621, admin1: 'Oregon', country: 'United States' },
    { id: 4975802, name: 'Portland', latitude: 43.66147, longitude: -70.25533, admin1: 'Maine', country: 'United States' },
  ],
};

function stubFetch(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('LocationSearch — ARIA structure', () => {
  it('exposes a combobox that starts collapsed', () => {
    stubFetch(GEOCODE_RESULTS);
    render(<LocationSearch onSelect={vi.fn()} />);

    const input = screen.getByRole('combobox', { name: /search for a city or postal code/i });
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).toHaveAttribute('aria-autocomplete', 'list');
    expect(input).not.toHaveAttribute('aria-activedescendant');
  });
});

describe('LocationSearch — searching', () => {
  it('debounces input into a single geocode request and lists the results', async () => {
    const fetchMock = stubFetch(GEOCODE_RESULTS);
    render(<LocationSearch onSelect={vi.fn()} />);

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'Por' } });
    fireEvent.change(input, { target: { value: 'Portl' } });
    fireEvent.change(input, { target: { value: 'Portland' } });

    expect(await screen.findAllByRole('option')).toHaveLength(2);

    // Three keystrokes, one request — that is the debounce doing its job.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain('/api/geocode?name=Portland');
    expect(input).toHaveAttribute('aria-expanded', 'true');
  });

  it('accepts a postal code as the query', async () => {
    const fetchMock = stubFetch(GEOCODE_RESULTS);
    render(<LocationSearch onSelect={vi.fn()} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '97201' } });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0][0]).toContain('name=97201');
  });

  it('does not search for queries shorter than two characters', async () => {
    const fetchMock = stubFetch(GEOCODE_RESULTS);
    render(<LocationSearch onSelect={vi.fn()} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'P' } });

    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('announces when nothing matched', async () => {
    stubFetch({ results: [] });
    render(<LocationSearch onSelect={vi.fn()} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Nowhereville' } });

    expect(await screen.findByText('No matching locations found.')).toBeInTheDocument();
  });

  it('reports an unavailable search without breaking the input', async () => {
    stubFetch({ error: 'upstream down' }, 502);
    render(<LocationSearch onSelect={vi.fn()} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Portland' } });

    expect(await screen.findByText('Location search is unavailable right now.')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('LocationSearch — keyboard', () => {
  async function renderWithResults() {
    stubFetch(GEOCODE_RESULTS);
    const onSelect = vi.fn();
    render(<LocationSearch onSelect={onSelect} />);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'Portland' } });
    await screen.findAllByRole('option');
    return { input, onSelect };
  }

  it('moves the active option with Down Arrow while keeping DOM focus on the input', async () => {
    const { input } = await renderWithResults();

    fireEvent.keyDown(input, { key: 'ArrowDown' });

    const options = screen.getAllByRole('option');
    expect(input).toHaveAttribute('aria-activedescendant', options[0].id);
    expect(options[0]).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input).toHaveAttribute('aria-activedescendant', options[1].id);
  });

  it('wraps from the last option back to the first', async () => {
    const { input } = await renderWithResults();

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });

    expect(input).toHaveAttribute('aria-activedescendant', screen.getAllByRole('option')[0].id);
  });

  it('moves backwards with Up Arrow, wrapping to the last option', async () => {
    const { input } = await renderWithResults();

    fireEvent.keyDown(input, { key: 'ArrowUp' });

    const options = screen.getAllByRole('option');
    expect(input).toHaveAttribute('aria-activedescendant', options[options.length - 1].id);
  });

  it('selects the active option with Enter', async () => {
    const { input, onSelect } = await renderWithResults();

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: '5746545', name: 'Portland', region: 'Oregon' }),
    );
  });

  it('does not select anything on Enter when no option is active', async () => {
    const { input, onSelect } = await renderWithResults();

    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('dismisses the list with Escape', async () => {
    const { input } = await renderWithResults();

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).not.toHaveAttribute('aria-activedescendant');
  });

  it('selects an option on click', async () => {
    const { onSelect } = await renderWithResults();

    fireEvent.mouseDown(screen.getAllByRole('option')[1]);

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: '4975802', region: 'Maine' }));
  });
});

describe('LocationSearch — current location', () => {
  it('selects the browser-reported coordinates on success', async () => {
    stubFetch(GEOCODE_RESULTS);
    const onSelect = vi.fn();
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (success: PositionCallback) =>
          success({ coords: { latitude: 47.6, longitude: -122.33 } } as GeolocationPosition),
      },
    });

    render(<LocationSearch onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /use my current location/i }));

    await waitFor(() =>
      expect(onSelect).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'current', latitude: 47.6, longitude: -122.33 }),
      ),
    );
  });

  it('falls back gracefully when permission is denied, keeping search usable', async () => {
    stubFetch(GEOCODE_RESULTS);
    const onSelect = vi.fn();
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (_success: PositionCallback, failure: PositionErrorCallback) =>
          failure({ code: 1, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError),
      },
    });

    render(<LocationSearch onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /use my current location/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/permission was denied/i);
    expect(onSelect).not.toHaveBeenCalled();
    // The search input must remain available as the fallback path.
    expect(screen.getByRole('combobox')).toBeEnabled();
  });

  it('explains when the browser has no geolocation support', async () => {
    stubFetch(GEOCODE_RESULTS);
    vi.stubGlobal('navigator', {});

    render(<LocationSearch onSelect={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /use my current location/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/does not support location sharing/i);
  });
});
