'use client';

import { LAYOUT_PRESETS } from '@/lib/weather/card-layout';

interface LayoutPresetsProps {
  onApply: (presetId: string) => void;
}

/**
 * One-click starting points drawn from the product's personas. Customization is powerful but
 * presents as a blank slate; a preset gets someone to a useful dashboard immediately, and every
 * card control still works afterwards.
 */
export function LayoutPresets({ onApply }: LayoutPresetsProps) {
  return (
    <section aria-labelledby="presets-heading" className="rounded-2xl border border-line bg-card p-4">
      <h2 id="presets-heading" className="text-base font-semibold text-ink">
        Start from a preset
      </h2>
      <p className="mt-1 text-sm text-muted">Replaces your current layout. You can keep editing afterwards.</p>

      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {LAYOUT_PRESETS.map((preset) => (
          <li key={preset.id}>
            <button
              type="button"
              onClick={() => onApply(preset.id)}
              className="w-full rounded-xl border border-line p-3 text-left outline-none hover:border-accent hover:bg-accent-soft focus-visible:ring-2 focus-visible:ring-accent"
            >
              <span className="block text-sm font-semibold text-ink">{`Use the ${preset.label} layout`}</span>
              <span className="mt-0.5 block text-xs text-muted">
                {preset.description} {`${preset.layout.length} cards.`}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
