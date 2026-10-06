/** "6:58 AM" from a local "YYYY-MM-DDTHH:mm" or "YYYY-MM-DD HH:mm", without timezone conversion. */
export function clockTime(local: string): string {
  const [hours, minutes] = local.slice(11, 16).split(':').map(Number);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** "Today 8:15 AM", "Yesterday", "Oct 2" — for an eBird obsDt relative to the park's today. */
export function whenObserved(obsDt: string, today: string): string {
  const date = obsDt.slice(0, 10);
  const time = obsDt.length > 10 ? ` ${clockTime(obsDt.replace(' ', 'T'))}` : '';
  const ago = daysBetween(date, today);
  if (ago <= 0) return `Today${time}`;
  if (ago === 1) return `Yesterday${time}`;
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

/** "Mon, Oct 5" from "YYYY-MM-DD". */
export function dayLabel(date: string, today: string): string {
  const ago = daysBetween(date, today);
  if (ago === 0) return 'This morning';
  if (ago === -1) return 'Tomorrow morning';
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
}
