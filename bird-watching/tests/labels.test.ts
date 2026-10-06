import { describe, expect, it } from 'vitest';
import { formatLength, sizeClassOf } from '@/lib/birds/labels';

describe('sizeClassOf', () => {
  it('puts each yardstick bird in its own class', () => {
    expect(sizeClassOf([3.5, 4.3])).toBe('tiny'); // Ruby-crowned Kinglet
    expect(sizeClassOf([5.9, 6.7])).toBe('sparrow'); // House Sparrow
    expect(sizeClassOf([7.9, 11])).toBe('robin'); // American Robin
    expect(sizeClassOf([9.8, 11.8])).toBe('robin'); // Blue Jay
    expect(sizeClassOf([15.8, 20.9])).toBe('crow'); // American Crow
    expect(sizeClassOf([30, 43])).toBe('large'); // Canada Goose
  });

  it('returns null rather than guessing when length is unknown', () => {
    expect(sizeClassOf(null)).toBeNull();
  });
});

describe('formatLength', () => {
  it('shows a range, or a single value when both ends match', () => {
    expect(formatLength([7.9, 11])).toBe('7.9–11 in');
    expect(formatLength([9.4, 9.4])).toBe('9.4 in');
  });
});
