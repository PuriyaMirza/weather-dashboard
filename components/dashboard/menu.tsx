'use client';

import { useCallback, useEffect, useId, useRef } from 'react';
import { weatherCardRegistry, type WeatherCardId } from '@/components/weather/card-registry';
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
}

const SECTION_LABEL = 'eyebrow text-muted';
const ACTION =
  'w-full border border-line-strong px-3 py-2 text-left text-xs uppercase tracking-[0.14em] text-ink outline-none hover:bg-accent hover:text-accent-ink focus-visible:ring-2 focus-visible:ring-accent';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

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
}: MenuProps) {
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const active = new Set(activeCardIds);
  const readings = weatherCardRegistry.filter((card) => card.kind === 'reading');
  const panels = weatherCardRegistry.filter((card) => card.kind === 'panel');

  const close = useCallback(() => {
    onClose();
    triggerRef.current?.focus();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab') return;

      // Trap Tab inside the panel. Without this, tabbing past the last control silently moves
      // focus to the page behind an overlay the user cannot see past.
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, close]);

  // Move focus into the panel when it opens, so the first Tab lands somewhere sensible.
  useEffect(() => {
    if (!isOpen) return;
    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
  }, [isOpen]);

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
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col overflow-y-auto border-l border-line-strong bg-card"
          >
            <div className="flex items-baseline justify-between border-b border-line-strong px-5 py-4">
              <h2 className="font-display text-2xl leading-none text-ink-strong">Dashboard</h2>
              <button
                type="button"
                onClick={close}
                aria-label="Close menu"
                className="eyebrow text-muted outline-none hover:text-ink-strong focus-visible:ring-2 focus-visible:ring-accent"
              >
                Close
              </button>
            </div>

            <div className="flex flex-col gap-7 px-5 py-6">
              <section aria-labelledby={`${panelId}-modules`}>
                <h3 id={`${panelId}-modules`} className={SECTION_LABEL}>
                  Readings
                </h3>
                <p className="mt-1 text-xs text-muted">Switch on what you want to see.</p>
                <ul className="mt-3">
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
                </ul>
              </section>

              <section aria-labelledby={`${panelId}-panels`}>
                <h3 id={`${panelId}-panels`} className={SECTION_LABEL}>
                  Panels
                </h3>
                <p className="mt-1 text-xs text-muted">Charts, tables, and grouped detail.</p>
                <ul className="mt-3">
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
                </ul>
              </section>

              <section aria-labelledby={`${panelId}-layout`}>
                <h3 id={`${panelId}-layout`} className={SECTION_LABEL}>
                  Layout
                </h3>
                <div className="mt-3 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => onEditingChange(!isEditing)}
                    aria-pressed={isEditing}
                    className={
                      isEditing
                        ? 'w-full border border-line-strong bg-accent px-3 py-2 text-left text-xs uppercase tracking-[0.14em] text-accent-ink outline-none focus-visible:ring-2 focus-visible:ring-accent'
                        : ACTION
                    }
                  >
                    {isEditing ? 'Done arranging' : 'Arrange modules'}
                  </button>
                  <p className="text-xs text-muted">
                    Arranging shows each module&apos;s move, size, and remove controls. Sizes are small,
                    medium, and large.
                  </p>
                </div>

                <h4 className={`${SECTION_LABEL} mt-5`}>Presets</h4>
                <div className="mt-2 flex flex-col gap-2">
                  {LAYOUT_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onApplyPreset(preset.id)}
                      className={ACTION}
                      aria-label={`Apply the ${preset.label} preset. ${preset.description}`}
                    >
                      {preset.label}
                      <span className="ml-2 normal-case tracking-normal text-muted">{preset.description}</span>
                    </button>
                  ))}
                  <button type="button" onClick={onRestoreDefaults} className={ACTION}>
                    Restore defaults
                  </button>
                </div>
              </section>

              <section aria-labelledby={`${panelId}-display`}>
                <h3 id={`${panelId}-display`} className={SECTION_LABEL}>
                  Display
                </h3>

                <fieldset className="mt-3 border-0 p-0">
                  <legend className="eyebrow text-muted">Units</legend>
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
                  <legend className="eyebrow text-muted">Appearance</legend>
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
 * One row of the toggle list. A real checkbox rather than a styled button, so its state is
 * announced as checked/unchecked and it works with assistive tech that navigates by form control.
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
    <li className="border-t border-line last:border-b">
      <label className="flex cursor-pointer items-center justify-between gap-3 py-2.5">
        <span className="min-w-0">
          <span id={`${id}-label`} className="block text-sm text-ink">
            {title}
          </span>
          <span id={`${id}-description`} className="block text-xs text-muted">
            {description}
          </span>
        </span>
        {/*
          Named by the title alone and described by the sentence beneath it. Letting the wrapping
          label supply the name would fold the description in too, so "Comfort — humidity, dew
          point, UV…" would answer to a search for the Humidity module.
        */}
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
          className="flex h-5 w-5 shrink-0 items-center justify-center border border-line-strong text-[0.6rem] leading-none text-accent-ink peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent"
        >
          {isActive ? '✓' : ''}
        </span>
      </label>
    </li>
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
      className={`flex cursor-pointer items-center justify-center border px-4 py-2 text-xs uppercase tracking-[0.14em] ${
        checked ? 'border-line-strong bg-accent text-accent-ink' : 'border-line text-muted hover:text-ink'
      } -ml-px first:ml-0`}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="sr-only"
        aria-label={description}
      />
      {label}
    </label>
  );
}
