import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { DayPicker } from '@/components/dashboard/day-picker';
import { listForecastDays } from '@/lib/weather/forecast-day';
import { mockWeekWeatherData } from '@/lib/weather/mock-data';

// 2026-07-18 is a Saturday: Today, Tomorrow, then Monday.
const OPTIONS = listForecastDays(mockWeekWeatherData);

function renderPicker(selected: string | null = null, onChange = vi.fn()) {
  render(<DayPicker options={OPTIONS} selected={selected} onChange={onChange} />);
  return { onChange, group: screen.getByRole('group', { name: 'Plan for' }) };
}

describe('DayPicker', () => {
  it('offers one radio per forecast day, labelled from the data', () => {
    const { group } = renderPicker();

    expect(within(group).getAllByRole('radio')).toHaveLength(mockWeekWeatherData.daily.length);
    expect(within(group).getByRole('radio', { name: 'Today' })).toBeInTheDocument();
    expect(within(group).getByRole('radio', { name: 'Tomorrow' })).toBeInTheDocument();
    // Printed "Mon" to fit; named "Monday" for a screen reader.
    expect(within(group).getByRole('radio', { name: 'Monday' })).toBeInTheDocument();
    expect(group).toHaveTextContent('Mon');
  });

  it('checks Today when nothing is selected', () => {
    renderPicker(null);
    expect(screen.getByRole('radio', { name: 'Today' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Monday' })).not.toBeChecked();
  });

  it('checks the selected later day, and only that one', () => {
    renderPicker('2026-07-20');

    expect(screen.getByRole('radio', { name: 'Monday' })).toBeChecked();
    expect(screen.getAllByRole('radio').filter((radio) => (radio as HTMLInputElement).checked)).toHaveLength(1);
  });

  it('shows Today checked for a date the forecast no longer covers, rather than nothing', () => {
    renderPicker('2026-07-01');
    expect(screen.getByRole('radio', { name: 'Today' })).toBeChecked();
  });

  it('reports the chosen date, and null for today', () => {
    const { onChange } = renderPicker('2026-07-19');

    fireEvent.click(screen.getByRole('radio', { name: 'Monday' }));
    expect(onChange).toHaveBeenLastCalledWith('2026-07-20');

    fireEvent.click(screen.getByRole('radio', { name: 'Today' }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('is clickable by its whole chip, not just the hidden input', () => {
    const { onChange } = renderPicker();
    fireEvent.click(screen.getByText('Tomorrow'));
    expect(onChange).toHaveBeenLastCalledWith('2026-07-19');
  });

  /**
   * jsdom has no native radio-group keyboard handling to exercise (and the project has no
   * user-event), so this pins down what the browser's arrow-key behaviour depends on: real radio
   * inputs sharing one name. tests/e2e/home.spec.ts presses the arrow keys for real.
   */
  it('is one native radio group, so the browser supplies Tab and arrow-key movement', () => {
    const { group } = renderPicker();
    const radios = within(group).getAllByRole('radio') as HTMLInputElement[];

    expect(group.tagName).toBe('FIELDSET');
    expect(radios.every((radio) => radio.type === 'radio')).toBe(true);
    expect(new Set(radios.map((radio) => radio.name)).size).toBe(1);
    expect(radios[0].name).not.toBe('');
  });

  it('renders nothing with one day or fewer', () => {
    const { container, rerender } = render(<DayPicker options={OPTIONS.slice(0, 1)} selected={null} onChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();

    rerender(<DayPicker options={[]} selected={null} onChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
