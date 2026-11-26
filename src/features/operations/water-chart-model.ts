import { indicatorRange } from "@/features/zones-api/zone-water-model";
import type { WaterChartData, WaterChartPeriod, WaterIndicatorKey } from "./water-chart-periods";

export const INDICATORS: readonly { key: WaterIndicatorKey; title: string; unit: string }[] = [
  { key: "ph", title: "pH", unit: "" }, { key: "salinity", title: "Độ mặn", unit: "‰" }, { key: "temperature", title: "Nhiệt độ", unit: "°C" }];

export const formatReading = (value: number, digits = 2) => value.toLocaleString("vi-VN", { maximumFractionDigits: digits });

/** The thresholds of one indicator as [min, max]; either end may be missing. */
export function boundsOf(data: Pick<WaterChartData, "thresholds">, key: WaterIndicatorKey): [number | null, number | null] {
  const t = data.thresholds;
  return key === "ph" ? [t.phMin, t.phMax] : key === "salinity" ? [t.salinityMin, t.salinityMax] : [t.temperatureMin, t.temperatureMax];
}

/** A period is outside when any of its measurements went beyond a threshold (its lowest or highest reading does). */
export function periodOutside(period: WaterChartPeriod, key: WaterIndicatorKey, [min, max]: [number | null, number | null]): boolean {
  const { minimum, maximum } = period[key];
  return (min !== null && minimum !== null && minimum < min) || (max !== null && maximum !== null && maximum > max);
}

/** One point of an indicator's chart; `band` is [lowest, highest] and stays null for a period without measurements, so the line breaks there. */
export type ChartRow = { key: string; tick: string; label: string; from: string; to: string; count: number; average: number | null; minimum: number | null; maximum: number | null; band: [number, number] | null; outside: boolean };

export function chartRows(data: WaterChartData, key: WaterIndicatorKey): ChartRow[] {
  const bounds = boundsOf(data, key);
  return data.periods.map(period => {
    const { average, minimum, maximum } = period[key];
    return { key: period.key, tick: period.tick, label: period.label, from: period.from, to: period.to, count: period.count, average, minimum, maximum,
      band: minimum === null || maximum === null ? null : [minimum, maximum], outside: !period.missing && periodOutside(period, key, bounds) };
  });
}

/** Vertical range that holds every reading and the thresholds with a little air, so the threshold band is always visible. */
export function chartDomain(rows: readonly ChartRow[], [min, max]: [number | null, number | null]): [number, number] {
  const values = [...rows.flatMap(row => row.band ?? []), ...(min === null ? [] : [min]), ...(max === null ? [] : [max])];
  if (!values.length) return [0, 1];
  const low = Math.min(...values), high = Math.max(...values), pad = (high - low) * 0.1 || Math.max(Math.abs(high) * 0.05, 0.5);
  const floor = (value: number) => Math.floor(value * 10) / 10, ceil = (value: number) => Math.ceil(value * 10) / 10;
  return [Math.max(0, floor(low - pad)), ceil(high + pad)];
}

/** The text a screen reader gets in place of the drawing. */
export function chartSummary(data: WaterChartData, key: WaterIndicatorKey): string {
  const indicator = INDICATORS.find(item => item.key === key)!, unit = indicator.unit ? ` ${indicator.unit}` : "";
  const measured = data.periods.filter(period => !period.missing);
  if (!measured.length) return `${indicator.title}: chưa có lượt đo trong khoảng này.`;
  const total = measured.reduce((sum, period) => sum + period.count, 0);
  const average = measured.reduce((sum, period) => sum + (period[key].average ?? 0) * period.count, 0) / total;
  const low = Math.min(...measured.map(period => period[key].minimum ?? Infinity)), high = Math.max(...measured.map(period => period[key].maximum ?? -Infinity));
  const limits = indicatorRange(data.thresholds, key);
  const bounds = boundsOf(data, key), outside = measured.filter(period => periodOutside(period, key, bounds)).length;
  return `${indicator.title}: trung bình ${formatReading(average)}${unit}, thấp nhất ${formatReading(low)}${unit}, cao nhất ${formatReading(high)}${unit}`
    + `, từ ${measured[0].label} đến ${measured[measured.length - 1].label}`
    + (limits ? `; ngưỡng vùng ${limits}` : "") + (outside ? `; ${outside} kỳ có lượt đo vượt ngưỡng` : "") + ".";
}
