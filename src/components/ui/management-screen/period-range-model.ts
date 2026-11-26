import { toDisplayDate } from "./time-range-model";

/** A chosen stretch of days with the name the picker shows for it ("Tháng 11/2026", "Trong 7 ngày qua"). Dates are local `yyyy-mm-dd`. */
export type PeriodRange = { from: string; to: string; label: string };

const DAY = 86_400_000;
const pad = (value: number) => String(value).padStart(2, "0");
const parse = (date: string) => new Date(`${date}T00:00:00Z`);
const key = (date: Date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
const utc = (year: number, month: number, day = 1) => new Date(Date.UTC(year, month, day));
const shift = (date: string, days: number) => key(new Date(parse(date).getTime() + days * DAY));

/** The range from `start` to `end`, never reaching past `today`; undefined when it starts after today (nothing to show yet). */
function clipped(start: Date, end: Date, today: string, label: string): PeriodRange | undefined {
  const from = key(start), to = key(end);
  return from > today ? undefined : { from, to: to > today ? today : to, label };
}

export const lastDaysRange = (days: number, today: string): PeriodRange => ({ from: shift(today, 1 - days), to: today, label: `Trong ${days} ngày qua` });

/** Monday to Sunday of the week that starts on `monday`. */
export function weekRange(monday: string, today: string): PeriodRange | undefined {
  const start = parse(monday), end = new Date(start.getTime() + 6 * DAY);
  return clipped(start, end, today, `Tuần ${pad(start.getUTCDate())}/${pad(start.getUTCMonth() + 1)} - ${toDisplayDate(key(end))}`);
}

/** The newest `count` weeks, this week first. */
export function recentWeeks(today: string, count = 12): PeriodRange[] {
  const now = parse(today), monday = new Date(now.getTime() - (now.getUTCDay() + 6) % 7 * DAY);
  return Array.from({ length: count }, (_, index) => weekRange(key(new Date(monday.getTime() - index * 7 * DAY)), today)).filter((range): range is PeriodRange => !!range);
}

export const monthRange = (year: number, month: number, today: string) => clipped(utc(year, month - 1), utc(year, month, 0), today, `Tháng ${month}/${year}`);
export const quarterRange = (year: number, quarter: number, today: string) => clipped(utc(year, (quarter - 1) * 3), utc(year, quarter * 3, 0), today, `Quý ${quarter}/${year}`);
export const yearRange = (year: number, today: string) => clipped(utc(year, 0), utc(year, 12, 0), today, `Năm ${year}`);

/** "dd/mm/yyyy - dd/mm/yyyy" for a range typed in the calendar. */
export const customRangeOf = (from: string, to: string): PeriodRange => ({ from, to, label: `${toDisplayDate(from)} - ${toDisplayDate(to)}` });
