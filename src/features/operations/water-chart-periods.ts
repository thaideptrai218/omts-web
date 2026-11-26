import type { WaterChartRaw } from "./contracts";

export type WaterGranularity = "month" | "quarter" | "year";
export const WATER_GRANULARITIES: readonly (readonly [WaterGranularity, string])[] = [["month", "Tháng"], ["quarter", "Quý"], ["year", "Năm"]];
export type WaterIndicatorKey = "ph" | "salinity" | "temperature";
export type Statistics = { average: number | null; minimum: number | null; maximum: number | null };
/** One bucket of the chart: `count` is the number of measurements in it, a period without any is `missing`. */
export type WaterChartPeriod = { key: string; label: string; tick: string; from: string; to: string; count: number; missing: boolean } & Record<WaterIndicatorKey, Statistics>;
export type WaterChartData = Pick<WaterChartRaw, "zoneId" | "from" | "to" | "thresholds"> & { granularity: WaterGranularity; periods: WaterChartPeriod[] };

const MAX_PERIODS = 240;
/** How far back the chart looks when the user has not chosen a range: 12 months, 8 quarters or 5 years. */
const DEFAULT_SPAN: Record<WaterGranularity, { months: number; text: string }> = {
  month: { months: 12, text: "12 tháng gần nhất" }, quarter: { months: 24, text: "8 quý gần nhất" }, year: { months: 60, text: "5 năm gần nhất" } };
export const defaultRangeText = (granularity: WaterGranularity) => DEFAULT_SPAN[granularity].text;

const pad = (value: number) => String(value).padStart(2, "0");
const dateKey = (date: Date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
const round = (value: number) => Math.round(value * 100) / 100;

/** First day of the chart when no start date is chosen: the span of the granularity back from `today` (Vietnam date). */
export function defaultChartStart(today: string, granularity: WaterGranularity = "month"): string {
  const start = new Date(`${today}T00:00:00Z`);
  start.setUTCMonth(start.getUTCMonth() - DEFAULT_SPAN[granularity].months);
  return dateKey(start);
}

/** The period of a local date `yyyy-mm-dd`: its key, its label ("Tháng 11/2026", "Quý 4/2026", "Năm 2026") and the short axis text. */
export function periodOf(date: string, granularity: WaterGranularity): Pick<WaterChartPeriod, "key" | "label" | "tick"> {
  const year = date.slice(0, 4), month = Number(date.slice(5, 7)), quarter = Math.floor((month - 1) / 3) + 1;
  if (granularity === "month") return { key: date.slice(0, 7), label: `Tháng ${month}/${year}`, tick: `${pad(month)}/${year}` };
  if (granularity === "quarter") return { key: `${year}-Q${quarter}`, label: `Quý ${quarter}/${year}`, tick: `Quý ${quarter}/${year}` };
  return { key: year, label: `Năm ${year}`, tick: year };
}

function statistics(values: number[]): Statistics {
  if (!values.length) return { average: null, minimum: null, maximum: null };
  return { average: round(values.reduce((sum, value) => sum + value, 0) / values.length), minimum: Math.min(...values), maximum: Math.max(...values) };
}

/** Months a period spans. */
const STEP: Record<WaterGranularity, number> = { month: 1, quarter: 3, year: 12 };

/**
 * Groups the raw chart points by the local (Vietnam) month, quarter or year. Every period between from and to gets an entry,
 * so a gap in the measurements shows as a missing period instead of being bridged.
 */
export function aggregateWaterChart(chart: WaterChartRaw, granularity: WaterGranularity): WaterChartData {
  // measuredAt keeps the +07:00 offset the backend sends, so its first ten characters are the local date.
  const buckets = new Map<string, WaterChartRaw["points"]>();
  for (const point of chart.points) {
    const key = periodOf(point.measuredAt.slice(0, 10), granularity).key;
    buckets.set(key, [...(buckets.get(key) ?? []), point]);
  }
  const periods: WaterChartPeriod[] = [], step = STEP[granularity];
  const last = new Date(`${chart.to}T00:00:00Z`), first = new Date(`${chart.from}T00:00:00Z`);
  if (first > last) return { zoneId: chart.zoneId, from: chart.from, to: chart.to, thresholds: chart.thresholds, granularity, periods };
  // The first period is the whole month, quarter or year that holds `from`.
  const startMonth = granularity === "month" ? first.getUTCMonth() : granularity === "quarter" ? first.getUTCMonth() - first.getUTCMonth() % 3 : 0;
  for (let cursor = new Date(Date.UTC(first.getUTCFullYear(), startMonth, 1)); cursor <= last && periods.length < MAX_PERIODS; cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + step, 1))) {
    const start = dateKey(cursor), end = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + step, 0));
    const identity = periodOf(start, granularity), points = buckets.get(identity.key) ?? [];
    periods.push({
      ...identity, from: start < chart.from ? chart.from : start, to: end > last ? chart.to : dateKey(end), count: points.length, missing: !points.length,
      ph: statistics(points.map(point => point.ph)), salinity: statistics(points.map(point => point.salinity)), temperature: statistics(points.map(point => point.temperature)),
    });
  }
  return { zoneId: chart.zoneId, from: chart.from, to: chart.to, thresholds: chart.thresholds, granularity, periods };
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
