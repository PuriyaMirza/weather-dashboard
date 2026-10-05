export interface BreedingCode {
  code: string;
  label: string;
  category: 'Confirmed' | 'Probable' | 'Possible' | 'Observed';
}

/** eBird's breeding and behavior codes, strongest evidence first. */
export const BREEDING_CODES: BreedingCode[] = [
  { code: 'NY', label: 'Nest with young', category: 'Confirmed' },
  { code: 'NE', label: 'Nest with eggs', category: 'Confirmed' },
  { code: 'FS', label: 'Carrying fecal sac', category: 'Confirmed' },
  { code: 'FY', label: 'Feeding young', category: 'Confirmed' },
  { code: 'CF', label: 'Carrying food', category: 'Confirmed' },
  { code: 'FL', label: 'Recently fledged young', category: 'Confirmed' },
  { code: 'ON', label: 'Occupied nest', category: 'Confirmed' },
  { code: 'UN', label: 'Used nest', category: 'Confirmed' },
  { code: 'DD', label: 'Distraction display', category: 'Confirmed' },
  { code: 'NB', label: 'Nest building', category: 'Confirmed' },
  { code: 'CN', label: 'Carrying nesting material', category: 'Confirmed' },
  { code: 'PE', label: 'Physiological evidence', category: 'Confirmed' },
  { code: 'B', label: 'Woodpecker or wren nest building', category: 'Probable' },
  { code: 'A', label: 'Agitated behavior', category: 'Probable' },
  { code: 'N', label: 'Visiting probable nest site', category: 'Probable' },
  { code: 'C', label: 'Courtship, display, or copulation', category: 'Probable' },
  { code: 'T', label: 'Territorial defense', category: 'Probable' },
  { code: 'P', label: 'Pair in suitable habitat', category: 'Probable' },
  { code: 'M', label: 'Multiple (7+) singing males', category: 'Probable' },
  { code: 'S7', label: 'Singing male present 7+ days', category: 'Probable' },
  { code: 'S', label: 'Singing male', category: 'Possible' },
  { code: 'H', label: 'In appropriate habitat', category: 'Possible' },
  { code: 'F', label: 'Flyover', category: 'Observed' },
];

export function breedingCodeLabel(code: string): string | undefined {
  return BREEDING_CODES.find((b) => b.code === code)?.label;
}
