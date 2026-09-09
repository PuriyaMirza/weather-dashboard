import type { WeatherCardId } from '@/components/weather/card-registry';

/**
 * Module footprints, modelled on the way home-screen widgets size: a fixed set of shapes rather
 * than free-form resizing. Free resizing on a responsive grid produces layouts that only work at
 * one width; three shapes stay coherent from phone to desktop.
 *
 * On the four-column desktop grid: small is 1x1, medium 2x1, large 2x2. The grid drops to two
 * columns on small screens, where medium and large both span the full width.
 */
export type CardSize = 'small' | 'medium' | 'large';

export const CARD_SIZES: CardSize[] = ['small', 'medium', 'large'];

export const CARD_SIZE_LABEL: Record<CardSize, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
};

/** Tailwind spans per size. Kept here so the grid and any preview agree on one definition. */
export const CARD_SIZE_CLASS: Record<CardSize, string> = {
  small: 'col-span-1 row-span-1',
  medium: 'col-span-2 row-span-1',
  large: 'col-span-2 row-span-2',
};

export interface CardLayoutEntry {
  id: WeatherCardId;
  size: CardSize;
}

/**
 * The layout a new visitor sees, and what "Restore defaults" returns to. Deliberately a subset of
 * everything available: the dashboard should feel composed on arrival, with the rest discoverable
 * through the menu.
 */
export const DEFAULT_CARD_LAYOUT: CardLayoutEntry[] = [
  { id: 'temperature', size: 'medium' },
  { id: 'precipitation-chance', size: 'small' },
  { id: 'wind-speed', size: 'small' },
  { id: 'hourly-temperature', size: 'large' },
  { id: 'humidity', size: 'small' },
  { id: 'uv-index', size: 'small' },
  { id: 'daily-forecast', size: 'large' },
];

/**
 * Every module id the app knows about, used to validate persisted layouts.
 *
 * Order matters: this is the order the menu's toggle list presents them in, so it runs from the
 * headline readings through the single measurements to the composite panels.
 */
export const ALL_CARD_IDS: WeatherCardId[] = [
  'temperature',
  'feels-like',
  'precipitation-chance',
  'wind-speed',
  'humidity',
  'dew-point',
  'uv-index',
  'pressure',
  'visibility',
  'cloud-cover',
  'air-quality-index',
  'sunrise-sunset',
  'hourly-temperature',
  'precipitation',
  'daily-forecast',
  'current-conditions',
  'comfort',
  'wind',
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
      { id: 'temperature', size: 'medium' },
      { id: 'precipitation-chance', size: 'small' },
      { id: 'feels-like', size: 'small' },
      { id: 'precipitation', size: 'large' },
      { id: 'hourly-temperature', size: 'large' },
    ],
  },
  {
    id: 'cyclist',
    label: 'Cyclist',
    description: 'Wind, gusts, and how it will actually feel.',
    layout: [
      { id: 'temperature', size: 'medium' },
      { id: 'feels-like', size: 'small' },
      { id: 'wind-speed', size: 'small' },
      { id: 'wind', size: 'medium' },
      { id: 'air-quality-index', size: 'small' },
      { id: 'precipitation-chance', size: 'small' },
      { id: 'precipitation', size: 'large' },
    ],
  },
  {
    id: 'gardener',
    label: 'Gardener',
    description: 'Frost risk, sun exposure, and humidity.',
    layout: [
      { id: 'temperature', size: 'medium' },
      { id: 'humidity', size: 'small' },
      { id: 'dew-point', size: 'small' },
      { id: 'daily-forecast', size: 'large' },
      { id: 'uv-index', size: 'small' },
      { id: 'sunrise-sunset', size: 'small' },
      { id: 'precipitation', size: 'large' },
    ],
  },
  {
    id: 'everything',
    label: 'Everything',
    description: 'Every module the dashboard offers.',
    layout: ALL_CARD_IDS.map((id) => ({ id, size: defaultSizeFor(id) })),
  },
];

/** Panels carrying a chart or a table need the room; single readings do not. */
function defaultSizeFor(id: WeatherCardId): CardSize {
  if (id === 'hourly-temperature' || id === 'precipitation' || id === 'daily-forecast') return 'large';
  if (id === 'current-conditions' || id === 'comfort' || id === 'wind' || id === 'sun-uv') return 'medium';
  if (id === 'atmospheric-details' || id === 'air-quality') return 'medium';
  return 'small';
}

export { defaultSizeFor };

export function moveEntry<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const next = items.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

function isCardSize(value: unknown): value is CardSize {
  return value === 'small' || value === 'medium' || value === 'large';
}

/**
 * Persisted layouts outlive the code that wrote them. A saved layout may reference a module that
 * has since been removed, or omit one that has since been added, so it is reconciled against the
 * current registry on load rather than trusted outright — otherwise a renamed id would render a
 * hole in the grid, or crash the lookup.
 *
 * Layouts written before modular sizing stored `span: 'single' | 'wide'`. Those are translated
 * rather than discarded, so an existing dashboard survives the upgrade.
 */
export function reconcileLayout(saved: unknown): CardLayoutEntry[] {
  if (!Array.isArray(saved)) return DEFAULT_CARD_LAYOUT;

  const seen = new Set<WeatherCardId>();
  const reconciled: CardLayoutEntry[] = [];

  for (const entry of saved) {
    if (typeof entry !== 'object' || entry === null) continue;
    const { id, size, span } = entry as { id?: unknown; size?: unknown; span?: unknown };
    if (typeof id !== 'string') continue;
    if (!ALL_CARD_IDS.includes(id as WeatherCardId)) continue;
    if (seen.has(id as WeatherCardId)) continue;

    seen.add(id as WeatherCardId);
    reconciled.push({
      id: id as WeatherCardId,
      size: isCardSize(size) ? size : span === 'wide' ? 'medium' : span === 'single' ? 'small' : defaultSizeFor(id as WeatherCardId),
    });
  }

  // A layout that reconciles to nothing (all ids unknown) is not a layout — fall back rather than
  // presenting an empty dashboard the user never chose.
  return reconciled.length > 0 ? reconciled : DEFAULT_CARD_LAYOUT;
}
