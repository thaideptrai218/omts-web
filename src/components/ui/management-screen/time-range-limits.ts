import { allTime, fromQueryDate, isAllTime, toQueryDate, type TimeRangeValue } from "./time-range-model";

/** First day of the widest window of `years` calendar years that still ends on `to` (the day after the same date `years` ago, so the window is never longer than the API allows, also across 29 February). */
export function widestFrom(to: string, years: number) {
  const end = fromQueryDate(to);
  return toQueryDate(new Date(end.getFullYear() - years, end.getMonth(), end.getDate() + 1));
}

/**
 * from/to for an API that needs both dates and caps the span. "Toàn thời gian" has no bounds of its own, so it becomes the widest allowed
 * window ending on `today`; any other value is sent as chosen.
 */
export function boundedRange(value: TimeRangeValue, today: string, years: number): { from: string; to: string } {
  return isAllTime(value) ? { from: widestFrom(today, years), to: today } : { from: value.from, to: value.to };
}

/** A custom range (for a deep link or a stored filter) in the shape the time filter takes. */
export const customRange = (from: string, to: string): TimeRangeValue => ({ kind: "custom", from, to });

/** Comparable identity of a time filter: a preset is the same preset on any day, a custom range is its two dates. */
export const timeRangeKey = (value: TimeRangeValue) => (value.kind === "preset" ? value.preset : `${value.from}..${value.to}`);

/** True when the filter narrows the list at all. */
export const isTimeNarrowed = (value: TimeRangeValue) => timeRangeKey(value) !== timeRangeKey(allTime);
