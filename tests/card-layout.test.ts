import { describe, expect, it } from 'vitest';
import { ALL_CARD_IDS, DEFAULT_CARD_LAYOUT, moveEntry, reconcileLayout } from '@/lib/weather/card-layout';
import { weatherCardRegistry } from '@/components/weather/card-registry';

describe('ALL_CARD_IDS', () => {
  it('stays in step with the registry', () => {
    // If a card is added to the registry without updating this list, persisted layouts containing
    // it would be silently discarded during reconciliation.
    expect([...ALL_CARD_IDS].sort()).toEqual(weatherCardRegistry.map((card) => card.id).sort());
  });
});

describe('DEFAULT_CARD_LAYOUT', () => {
  it('references only registered cards', () => {
    for (const entry of DEFAULT_CARD_LAYOUT) {
      expect(ALL_CARD_IDS).toContain(entry.id);
    }
  });

  it('has no duplicates', () => {
    const ids = DEFAULT_CARD_LAYOUT.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('moveEntry', () => {
  it('moves an item later', () => {
    expect(moveEntry(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
  });

  it('moves an item earlier', () => {
    expect(moveEntry(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
  });

  it('returns the original array for a no-op or out-of-range move', () => {
    const items = ['a', 'b', 'c'];
    expect(moveEntry(items, 1, 1)).toBe(items);
    expect(moveEntry(items, -1, 1)).toBe(items);
    expect(moveEntry(items, 0, 5)).toBe(items);
  });
});

describe('reconcileLayout', () => {
  it('keeps a valid saved layout, preserving order and spans', () => {
    const saved = [
      { id: 'wind', span: 'wide' },
      { id: 'comfort', span: 'single' },
    ];
    expect(reconcileLayout(saved)).toEqual(saved);
  });

  it('drops ids the current version no longer knows about', () => {
    const saved = [{ id: 'wind', span: 'single' }, { id: 'retired-card', span: 'single' }];
    expect(reconcileLayout(saved)).toEqual([{ id: 'wind', span: 'single' }]);
  });

  it('drops duplicate entries, which would otherwise collide as React keys', () => {
    const saved = [
      { id: 'wind', span: 'single' },
      { id: 'wind', span: 'wide' },
    ];
    expect(reconcileLayout(saved)).toEqual([{ id: 'wind', span: 'single' }]);
  });

  it('coerces an unrecognised span to single rather than trusting it', () => {
    expect(reconcileLayout([{ id: 'wind', span: 'enormous' }])).toEqual([{ id: 'wind', span: 'single' }]);
  });

  it('falls back to defaults for input that is not an array', () => {
    expect(reconcileLayout(null)).toEqual(DEFAULT_CARD_LAYOUT);
    expect(reconcileLayout(undefined)).toEqual(DEFAULT_CARD_LAYOUT);
    expect(reconcileLayout('nonsense')).toEqual(DEFAULT_CARD_LAYOUT);
    expect(reconcileLayout({ id: 'wind' })).toEqual(DEFAULT_CARD_LAYOUT);
  });

  it('falls back to defaults when nothing in the saved layout survives', () => {
    expect(reconcileLayout([{ id: 'retired-a' }, { id: 'retired-b' }])).toEqual(DEFAULT_CARD_LAYOUT);
  });

  it('ignores malformed entries without discarding the good ones', () => {
    const saved = [null, 42, { span: 'wide' }, { id: 'wind', span: 'wide' }];
    expect(reconcileLayout(saved)).toEqual([{ id: 'wind', span: 'wide' }]);
  });
});
