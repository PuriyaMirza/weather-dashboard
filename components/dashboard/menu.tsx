'use client';

import { useCallback, useId, useRef, useState, type ReactNode, type RefObject } from 'react';
import { weatherCardRegistry, type WeatherCardId } from '@/components/weather/card-registry';
import { useDialogFocus } from '@/lib/hooks/use-dialog-focus';
import { LAYOUT_PRESETS } from '@/lib/weather/card-layout';
import type { ThemePreference } from '@/lib/theme';
import type { UnitSystem } from '@/lib/weather/units';

interface MenuProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  activeCardIds: WeatherCardId[];
  onToggleCard: (id: WeatherCardId) => void;
  unitSystem: UnitSystem;
  onUnitChange: (unitSystem: UnitSystem) => void;
  theme: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
  isEditing: boolean;
  onEditingChange: (isEditing: boolean) => void;
  onApplyPreset: (presetId: string) => void;
  onRestoreDefaults: () => void;
  /** Built at click time so the link always carries the setup as it stands. */
  getShareUrl: () => string;
  onRestartOnboarding: () => void;
  /** Lets the dashboard return focus here after arrange mode ends somewhere else on the page. */
  triggerRef?: RefObject<HTMLButtonElement | null>;
}

/** Underlined text action, for the panel's least-frequent moves (restore, redo setup) — a full
    ticket or stamp treatment would give them the same weight as the things people actually reach
    for here. */
const TEXT_ACTION =
  'text-[11px] text-ink-muted underline decoration-ink-muted/50 underline-offset-[3px] outline-none hover:text-ledger-ink focus-visible:ring-2 focus-visible:ring-accent';

const THEME_OPTIONS: { value: ThemePreference; label: string; description: string }[] = [
  { value: 'light', label: 'Light', description: 'Always use the light theme' },
  { value: 'system', label: 'Auto', description: 'Match my system appearance setting' },
  { value: 'dark', label: 'Dark', description: 'Always use the dark theme' },
];

const UNIT_OPTIONS: { value: UnitSystem; label: string; description: string }[] = [
  { value: 'imperial', label: '°F', description: 'Fahrenheit, miles per hour, inches' },
  { value: 'metric', label: '°C', description: 'Celsius, kilometres per hour, millimetres' },
];

/**
 * The dashboard's single control surface: a hamburger that opens everything you can change.
 *
 * Previously these controls were spread across a header toolbar, a separate add-card drawer, and
 * an inline preset row, which made the dashboard look busy before you had read a single number.
 * Styled as a Postal Ledger panel — the same fixed cream-and-ink surface as the restyled cards —
 * rather than the app's theme-aware chrome, so it reads as one more piece of paper on the desk
 * regardless of light/dark mode.
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
        className="flex h-10 w-10 shrink-0 flex-col items-center justify-center gap-[5px] border border-line-strong bg-card outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-accent"
      >
        {/* Three rules, drawn rather than typed, so they inherit the ink colour on hover. */}
        <span aria-hidden="true" className="block h-px w-4 bg-ink-strong" />
        <span aria-hidden="true" className="block h-px w-4 bg-ink-strong" />
        <span aria-hidden="true" className="block h-px w-4 bg-ink-strong" />
      </button>

      {isOpen && (
        <>
          {/* Clicking away closes. Not a focus target — Escape and the close button cover
              keyboard users, and a tabbable overlay would just be a dead stop in the order. */}
          <div className="fixed inset-0 z-40 bg-canvas/70" onClick={close} aria-hidden="true" />

          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-label="Dashboard settings"
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col overflow-y-auto border-l border-hairline bg-cream"
          >
            <div className="flex items-baseline justify-between border-b border-hairline px-5 py-4">
              <h2 className="font-display text-2xl leading-none text-ledger-ink">Dashboard</h2>
              <button
                type="button"
                onClick={close}
                aria-label="Close menu"
                className="ledger-label outline-none hover:text-ledger-ink focus-visible:ring-2 focus-visible:ring-accent"
              >
                Close
              </button>
            </div>

            <div className="flex flex-col gap-7 px-5 py-6">
              <section aria-labelledby={`${panelId}-layout`}>
                <h3 id={`${panelId}-layout`} className="ledger-label">
                  Layout
                </h3>

                <div className="mt-3 flex flex-col">
                  {/* A switch, not a button that renames itself — this is a mode being turned on or
                      off, and the pill shape keeps it from reading as another item in the toggle
                      grids below, which use square checkboxes for module visibility instead. */}
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
                    className="flex w-full items-center justify-between gap-3 border-b border-hairline py-3 outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <span className="text-sm text-ledger-ink">Arrange mode</span>
                    <span
                      aria-hidden="true"
                      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-ledger-ink transition-colors ${
                        isEditing ? 'bg-ledger-ink' : 'bg-cream'
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full transition-transform ${
                          isEditing ? 'translate-x-4 bg-cream' : 'translate-x-0.5 bg-ledger-ink'
                        }`}
                      />
                    </span>
                  </button>
                  <p className="mt-2 text-xs text-ink-muted">
                    Arranging shows each module&apos;s move, size, and remove controls. Sizes are small,
                    medium, and large.
                  </p>
                </div>

                {/* Closed by default: 21 rows between them was the exact problem this collapses. The
                    native element keeps the expand/collapse operable by keyboard and announced by a
                    screen reader for free. Sits right under the switch that starts a layout change,
                    since picking what's on the dashboard is the next thing arranging needs. */}
                <div className="mt-1 flex flex-col">
                  <details className="group border-b border-hairline">
                    {/* role="button" + aria-label gives every browser/AT a consistent accessible
                        name — native <summary> role support is inconsistent, and without the
                        override the name would otherwise include the count and the chevron. */}
                    <summary
                      role="button"
                      aria-label="Readings"
                      className="flex w-full cursor-pointer list-none items-center gap-2 py-3 text-sm text-ledger-ink outline-none [&::-webkit-details-marker]:hidden [&::marker]:hidden focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <span>Readings</span>
                      <span className="ml-auto text-[11.5px] text-ink-muted">
                        {readingsOn} on
                      </span>
                      <ChevronIcon className="h-3.5 w-3.5 shrink-0 text-ink-muted transition-transform duration-150 group-open:rotate-180" />
                    </summary>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pb-4">
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
                    </div>
                  </details>

                  <details className="group border-b border-hairline">
                    <summary
                      role="button"
                      aria-label="Panels"
                      className="flex w-full cursor-pointer list-none items-center gap-2 py-3 text-sm text-ledger-ink outline-none [&::-webkit-details-marker]:hidden [&::marker]:hidden focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <span>Panels</span>
                      <span className="ml-auto text-[11.5px] text-ink-muted">{panelsOn} on</span>
                      <ChevronIcon className="h-3.5 w-3.5 shrink-0 text-ink-muted transition-transform duration-150 group-open:rotate-180" />
                    </summary>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pb-4">
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
                    </div>
                  </details>
                </div>

                <h4 className="ledger-label mt-6">Presets</h4>
                {/* Bleeds to the panel's own edges so the scroll affordance reaches the border,
                    then repeats the panel's padding inside so the first/last ticket still align
                    with everything else. */}
                <div className="-mx-5 mt-3 flex gap-2.5 overflow-x-auto px-5 pb-1">
                  {LAYOUT_PRESETS.map((preset) => {
                    const PresetIcon = PRESET_ICONS[preset.id];
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onApplyPreset(preset.id)}
                        aria-label={`Apply the ${preset.label} preset. ${preset.description}`}
                        className="flex w-[132px] shrink-0 flex-col items-start gap-2 border border-ledger-ink bg-cream-2 px-3 py-3 text-left outline-none hover:bg-cream focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        {PresetIcon && <PresetIcon className="h-[18px] w-[18px] text-ledger-ink" />}
                        <span>
                          <span className="block text-[12.5px] font-semibold text-ledger-ink">{preset.label}</span>
                          {/* text-ink-soft, not the lighter text-ink-muted: ink-muted was tuned for
                              4.5:1 against --cream specifically, and falls short on this ticket's
                              slightly darker --cream-2 background. */}
                          <span className="mt-1 block text-[10.5px] leading-snug text-ink-soft">
                            {preset.description}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <button type="button" onClick={onRestoreDefaults} className={`${TEXT_ACTION} mx-auto mt-3 block`}>
                  Restore defaults
                </button>
              </section>

              <section aria-labelledby={`${panelId}-setup`}>
                <h3 id={`${panelId}-setup`} className="ledger-label">
                  Setup
                </h3>
                <ShareSetup getShareUrl={getShareUrl} />
                <button type="button" onClick={onRestartOnboarding} className={`${TEXT_ACTION} mt-2`}>
                  Redo setup
                </button>
              </section>

              <section aria-labelledby={`${panelId}-display`}>
                <h3 id={`${panelId}-display`} className="ledger-label">
                  Display
                </h3>

                <fieldset className="mt-3 border-0 p-0">
                  <legend className="ledger-label">Units</legend>
                  <div className="mt-2 flex">
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

                <fieldset className="mt-4 border-0 p-0">
                  <legend className="ledger-label">Appearance</legend>
                  <div className="mt-2 flex">
                    {THEME_OPTIONS.map((option) => (
                      <SegmentedOption
                        key={option.value}
                        name="menu-theme"
                        checked={theme === option.value}
                        onChange={() => onThemeChange(option.value)}
                        label={option.label}
                        description={option.description}
                      />
                    ))}
                  </div>
                </fieldset>
              </section>
            </div>
          </div>
        </>
      )}
    </>
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
    <div className="mt-3 flex flex-col gap-2">
      {/* The description sits outside the button rather than inside it, so the button's own
          accessible name stays "Copy setup link" instead of the whole paragraph. */}
      <div className="flex items-start gap-2.5 border border-dashed border-ink-muted px-3.5 py-3">
        <StampIcon className="mt-0.5 h-5 w-5 shrink-0 text-ledger-ink" />
        <div className="min-w-0">
          <button
            type="button"
            onClick={copy}
            className="text-[12.5px] font-semibold text-ledger-ink underline decoration-ledger-ink/40 underline-offset-2 outline-none hover:decoration-ledger-ink focus-visible:ring-2 focus-visible:ring-accent"
          >
            Copy setup link
          </button>
          <p className="mt-1 text-[10.5px] leading-snug text-ink-muted">
            Opens this dashboard on another device — no account needed. The link contains your saved
            places, so treat it like your address before sending it to anyone.
          </p>
        </div>
      </div>

      {copied && (
        <p role="status" className="ledger-label text-ledger-ink">
          Link copied
        </p>
      )}

      {fallbackUrl && (
        <label className="flex flex-col gap-1">
          <span className="ledger-label">Copy this link</span>
          <input
            type="text"
            readOnly
            value={fallbackUrl}
            onFocus={(event) => event.currentTarget.select()}
            className="w-full border border-hairline bg-cream-2 px-2 py-1 text-xs text-ledger-ink outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
    <label className="flex cursor-pointer items-center gap-2 py-1">
      <input
        type="checkbox"
        checked={isActive}
        onChange={() => onToggle(id)}
        className="peer sr-only"
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-description`}
      />
      {/* A square that fills when checked. The check mark, not just the fill, carries the state
          for anyone who cannot distinguish the two tones. */}
      <span
        aria-hidden="true"
        className="flex h-3.5 w-3.5 shrink-0 items-center justify-center border border-ink-muted peer-checked:border-ledger-ink peer-checked:bg-ledger-ink peer-focus-visible:ring-2 peer-focus-visible:ring-accent"
      >
        {isActive && <CheckIcon className="h-2 w-2 text-cream" />}
      </span>
      <span id={`${id}-label`} className="min-w-0 truncate text-[12.5px] text-ink-soft">
        {title}
      </span>
      <span id={`${id}-description`} className="sr-only">
        {description}
      </span>
    </label>
  );
}

/** A radio rendered as a segment, matching the pattern already used for units elsewhere. */
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
      className={`-ml-px flex cursor-pointer items-center justify-center border px-4 py-2 text-xs uppercase tracking-[0.14em] first:ml-0 ${
        checked ? 'border-ledger-ink bg-ledger-ink text-cream' : 'border-ink-muted/50 text-ink-muted hover:text-ledger-ink'
      }`}
    >
      <input type="radio" name={name} checked={checked} onChange={onChange} className="sr-only" aria-label={description} />
      {label}
    </label>
  );
}

type IconProps = { className?: string };

function ChevronIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M5 7.5L10 12.5L15 7.5" />
    </svg>
  );
}

function CheckIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M4 10.2l3.6 3.6L16 5.4" />
    </svg>
  );
}

function StampIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3" y="3" width="14" height="14" rx="1" />
      <path d="M3 7.5h14M7.5 3v4.5" />
    </svg>
  );
}

/** Keyed by `LayoutPreset.id` (`lib/weather/card-layout.ts`) rather than added to that data model —
    these are a menu-only visual touch, so a future preset without an entry here just renders
    without an icon instead of failing. */
const PRESET_ICONS: Record<string, (props: IconProps) => ReactNode> = {
  commuter: ({ className }) => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M2.5 9.5a7.5 7.5 0 0 1 15 0z" />
      <path d="M10 9.5V15" />
      <path d="M10 15a1.4 1.4 0 0 0 2.4 1" />
    </svg>
  ),
  cyclist: ({ className }) => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="5.3" cy="14" r="3" />
      <circle cx="14.7" cy="14" r="3" />
      <path d="M5.3 14l4-7h3.2l2.2 7M9.3 7h3M9.3 7l-2 4h5.4" />
    </svg>
  ),
  gardener: ({ className }) => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M4 16C4 8 9 3.5 16.5 3.5 16.5 11.5 12 16.5 4 16.5z" />
      <path d="M4.5 16 13 7.5" />
    </svg>
  ),
  everything: ({ className }) => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden="true">
      <rect x="3" y="3" width="6" height="6" rx="1" />
      <rect x="11" y="3" width="6" height="6" rx="1" />
      <rect x="3" y="11" width="6" height="6" rx="1" />
      <rect x="11" y="11" width="6" height="6" rx="1" />
    </svg>
  ),
};
