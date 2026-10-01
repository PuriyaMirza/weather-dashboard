'use client';

import { useId, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Icon, type IconName } from '@/components/ui/icon';
import { weatherCardRegistry, type WeatherCardId } from '@/components/weather/card-registry';
import { FavoriteMetricsPicker } from '@/components/weather/favorite-metrics-picker';
import type { FavoriteMetricId } from '@/lib/weather/favorite-metrics';
import { useDialogFocus } from '@/lib/hooks/use-dialog-focus';
import { LAYOUT_PRESETS } from '@/lib/weather/card-layout';
import { THEME_IDS, THEMES, type ThemeId } from '@/lib/theme';
import type { UnitSystem } from '@/lib/weather/units';

interface MenuProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  activeCardIds: WeatherCardId[];
  onToggleCard: (id: WeatherCardId) => void;
  unitSystem: UnitSystem;
  onUnitChange: (unitSystem: UnitSystem) => void;
  theme: ThemeId;
  onThemeChange: (theme: ThemeId) => void;
  isEditing: boolean;
  onEditingChange: (isEditing: boolean) => void;
  onApplyPreset: (presetId: string) => void;
  onRestoreDefaults: () => void;
  favoriteMetrics: FavoriteMetricId[];
  onToggleFavoriteMetric: (id: FavoriteMetricId) => void;
  /** Built at click time so the link always carries the setup as it stands. */
  getShareUrl: () => string;
  onRestartOnboarding: () => void;
  /** Lets the dashboard return focus here after arrange mode ends somewhere else on the page. */
  triggerRef?: RefObject<HTMLButtonElement | null>;
}

const FOCUS_RING = 'outline-none focus-visible:ring-2 focus-visible:ring-secondary-fixed';

const SECTION_HEADING = 'type-label-sm uppercase text-secondary';

/** Quiet pill action, for the panel's least-frequent moves (restore, redo setup) — a filled button
    would give them the same weight as the things people actually reach for here. */
const TEXT_ACTION =
  'inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 type-label-md text-on-surface-variant ' +
  `hover:bg-surface-container-high hover:text-primary ${FOCUS_RING}`;

const UNIT_OPTIONS: { value: UnitSystem; label: string; description: string }[] = [
  { value: 'imperial', label: '°F', description: 'Fahrenheit, miles per hour, inches' },
  { value: 'metric', label: '°C', description: 'Celsius, kilometres per hour, millimetres' },
];

/** Keyed by `LayoutPreset.id` (`lib/weather/card-layout.ts`) rather than added to that data model —
    these are a menu-only visual touch, so a future preset without an entry here falls back to a
    generic glyph instead of failing. */
const PRESET_ICONS: Record<string, IconName> = {
  commuter: 'umbrella',
  cyclist: 'bike',
  gardener: 'garden',
  everything: 'forest',
};

/**
 * The dashboard's single control surface: a hamburger that opens everything you can change.
 *
 * Previously these controls were spread across a header toolbar, a separate add-card drawer, and
 * an inline preset row, which made the dashboard look busy before you had read a single number.
 *
 * The drawer is portalled to <body>. The trigger lives in the sticky header, whose backdrop blur
 * makes it the containing block for any `position: fixed` descendant — rendered in place, the
 * full-height drawer and its scrim would be clipped to the header's own height.
 *
 * Keyboard behaviour is the whole job here, not a garnish: Escape closes, Tab is trapped inside
 * the open panel, and focus returns to the hamburger on close, so a keyboard user is never dumped
 * back at the top of the document.
 */
export function Menu({
  isOpen,
  onOpen,
  onClose,
  activeCardIds,
  onToggleCard,
  unitSystem,
  onUnitChange,
  theme,
  onThemeChange,
  isEditing,
  onEditingChange,
  onApplyPreset,
  onRestoreDefaults,
  favoriteMetrics,
  onToggleFavoriteMetric,
  getShareUrl,
  onRestartOnboarding,
  triggerRef: externalTriggerRef,
}: MenuProps) {
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const internalTriggerRef = useRef<HTMLButtonElement>(null);
  const triggerRef = externalTriggerRef ?? internalTriggerRef;

  const active = new Set(activeCardIds);
  const readings = weatherCardRegistry.filter((card) => card.kind === 'reading');
  const panels = weatherCardRegistry.filter((card) => card.kind === 'panel');
  const readingsOn = readings.filter((card) => active.has(card.id)).length;
  const panelsOn = panels.filter((card) => active.has(card.id)).length;

  // Left for the compiler to memoize: hand-written deps cannot express "reads triggerRef.current"
  // now that the ref may come from the dashboard rather than from here.
  function close() {
    onClose();
    triggerRef.current?.focus();
  }

  useDialogFocus(isOpen, panelRef, close);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={isOpen ? close : onOpen}
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        // A 44px hit area around a 32px disc: the disc is the design, the padding is what a thumb
        // actually needs.
        className={`group flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${FOCUS_RING}`}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-on-secondary shadow-card transition-colors group-hover:bg-primary-fixed">
          <Icon name="menu" size={20} />
        </span>
      </button>

      {isOpen &&
        createPortal(
          <>
            {/* Clicking away closes. Not a focus target — Escape and the close button cover
                keyboard users, and a tabbable overlay would just be a dead stop in the order. */}
            <div className="fixed inset-0 z-40 bg-surface/70 backdrop-blur-sm" onClick={close} aria-hidden="true" />

            <div
              ref={panelRef}
              id={panelId}
              role="dialog"
              aria-modal="true"
              aria-label="Dashboard settings"
              className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col overflow-y-auto rounded-l-2xl bg-surface-container-low text-on-surface shadow-raised"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-surface-container-low/90 py-3 pl-5 pr-3 backdrop-blur-xl">
                <h2 className="type-headline-sm text-primary">Dashboard</h2>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close menu"
                  className={`flex h-11 w-11 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high hover:text-primary ${FOCUS_RING}`}
                >
                  <Icon name="close" size={22} />
                </button>
              </div>

              <div className="flex flex-col gap-8 px-5 pb-8 pt-2">
                <section aria-labelledby={`${panelId}-layout`}>
                  <h3 id={`${panelId}-layout`} className={SECTION_HEADING}>
                    Layout
                  </h3>

                  {/* A switch, not a button that renames itself — this is a mode being turned on or
                      off, and the pill shape keeps it from reading as another item in the toggle
                      lists below, which use square checkboxes for module visibility instead. */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isEditing}
                    onClick={() => {
                      onEditingChange(!isEditing);
                      // Entering gets out of the way: the controls this turns on are behind
                      // the panel. `onClose` rather than the local `close` because the arrange
                      // toolbar takes focus on mount, and `close` would yank it back here.
                      if (!isEditing) onClose();
                    }}
                    className={`mt-3 flex min-h-12 w-full items-center justify-between gap-3 rounded-xl bg-surface-container-high px-4 py-3 text-left hover:bg-surface-container-highest ${FOCUS_RING}`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon name="tune" size={20} className="shrink-0 text-secondary-fixed" />
                      <span className="type-label-lg text-on-surface">Arrange mode</span>
                    </span>
                    {/* The thumb's side and its tick carry the state, not just the track's fill. */}
                    <span
                      aria-hidden="true"
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
                        isEditing
                          ? 'border-secondary-fixed bg-secondary-fixed'
                          : 'border-on-surface-variant bg-surface-container-highest'
                      }`}
                    >
                      <span
                        className={`flex h-[18px] w-[18px] items-center justify-center rounded-full transition-transform ${
                          isEditing
                            ? 'translate-x-[21px] bg-on-secondary text-secondary-fixed'
                            : 'translate-x-[2px] bg-on-surface-variant'
                        }`}
                      >
                        {isEditing && <Icon name="check" size={12} />}
                      </span>
                    </span>
                  </button>
                  <p className="mt-2 px-1 type-body-sm text-on-surface-variant">
                    Arranging shows each module&apos;s move, size, and remove controls. Sizes are small,
                    medium, and large.
                  </p>

                  {/* Closed by default: 21 rows between them was the exact problem this collapses.
                      Sits right under the switch that starts a layout change, since picking what's
                      on the dashboard is the next thing arranging needs. */}
                  <div className="mt-4 overflow-hidden rounded-xl bg-surface-container-high">
                    <ModuleGroup label="Readings" count={readingsOn}>
                      {readings.map((card) => (
                        <ModuleToggle
                          key={card.id}
                          id={card.id}
                          title={card.title}
                          description={card.description}
                          isActive={active.has(card.id)}
                          onToggle={onToggleCard}
                        />
                      ))}
                    </ModuleGroup>
                    <div aria-hidden="true" className="mx-4 h-px bg-outline-variant" />
                    <ModuleGroup label="Panels" count={panelsOn}>
                      {panels.map((card) => (
                        <ModuleToggle
                          key={card.id}
                          id={card.id}
                          title={card.title}
                          description={card.description}
                          isActive={active.has(card.id)}
                          onToggle={onToggleCard}
                        />
                      ))}
                    </ModuleGroup>
                  </div>

                  <h4 className={`${SECTION_HEADING} mt-6`}>Presets</h4>
                  {/* Bleeds to the panel's own edges so the scroll affordance reaches the border,
                      then repeats the panel's padding inside so the first/last card still align
                      with everything else. */}
                  <div className="scrollbar-none -mx-5 mt-3 flex gap-2.5 overflow-x-auto px-5 pb-1">
                    {LAYOUT_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onApplyPreset(preset.id)}
                        aria-label={`Apply the ${preset.label} preset. ${preset.description}`}
                        className={`flex w-[140px] shrink-0 flex-col items-start gap-2.5 rounded-xl bg-surface-container-high p-3 text-left hover:bg-surface-container-highest ${FOCUS_RING}`}
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-container text-secondary-fixed">
                          <Icon name={PRESET_ICONS[preset.id] ?? 'leaf'} size={18} />
                        </span>
                        <span>
                          <span className="block type-label-lg text-primary">{preset.label}</span>
                          <span className="mt-1 block text-xs leading-snug text-on-surface-variant">
                            {preset.description}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                  <button type="button" onClick={onRestoreDefaults} className={`${TEXT_ACTION} -ml-3 mt-2`}>
                    <Icon name="restart" size={16} />
                    Restore defaults
                  </button>
                </section>

                <section aria-labelledby={`${panelId}-favorites`}>
                  <h3 id={`${panelId}-favorites`} className={SECTION_HEADING}>
                    Favorite readings
                  </h3>
                  <p className="mt-1 type-body-sm text-on-surface-variant">Pinned to the top card. Choose up to four.</p>
                  <div className="mt-3">
                    <FavoriteMetricsPicker
                      selected={favoriteMetrics}
                      onToggle={onToggleFavoriteMetric}
                    />
                  </div>
                </section>

                <section aria-labelledby={`${panelId}-setup`}>
                  <h3 id={`${panelId}-setup`} className={SECTION_HEADING}>
                    Setup
                  </h3>
                  <ShareSetup getShareUrl={getShareUrl} />
                  {/* Closes the panel first: on a phone it is full width and would sit over the setup dialog. */}
                  <button
                    type="button"
                    onClick={() => {
                      close();
                      onRestartOnboarding();
                    }}
                    className={`${TEXT_ACTION} -ml-3 mt-2`}
                  >
                    <Icon name="refresh" size={16} />
                    Redo setup
                  </button>
                </section>

                <section aria-labelledby={`${panelId}-display`}>
                  <h3 id={`${panelId}-display`} className={SECTION_HEADING}>
                    Display
                  </h3>

                  <fieldset className="mt-3 border-0 p-0">
                    <legend className="type-label-md text-on-surface">Units</legend>
                    <div className="mt-2 inline-flex gap-1 rounded-full bg-surface-container-high p-1">
                      {UNIT_OPTIONS.map((option) => (
                        <SegmentedOption
                          key={option.value}
                          name="menu-units"
                          checked={unitSystem === option.value}
                          onChange={() => onUnitChange(option.value)}
                          label={option.label}
                          description={option.description}
                        />
                      ))}
                    </div>
                  </fieldset>

                  <fieldset className="mt-5 border-0 p-0">
                    <legend className="type-label-md text-on-surface">Theme</legend>
                    <div className="mt-2 flex flex-col gap-2">
                      {THEME_IDS.map((id) => (
                        <ThemeOption key={id} id={id} checked={theme === id} onChange={() => onThemeChange(id)} />
                      ))}
                    </div>
                  </fieldset>
                </section>
              </div>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}

/**
 * One collapsible list of module toggles. The native element keeps expand/collapse operable by
 * keyboard and announced by a screen reader for free.
 */
function ModuleGroup({ label, count, children }: { label: string; count: number; children: ReactNode }) {
  return (
    <details className="group">
      {/* role="button" + aria-label gives every browser/AT a consistent accessible name — native
          <summary> role support is inconsistent, and without the override the name would
          otherwise include the count. */}
      <summary
        role="button"
        aria-label={label}
        className={`flex min-h-12 w-full cursor-pointer list-none items-center gap-2 px-4 py-3 hover:bg-surface-container-highest [&::-webkit-details-marker]:hidden [&::marker]:hidden ${FOCUS_RING} focus-visible:ring-inset`}
      >
        <span className="type-label-lg text-on-surface">{label}</span>
        <span className="ml-auto rounded-full bg-surface-container-highest px-2.5 py-0.5 type-label-sm text-secondary-fixed">
          {count} on
        </span>
        <Icon
          name="expand-more"
          size={20}
          className="shrink-0 text-on-surface-variant transition-transform duration-150 group-open:rotate-180"
        />
      </summary>
      <div className="grid grid-cols-2 gap-x-3 px-4 pb-3">{children}</div>
    </details>
  );
}

/**
 * Copies a link that carries the entire setup.
 *
 * This is what stands in for an account. Preferences live in this browser; a link is how they reach
 * another one. Nothing is uploaded and nothing is stored on a server — the setup travels inside the
 * URL itself, which is the only reason this app can offer portable preferences while keeping its
 * no-accounts, no-database constraint.
 *
 * The warning is not boilerplate. The link contains the coordinates of every saved place, which for
 * most people is where they live and work. That belongs in plain words next to the button that
 * copies it, not in a policy page.
 */
function ShareSetup({ getShareUrl }: { getShareUrl: () => string }) {
  const [copied, setCopied] = useState(false);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);

  async function copy() {
    const url = getShareUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setFallbackUrl(null);
    } catch {
      // Clipboard access is refused over plain HTTP and under some browser configurations. Showing
      // the link to copy by hand is worse than copying it, but it is not a dead end.
      setCopied(false);
      setFallbackUrl(url);
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-3 rounded-xl bg-surface-container-high p-4">
      {/* The description sits outside the button rather than inside it, so the button's own
          accessible name stays "Copy setup link" instead of the whole paragraph. */}
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary-container text-secondary-fixed">
          <Icon name="link" size={18} />
        </span>
        <p className="min-w-0 type-body-sm text-on-surface-variant">
          Opens this dashboard on another device — no account needed. The link contains your saved
          places, so treat it like your address before sending it to anyone.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={copy}
          className={`inline-flex min-h-11 items-center gap-2 rounded-full bg-secondary-container px-4 type-label-lg text-secondary-fixed hover:bg-surface-bright ${FOCUS_RING}`}
        >
          <Icon name="copy" size={18} />
          Copy setup link
        </button>

        {copied && (
          <p role="status" className="inline-flex items-center gap-1 type-label-md text-secondary-fixed">
            <Icon name="check" size={16} />
            Link copied
          </p>
        )}
      </div>

      {fallbackUrl && (
        <label className="flex flex-col gap-1">
          <span className="type-label-md text-on-surface">Copy this link</span>
          <input
            type="text"
            readOnly
            value={fallbackUrl}
            onFocus={(event) => event.currentTarget.select()}
            className={`w-full rounded-lg border border-outline-variant bg-surface-container-highest px-3 py-2 type-body-sm text-on-surface ${FOCUS_RING}`}
          />
        </label>
      )}
    </div>
  );
}

/**
 * One row of the toggle grid. A real checkbox rather than a styled button, so its state is
 * announced as checked/unchecked and it works with assistive tech that navigates by form control.
 * The description is available to assistive tech via `aria-describedby` but not printed on screen —
 * a two-column grid of full sentences was the wall of text this replaced.
 */
function ModuleToggle({
  id,
  title,
  description,
  isActive,
  onToggle,
}: {
  id: WeatherCardId;
  title: string;
  description: string;
  isActive: boolean;
  onToggle: (id: WeatherCardId) => void;
}) {
  return (
    <label className="flex min-h-11 min-w-0 cursor-pointer items-center gap-2.5">
      <input
        type="checkbox"
        checked={isActive}
        onChange={() => onToggle(id)}
        className="peer sr-only"
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-description`}
      />
      {/* The tick, not just the fill, carries the state for anyone who cannot distinguish the two
          tones. The unchecked border uses on-surface-variant because outline-variant falls short
          of the 3:1 a control's boundary needs on this surface. */}
      <span
        aria-hidden="true"
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 border-on-surface-variant text-on-secondary peer-checked:border-secondary-fixed peer-checked:bg-secondary-fixed peer-focus-visible:ring-2 peer-focus-visible:ring-secondary-fixed peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface-container-high"
      >
        {isActive && <Icon name="check" size={14} />}
      </span>
      <span id={`${id}-label`} className="min-w-0 truncate type-body-sm text-on-surface">
        {title}
      </span>
      <span id={`${id}-description`} className="sr-only">
        {description}
      </span>
    </label>
  );
}

/**
 * A radio rendered as one segment of a pill. The visible label is the compact symbol ("°F"); the
 * accessible name is the spelled-out description, which is what a listener actually needs.
 */
function SegmentedOption({
  name,
  checked,
  onChange,
  label,
  description,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  label: string;
  description: string;
}) {
  return (
    <label
      className={`flex min-h-10 min-w-16 cursor-pointer items-center justify-center gap-1 rounded-full px-4 type-label-lg has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-secondary-fixed ${
        checked ? 'bg-secondary-container text-secondary-fixed' : 'text-on-surface-variant hover:text-primary'
      }`}
    >
      <input type="radio" name={name} checked={checked} onChange={onChange} className="sr-only" aria-label={description} />
      {checked && <Icon name="check" size={16} />}
      {label}
    </label>
  );
}

/**
 * A theme choice. Named by the theme's label and described by its one-line mood, both printed —
 * with more themes to come, the description is what tells two greens apart.
 */
function ThemeOption({ id, checked, onChange }: { id: ThemeId; checked: boolean; onChange: () => void }) {
  const definition = THEMES[id];
  const labelId = `menu-theme-${id}-label`;
  const descriptionId = `menu-theme-${id}-description`;

  return (
    <label
      className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border-2 px-3 py-2.5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-secondary-fixed ${
        checked
          ? 'border-secondary-fixed bg-secondary-container'
          : 'border-transparent bg-surface-container-high hover:bg-surface-container-highest'
      }`}
    >
      <input
        type="radio"
        name="menu-theme"
        checked={checked}
        onChange={onChange}
        className="sr-only"
        aria-labelledby={labelId}
        aria-describedby={descriptionId}
      />
      <span className="min-w-0 flex-1">
        <span id={labelId} className="block type-label-lg text-primary">
          {definition.label}
        </span>
        <span id={descriptionId} className="block type-body-sm text-on-surface-variant">
          {definition.description}
        </span>
      </span>
      {/* A tick as well as the border and fill, so the selection is never colour alone. */}
      <span
        aria-hidden="true"
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
          checked ? 'bg-secondary-fixed text-on-secondary' : 'border-2 border-on-surface-variant'
        }`}
      >
        {checked && <Icon name="check" size={16} />}
      </span>
    </label>
  );
}
