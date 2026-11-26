import type { WaterChartRaw } from "./contracts";

export type WaterGranularity = "day" | "week" | "month" | "quarter" | "year";
export type WaterIndicatorKey = "ph" | "salinity" | "temperature";
export type Statistics = { average: number | null; minimum: number | null; maximum: number | null };
/** One bucket of the chart: `count` is the number of measurements in it, a period without any is `missing`. `tick` is the short text that names it in a gap line. */
export type WaterChartPeriod = { key: string; label: string; tick: string; from: string; to: string; count: number; missing: boolean } & Record<WaterIndicatorKey, Statistics>;
export type WaterChartData = Pick<WaterChartRaw, "zoneId" | "from" | "to" | "thresholds"> & { granularity: WaterGranularity; periods: WaterChartPeriod[] };

const MAX_PERIODS = 240, DAY = 86_400_000;
const pad = (value: number) => String(value).padStart(2, "0");
const parse = (date: string) => new Date(`${date}T00:00:00Z`);
const dateKey = (date: Date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
const dayMonth = (date: Date) => `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}`;
const round = (value: number) => Math.round(value * 100) / 100;
const utc = (year: number, month: number, day = 1) => new Date(Date.UTC(year, month, day));

/** Points of the chart follow the length of the chosen range: days up to a month, weeks up to about three months, months up to a year, quarters up to three years, years beyond. */
export function granularityFor(from: string, to: string): WaterGranularity {
  const days = Math.round((parse(to).getTime() - parse(from).getTime()) / DAY) + 1;
  return days <= 31 ? "day" : days <= 93 ? "week" : days <= 366 ? "month" : days <= 1100 ? "quarter" : "year";
}

function startOf(date: Date, granularity: WaterGranularity): Date {
  const year = date.getUTCFullYear(), month = date.getUTCMonth();
  switch (granularity) {
    case "day": return date;
    case "week": return new Date(date.getTime() - (date.getUTCDay() + 6) % 7 * DAY);
    case "month": return utc(year, month);
    case "quarter": return utc(year, month - month % 3);
    case "year": return utc(year, 0);
  }
}
function nextStart(start: Date, granularity: WaterGranularity): Date {
  const year = start.getUTCFullYear(), month = start.getUTCMonth();
  switch (granularity) {
    case "day": return new Date(start.getTime() + DAY);
    case "week": return new Date(start.getTime() + 7 * DAY);
    case "month": return utc(year, month + 1);
    case "quarter": return utc(year, month + 3);
    case "year": return utc(year + 1, 0);
  }
}

/** The period holding a local date `yyyy-mm-dd`: its key and its names ("Tháng 11/2026", "Quý 4/2026", "Năm 2026", "Tuần 23/11 – 29/11/2026", "27/11/2026"). */
export function periodOf(date: string, granularity: WaterGranularity): Pick<WaterChartPeriod, "key" | "label" | "tick"> {
  const start = startOf(parse(date), granularity), key = dateKey(start), year = start.getUTCFullYear(), month = start.getUTCMonth() + 1;
  const full = `${dayMonth(start)}/${year}`;
  switch (granularity) {
    case "day": return { key, label: full, tick: full };
    case "week": return { key, label: `Tuần ${dayMonth(start)} – ${dayMonth(new Date(nextStart(start, "week").getTime() - DAY))}/${new Date(nextStart(start, "week").getTime() - DAY).getUTCFullYear()}`, tick: full };
    case "month": return { key: key.slice(0, 7), label: `Tháng ${month}/${year}`, tick: `${pad(month)}/${year}` };
    case "quarter": { const quarter = Math.floor((month - 1) / 3) + 1; return { key: `${year}-Q${quarter}`, label: `Quý ${quarter}/${year}`, tick: `Quý ${quarter}/${year}` }; }
    case "year": return { key: String(year), label: `Năm ${year}`, tick: String(year) };
  }
}

function statistics(values: number[]): Statistics {
  if (!values.length) return { average: null, minimum: null, maximum: null };
  return { average: round(values.reduce((sum, value) => sum + value, 0) / values.length), minimum: Math.min(...values), maximum: Math.max(...values) };
}

/**
 * Groups the raw chart points by the local (Vietnam) day, week (Monday to Sunday), month, quarter or year. Every period between from and to gets
 * an entry, so a gap in the measurements shows as a missing period instead of being bridged.
 */
export function aggregateWaterChart(chart: WaterChartRaw, granularity: WaterGranularity): WaterChartData {
  // measuredAt keeps the +07:00 offset the backend sends, so its first ten characters are the local date.
  const buckets = new Map<string, WaterChartRaw["points"]>();
  for (const point of chart.points) {
    const key = periodOf(point.measuredAt.slice(0, 10), granularity).key;
    buckets.set(key, [...(buckets.get(key) ?? []), point]);
  }
  const periods: WaterChartPeriod[] = [], last = parse(chart.to), first = parse(chart.from);
  const result = (): WaterChartData => ({ zoneId: chart.zoneId, from: chart.from, to: chart.to, thresholds: chart.thresholds, granularity, periods });
  if (first > last) return result();
  for (let cursor = startOf(first, granularity); cursor <= last && periods.length < MAX_PERIODS; cursor = nextStart(cursor, granularity)) {
    const start = dateKey(cursor), end = new Date(nextStart(cursor, granularity).getTime() - DAY);
    const identity = periodOf(start, granularity), points = buckets.get(identity.key) ?? [];
    periods.push({
      ...identity, from: start < chart.from ? chart.from : start, to: end > last ? chart.to : dateKey(end), count: points.length, missing: !points.length,
      ph: statistics(points.map(point => point.ph)), salinity: statistics(points.map(point => point.salinity)), temperature: statistics(points.map(point => point.temperature)),
    });
  }
  return result();
}

/** A run of consecutive periods without any measurement, by the short text of its first and last period. */
export type WaterGap = { from: string; to: string };
/** The periods to list in the table (those with measurements) and the runs of empty periods that are left out of it. */
export function tableOfPeriods(periods: readonly WaterChartPeriod[]): { rows: WaterChartPeriod[]; gaps: WaterGap[] } {
  const gaps: WaterGap[] = [];
  periods.forEach((period, index) => {
    if (!period.missing) return;
    if (index > 0 && periods[index - 1].missing) gaps[gaps.length - 1].to = period.tick;
    else gaps.push({ from: period.tick, to: period.tick });
  });
  return { rows: periods.filter(period => !period.missing), gaps };
}

/** "Không có lượt đo từ 11/2025 đến 09/2026"; several runs are joined into the one line. */
export function gapText(gaps: readonly WaterGap[]): string {
  if (!gaps.length) return "";
  return `Không có lượt đo ${gaps.map(gap => gap.from === gap.to ? `trong ${gap.from}` : `từ ${gap.from} đến ${gap.to}`).join("; ")}`;
}
