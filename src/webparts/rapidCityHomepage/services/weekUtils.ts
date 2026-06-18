export interface IWeekRange {
  /** e.g. "Week of June 1" */
  title: string;
  /** e.g. "June 1 to June 7, 2026" */
  range: string;
}

/**
 * The current week as display strings, running Monday to Sunday. Computed from
 * today's date so the "Weekly Focus" card is always current with no editing.
 */
export function getCurrentWeek(today: Date = new Date()): IWeekRange {
  // Days back to this week's Monday. getDay(): Sun=0..Sat=6, so Mon=0..Sun=6.
  const daysSinceMonday = (today.getDay() + 6) % 7;
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysSinceMonday);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);

  const monthDay = (d: Date): string =>
    d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });

  return {
    title: `Week of ${monthDay(monday)}`,
    range: `${monthDay(monday)} to ${monthDay(sunday)}, ${sunday.getFullYear()}`,
  };
}
