'use client';

import type { ThemePreference } from '@/lib/theme';

const OPTIONS: { value: ThemePreference; label: string; description: string }[] = [
  { value: 'light', label: 'Light', description: 'Always use the light theme' },
  { value: 'system', label: 'Auto', description: 'Match my system appearance setting' },
  { value: 'dark', label: 'Dark', description: 'Always use the dark theme' },
];

interface ThemeToggleProps {
  theme: ThemePreference;
  onChange: (theme: ThemePreference) => void;
}

/**
 * Radio group rather than a two-state switch: there are three mutually exclusive choices, and
 * "Auto" is meaningfully different from whichever of light/dark it currently resolves to.
 */
export function ThemeToggle({ theme, onChange }: ThemeToggleProps) {
  return (
    <fieldset className="flex items-center gap-1 rounded-full border border-line bg-card p-1">
      <legend className="sr-only">Appearance</legend>
      {OPTIONS.map((option) => {
        const isSelected = option.value === theme;
        return (
          <label
            key={option.value}
            className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              isSelected ? 'bg-ink text-card' : 'text-muted hover:text-ink'
            } focus-within:ring-2 focus-within:ring-accent`}
          >
            <input
              type="radio"
              name="theme-preference"
              value={option.value}
              checked={isSelected}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <span aria-hidden="true">{option.label}</span>
            <span className="sr-only">{option.description}</span>
          </label>
        );
      })}
    </fieldset>
  );
}
