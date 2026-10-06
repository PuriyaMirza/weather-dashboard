import { describe, expect, it } from 'vitest';
import { clockTime, dayLabel, whenObserved } from '@/lib/live/format';

describe('format', () => {
  it('formats local clock times without timezone shifts', () => {
    expect(clockTime('2026-10-05T06:58')).toBe('6:58 AM');
    expect(clockTime('2026-10-05T12:05')).toBe('12:05 PM');
    expect(clockTime('2026-10-05T00:30')).toBe('12:30 AM');
  });

  it('describes when a bird was seen', () => {
    expect(whenObserved('2026-10-05 08:15', '2026-10-05')).toBe('Today 8:15 AM');
    expect(whenObserved('2026-10-04', '2026-10-05')).toBe('Yesterday');
    expect(whenObserved('2026-10-01 07:00', '2026-10-05')).toBe('Oct 1');
  });

  it('labels forecast days', () => {
    expect(dayLabel('2026-10-05', '2026-10-05')).toBe('This morning');
    expect(dayLabel('2026-10-06', '2026-10-05')).toBe('Tomorrow morning');
  });
});
