import type { WeatherCardId } from '@/components/weather/card-registry';

export type CardSpan = 'single' | 'wide';

export interface CardLayoutEntry {
  id: WeatherCardId;
  span: CardSpan;
}

/**
 * The layout a new visitor sees, and what "Restore defaults" returns to. Deliberately a subset of
 * the eight available cards: the dashboard should feel curated on arrival, with the rest
 * discoverable through the add-card drawer.
 */
export const DEFAULT_CARD_LAYOUT: CardLayoutEntry[] = [
  { id: 'current-conditions', span: 'single' },
  { id: 'comfort', span: 'single' },
  { id: 'hourly-temperature', span: 'wide' },
  { id: 'daily-forecast', span: 'wide' },
];

/** Every card id the app knows about, used to validate persisted layouts. */
export const ALL_CARD_IDS: WeatherCardId[] = [
  'current-conditions',
  'comfort',
  'hourly-temperature',
  'precipitation',
  'wind',
  'daily-forecast',
  'sun-uv',
  'atmospheric-details',
  'air-quality',
];

/**
 * Starting points built from the personas in the PRD. Customization is powerful but presents as a
 * blank slate; a preset gets someone to a useful dashboard in one click, and they can still edit
 * from there. Each is validated by reconcileLayout like any other layout.
 */
export interface LayoutPreset {
  id: string;
  label: string;
  description: string;
  layout: CardLayoutEntry[];
}

export const LAYOUT_PRESETS: LayoutPreset[] = [
  {
    id: 'commuter',
    label: 'Commuter',
    description: 'Will I get rained on in the next few hours?',
    layout: [
      { id: 'current-conditions', span: 'single' },
      { id: 'precipitation', span: 'wide' },
      { id: 'hourly-temperature', span: 'wide' },
    ],
  },
  {
    id: 'cyclist',
    label: 'Cyclist',
    description: 'Wind, gusts, and how it will actually feel.',
    layout: [
      { id: 'current-conditions', span: 'single' },
      { id: 'wind', span: 'single' },
      { id: 'precipitation', span: 'wide' },
      { id: 'air-quality', span: 'single' },
      { id: 'comfort', span: 'single' },
    ],
  },
  {
    id: 'gardener',
    label: 'Gardener',
    description: 'Frost risk, sun exposure, and humidity.',
    layout: [
      { id: 'daily-forecast', span: 'wide' },
      { id: 'sun-uv', span: 'single' },
      { id: 'comfort', span: 'single' },
      { id: 'precipitation', span: 'wide' },
    ],
  },
  {
    id: 'everything',
    label: 'Everything',
    description: 'Every card the dashboard offers.',
    layout: ALL_CARD_IDS.map((id) => ({
      id,
      span: id === 'hourly-temperature' || id === 'daily-forecast' || id === 'precipitation' ? 'wide' : 'single',
    })),
  },
];

export function moveEntry<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const next = items.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/**
 * Persisted layouts outlive the code that wrote them. A saved layout may reference a card that has
 * since been removed, or omit one that has since been added, so it is reconciled against the
 * current registry on load rather than trusted outright — otherwise a renamed card id would render
 * a hole in the grid, or crash the lookup.
 */
export function reconcileLayout(saved: unknown): CardLayoutEntry[] {
  if (!Array.isArray(saved)) return DEFAULT_CARD_LAYOUT;

  const seen = new Set<WeatherCardId>();
  const reconciled: CardLayoutEntry[] = [];

  for (const entry of saved) {
    if (typeof entry !== 'object' || entry === null) continue;
    const { id, span } = entry as { id?: unknown; span?: unknown };
    if (typeof id !== 'string') continue;
    if (!ALL_CARD_IDS.includes(id as WeatherCardId)) continue;
    if (seen.has(id as WeatherCardId)) continue;

    seen.add(id as WeatherCardId);
    reconciled.push({ id: id as WeatherCardId, span: span === 'wide' ? 'wide' : 'single' });
  }

  // A layout that reconciles to nothing (all ids unknown) is not a layout — fall back rather than
  // presenting an empty dashboard the user never chose.
  return reconciled.length > 0 ? reconciled : DEFAULT_CARD_LAYOUT;
}
