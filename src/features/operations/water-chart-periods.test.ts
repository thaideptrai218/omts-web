import { describe, expect, it } from "vitest";
import type { WaterChartRaw } from "./contracts";
import { aggregateWaterChart } from "./water-chart-periods";

const thresholds = { phMin: 7.5, phMax: 8.5, salinityMin: 18, salinityMax: 32, temperatureMin: 15, temperatureMax: 32 };
const id = "529ec3ce-af8f-42f7-a08f-4bab36ba7e62";
const point = (measuredAt: string, ph: number, salinity: number, temperature: number) => ({ id, measuredAt, ph, salinity, temperature });
const chart = (from: string, to: string, points: WaterChartRaw["points"]): WaterChartRaw => ({ zoneId: id, from, to, thresholds, points });

describe("water chart aggregation", () => {
  it("averages by local month and marks a month without data as missing", () => {
    const result = aggregateWaterChart(chart("2026-08-15", "2026-10-20", [
      point("2026-08-20T06:30:00+07:00", 8, 26, 25), point("2026-08-31T23:30:00+07:00", 8.4, 28, 27), point("2026-10-02T06:30:00+07:00", 7.6, 30, 24),
    ]), "month");
    expect(result.periods.map((period) => [period.period, period.missing, period.ph.count])).toEqual([["2026-08", false, 2], ["2026-09", true, 0], ["2026-10", false, 1]]);
    expect(result.periods[0]).toMatchObject({ from: "2026-08-15", to: "2026-08-31", ph: { average: 8.2, minimum: 8, maximum: 8.4 }, salinity: { average: 27 }, temperature: { average: 26 } });
    expect(result.periods[2].to).toBe("2026-10-20");
    expect(result.thresholds.temperatureMax).toBe(32);
  });

  it("builds one period per day and keeps a late-night reading on its Vietnam day", () => {
    const result = aggregateWaterChart(chart("2026-11-01", "2026-11-03", [point("2026-11-01T23:50:00+07:00", 8, 27, 26)]), "day");
    expect(result.periods.map((period) => [period.period, period.missing])).toEqual([["2026-11-01", false], ["2026-11-02", true], ["2026-11-03", true]]);
    expect(result.periods[1].ph).toEqual({ average: null, minimum: null, maximum: null, count: 0 });
  });

  it("returns no periods for an inverted range", () => {
    expect(aggregateWaterChart(chart("2026-11-03", "2026-11-01", []), "day").periods).toEqual([]);
  });
});
