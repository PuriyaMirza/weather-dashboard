'use client';

import { useId, useMemo } from 'react';
import { Icon } from '@/components/ui/icon';
import {
  COLOR_LABEL,
  COLOR_SWATCH,
  HABITAT_LABEL,
  SIZE_CLASSES,
  SIZE_LABEL,
  type SizeClass,
} from '@/lib/birds/labels';
import { FIELD_COLORS, HABITATS, type Species } from '@/lib/birds/schema';
import { filterSpecies, hasActiveFilters } from '@/lib/birds/search';
import { useGuideFiltersStore } from '@/store/guide-filters-store';
import { SpeciesRow } from './species-row';
import { ToggleChip } from './toggle-chip';

interface FieldGuideProps {
  species: Species[];
  families: string[];
  /** True when some species have no guide write-up, so colour/size/habitat filters can't see them. */
  hasUndescribedSpecies: boolean;
  /** Thumbnail URL by species code, for the species that have a photo. */
  thumbs: Record<string, string>;
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/** Groups an already-ordered list under family headings, keeping taxonomic order. */
function groupByFamily(species: Species[]): [string, Species[]][] {
  const groups = new Map<string, Species[]>();
  for (const s of species) groups.set(s.family, [...(groups.get(s.family) ?? []), s]);
  return [...groups];
}

/**
 * Search and filter the park's birds. Filters mirror how a beginner remembers a bird —
 * "small, yellow and black, in the bushes" — rather than how a taxonomist files it.
 */
export function FieldGuide({ species, families, hasUndescribedSpecies, thumbs }: FieldGuideProps) {
  const filters = useGuideFiltersStore();
  const { setFilters, reset } = filters;
  const ids = { search: useId(), family: useId() };

  const results = useMemo(() => filterSpecies(species, filters), [species, filters]);
  const active = hasActiveFilters(filters);
  const attributeFilterCount = filters.colors.length + filters.sizes.length + filters.habitats.length + (filters.family ? 1 : 0);
  const searching = filters.query.trim() !== '';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={ids.search} className="type-label-lg text-on-surface">
          Search birds
        </label>
        <div className="relative">
          <Icon
            name="search"
            size={20}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
          />
          <input
            id={ids.search}
            type="search"
            value={filters.query}
            onChange={(event) => setFilters({ query: event.target.value })}
            placeholder="Name or 4-letter code, e.g. AMRO"
            autoComplete="off"
            enterKeyHint="search"
            className="h-12 w-full rounded-xl border border-outline-variant bg-surface-container-low pl-10 pr-3 type-body-md text-on-surface placeholder:text-on-surface-variant"
          />
        </div>
      </div>

      <details className="group rounded-xl bg-surface-container shadow-card" open={attributeFilterCount > 0 || undefined}>
        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 type-label-lg text-on-surface">
          <Icon name="tune" size={20} />
          Filter by what you saw
          {attributeFilterCount > 0 && (
            <span className="rounded-full bg-secondary-container px-2 py-0.5 type-label-md text-secondary-fixed">
              {attributeFilterCount} on
            </span>
          )}
          <Icon name="expand-more" size={20} className="ml-auto transition-transform group-open:rotate-180" />
        </summary>
        <div className="flex flex-col gap-5 px-4 pb-4 pt-1">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 type-label-md uppercase text-secondary-fixed">Colors (all must match)</legend>
            <div className="flex flex-wrap gap-2">
              {FIELD_COLORS.map((color) => (
                <ToggleChip
                  key={color}
                  pressed={filters.colors.includes(color)}
                  onToggle={() => setFilters({ colors: toggle(filters.colors, color) })}
                >
                  <span
                    aria-hidden="true"
                    className="h-3.5 w-3.5 rounded-full border border-outline-variant"
                    style={{ backgroundColor: COLOR_SWATCH[color] }}
                  />
                  {COLOR_LABEL[color]}
                </ToggleChip>
              ))}
            </div>
          </fieldset>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 type-label-md uppercase text-secondary-fixed">Size</legend>
            <div className="flex flex-wrap gap-2">
              {SIZE_CLASSES.map((size: SizeClass) => (
                <ToggleChip
                  key={size}
                  pressed={filters.sizes.includes(size)}
                  onToggle={() => setFilters({ sizes: toggle(filters.sizes, size) })}
                >
                  {SIZE_LABEL[size]}
                </ToggleChip>
              ))}
            </div>
          </fieldset>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 type-label-md uppercase text-secondary-fixed">Where it was</legend>
            <div className="flex flex-wrap gap-2">
              {HABITATS.map((habitat) => (
                <ToggleChip
                  key={habitat}
                  pressed={filters.habitats.includes(habitat)}
                  onToggle={() => setFilters({ habitats: toggle(filters.habitats, habitat) })}
                >
                  {HABITAT_LABEL[habitat]}
                </ToggleChip>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={ids.family} className="type-label-md uppercase text-secondary-fixed">
              Family
            </label>
            <select
              id={ids.family}
              value={filters.family ?? ''}
              onChange={(event) => setFilters({ family: event.target.value || null })}
              className="h-11 rounded-xl border border-outline-variant bg-surface-container-low px-3 type-body-md text-on-surface"
            >
              <option value="">All families</option>
              {families.map((family) => (
                <option key={family} value={family}>
                  {family}
                </option>
              ))}
            </select>
          </div>
          {hasUndescribedSpecies && (
            <p className="type-body-sm text-on-surface-variant">
              Color, size, and habitat filters only cover birds with a guide write-up.
            </p>
          )}
        </div>
      </details>

      <div className="flex items-center justify-between gap-3">
        <p aria-live="polite" className="type-label-lg text-on-surface-variant">
          {active
            ? `${results.length} ${results.length === 1 ? 'bird matches' : 'birds match'}`
            : `${species.length} birds`}
        </p>
        {active && (
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 type-label-lg text-secondary-fixed hover:bg-surface-container-high"
          >
            <Icon name="close" size={18} />
            Clear all
          </button>
        )}
      </div>

      {results.length === 0 ? (
        <p className="rounded-xl bg-surface-container px-4 py-6 text-center type-body-md text-on-surface-variant">
          No birds match. Try fewer colors, or a neighboring size — size is hard to judge in the field.
        </p>
      ) : searching ? (
        <ul className="flex flex-col">
          {results.map((s) => (
            <li key={s.code}>
              <SpeciesRow species={s} showFamily markWriteUp={hasUndescribedSpecies} thumbSrc={thumbs[s.code]} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col gap-5">
          {groupByFamily(results).map(([family, members]) => (
            <section key={family} aria-label={family}>
              <h2 className="px-3 pb-1 type-label-md uppercase text-secondary-fixed">{family}</h2>
              <ul className="flex flex-col">
                {members.map((s) => (
                  <li key={s.code}>
                    <SpeciesRow species={s} markWriteUp={hasUndescribedSpecies} thumbSrc={thumbs[s.code]} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
