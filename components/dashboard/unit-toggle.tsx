'use client';

import type { UnitSystem } from '@/lib/weather/units';

const OPTIONS: { value: UnitSystem; label: string; description: string }[] = [
  { value: 'imperial', label: '°F', description: 'Fahrenheit, miles per hour, inches' },
  { value: 'metric', label: '°C', description: 'Celsius, kilometres per hour, millimetres' },
];

interface UnitToggleProps {
  unitSystem: UnitSystem;
  onChange: (unitSystem: UnitSystem) => void;
}

/**
 * Radio group rather than a checkbox or button: there are two named, mutually exclusive choices,
 * and the radio semantics let a screen-reader user hear which is active and arrow between them.
 */
export function UnitToggle({ unitSystem, onChange }: UnitToggleProps) {
  return (
    <fieldset className="flex items-center gap-2">
      <legend className="sr-only">Measurement units</legend>
      {OPTIONS.map((option) => {
        const isSelected = option.value === unitSystem;
        return (
          <label
            key={option.value}
            className={`cursor-pointer rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
              isSelected ? 'bg-ink text-card' : 'bg-card text-ink hover:bg-canvas'
            } border border-line-strong focus-within:ring-2 focus-within:ring-accent`}
          >
            <input
              type="radio"
              name="unit-system"
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
