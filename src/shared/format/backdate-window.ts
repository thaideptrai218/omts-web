/** Backdating window of a recorded date (owner decision 11/11/2026: at most 30 days back; not before the cycle start). */
export const MAX_BACKDATE_DAYS = 30;

/** yyyy-mm-dd minus `days` calendar days (pure date math; no time zone involved). */
export function shiftDateOnly(day: string, days: number): string {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date - days)).toISOString().slice(0, 10);
}

/**
 * Earliest and latest day a record may carry. `today` is the cooperative's business day; `notBefore` is an optional
 * lower bound such as the cycle start (the later of the two bounds wins).
 */
export function backdateWindow(today: string, notBefore?: string | null): { min: string; max: string } {
  const floor = shiftDateOnly(today, MAX_BACKDATE_DAYS);
  return { min: notBefore && notBefore > floor ? notBefore : floor, max: today };
}

/** Vietnamese message for a date outside the window, or undefined when the date is acceptable. */
export function backdateProblem(day: string, window: { min: string; max: string }, subject: string, hasCycleFloor = false): string | undefined {
  if (!day) return undefined;
  if (day > window.max) return `${subject} không được sau hôm nay.`;
  if (day < window.min) return hasCycleFloor ? `${subject} không được trước ngày bắt đầu chu kỳ và không quá ${MAX_BACKDATE_DAYS} ngày trước.` : `${subject} không được quá ${MAX_BACKDATE_DAYS} ngày trước.`;
  return undefined;
}
