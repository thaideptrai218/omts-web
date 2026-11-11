import type { WaterChartRaw } from "./contracts";

export type WaterGroupBy = "day" | "month";
type Statistics = { average: number | null; minimum: number | null; maximum: number | null; count: number };
export type WaterChartPeriod = { period: string; from: string; to: string; ph: Statistics; salinity: Statistics; temperature: Statistics; missing: boolean };
export type WaterChartData = Pick<WaterChartRaw, "zoneId" | "from" | "to" | "thresholds"> & { groupBy: WaterGroupBy; periods: WaterChartPeriod[] };

const MAX_PERIODS = 800;
/** The chart default when no start date is chosen: twelve months back from today (Vietnam date). */
export function defaultChartStart(today: string): string {
  const start = new Date(`${today}T00:00:00Z`);
  start.setUTCMonth(start.getUTCMonth() - 12);
  return dateKey(start);
}
const round = (value: number) => Math.round(value * 100) / 100;
const pad = (value: number) => String(value).padStart(2, "0");
const dateKey = (date: Date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;

function statistics(values: number[]): Statistics {
  if (!values.length) return { average: null, minimum: null, maximum: null, count: 0 };
  return { average: round(values.reduce((sum, value) => sum + value, 0) / values.length), minimum: Math.min(...values), maximum: Math.max(...values), count: values.length };
}

/**
 * Groups the raw chart points by local (Vietnam) day or month. Every day or month between from and to gets a period,
 * so a gap in the measurements shows as a missing period instead of being bridged.
 */
export function aggregateWaterChart(chart: WaterChartRaw, groupBy: WaterGroupBy): WaterChartData {
  // measuredAt keeps the +07:00 offset the backend sends, so its first ten characters are the local date.
  const buckets = new Map<string, WaterChartRaw["points"]>();
  for (const point of chart.points) {
    const day = point.measuredAt.slice(0, 10), key = groupBy === "month" ? day.slice(0, 7) : day;
    buckets.set(key, [...(buckets.get(key) ?? []), point]);
  }
  const periods: WaterChartPeriod[] = [];
  const last = new Date(`${chart.to}T00:00:00Z`);
  for (let cursor = new Date(`${chart.from}T00:00:00Z`); cursor <= last && periods.length < MAX_PERIODS;) {
    const first = dateKey(cursor), key = groupBy === "month" ? first.slice(0, 7) : first;
    const end = groupBy === "month" ? new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0)) : cursor;
    const points = buckets.get(key) ?? [];
    periods.push({
      period: key, from: first, to: end > last ? chart.to : dateKey(end),
      ph: statistics(points.map((point) => point.ph)), salinity: statistics(points.map((point) => point.salinity)),
      temperature: statistics(points.map((point) => point.temperature)), missing: !points.length,
    });
    cursor = groupBy === "month" ? new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1)) : new Date(cursor.getTime() + 86_400_000);
  }
  return { zoneId: chart.zoneId, from: chart.from, to: chart.to, thresholds: chart.thresholds, groupBy, periods };
}
