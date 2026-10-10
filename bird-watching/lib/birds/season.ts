/*
  Pure helpers over eBird's bar chart weeks. Kept free of JSON/Zod imports so the client component
  can use them without pulling the data layer into the browser bundle.
*/

export const WEEKS_PER_YEAR = 48;

/** eBird's week of the year (0–47): four per month, days 1–7, 8–14, 15–21, and 22–month end. */
export function ebirdWeek(date: Date): number {
  return date.getMonth() * 4 + Math.min(3, Math.floor((date.getDate() - 1) / 7));
}

export interface SeasonalPick {
  code: string;
  /** Share of checklists reporting the species this week, 0–1. */
  frequency: number;
}

export interface WeekPicks {
  likely: SeasonalPick[];
  arriving: SeasonalPick[];
}

const wrap = (week: number) => (week + WEEKS_PER_YEAR) % WEEKS_PER_YEAR;

/**
 * "Likely" are the most commonly reported birds this week. "Arriving" are birds that are already
 * reasonably reported but were rarer three weeks ago — the threshold is absolute (not a ratio) so a
 * bird going from 0.1% to 0.3% of checklists never counts as a surge.
 */
export function picksForWeek(
  species: Record<string, number[]>,
  week: number,
  { likelyCount = 8, arrivingCount = 5 } = {},
): WeekPicks {
  const entries = Object.entries(species).map(([code, weekly]) => ({
    code,
    frequency: weekly[wrap(week)] ?? 0,
    before: weekly[wrap(week - 3)] ?? 0,
  }));
  const byFrequency = (a: SeasonalPick, b: SeasonalPick) => b.frequency - a.frequency;
  const likely = entries
    .filter((e) => e.frequency > 0)
    .sort(byFrequency)
    .slice(0, likelyCount)
    .map(({ code, frequency }) => ({ code, frequency }));
  const arriving = entries
    .filter((e) => e.frequency >= 0.05 && e.frequency - e.before >= 0.05)
    .sort((a, b) => b.frequency - b.before - (a.frequency - a.before))
    .slice(0, arrivingCount)
    .map(({ code, frequency }) => ({ code, frequency }));
  return { likely, arriving };
}
