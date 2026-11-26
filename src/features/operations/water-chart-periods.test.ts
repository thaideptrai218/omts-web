import { describe, expect, it } from "vitest";
import type { WaterChartRaw } from "./contracts";
import { aggregateWaterChart, defaultChartStart, gapText, periodOf, tableOfPeriods } from "./water-chart-periods";

const thresholds = { phMin: 7.5, phMax: 8.5, salinityMin: 18, salinityMax: 32, temperatureMin: 15, temperatureMax: 32 };
const id = "529ec3ce-af8f-42f7-a08f-4bab36ba7e62";
const point = (measuredAt: string, ph: number, salinity: number, temperature: number) => ({ id, measuredAt, ph, salinity, temperature });
const chart = (from: string, to: string, points: WaterChartRaw["points"]): WaterChartRaw => ({ zoneId: id, from, to, thresholds, points });

describe("water chart periods", () => {
  it("averages by local month and marks a month without data as missing", () => {
    const result = aggregateWaterChart(chart("2026-08-15", "2026-10-20", [
      point("2026-08-20T06:30:00+07:00", 8, 26, 25), point("2026-08-31T23:30:00+07:00", 8.4, 28, 27), point("2026-10-02T06:30:00+07:00", 7.6, 30, 24),
    ]), "month");
    expect(result.periods.map(period => [period.key, period.label, period.missing, period.count])).toEqual([
      ["2026-08", "Tháng 8/2026", false, 2], ["2026-09", "Tháng 9/2026", true, 0], ["2026-10", "Tháng 10/2026", false, 1]]);
    expect(result.periods[0]).toMatchObject({ from: "2026-08-15", to: "2026-08-31", ph: { average: 8.2, minimum: 8, maximum: 8.4 }, salinity: { average: 27 }, temperature: { average: 26 } });
    expect(result.periods[2].to).toBe("2026-10-20");
    expect(result.thresholds.temperatureMax).toBe(32);
  });

  it("groups by quarter, labelled Quý n/yyyy, and keeps a late-night reading on its Vietnam day", () => {
    const result = aggregateWaterChart(chart("2026-01-10", "2026-11-03", [
      point("2026-03-31T23:50:00+07:00", 8, 27, 26), point("2026-04-01T00:10:00+07:00", 8.2, 25, 28), point("2026-08-15T08:00:00+07:00", 7.8, 24, 30),
    ]), "quarter");
    expect(result.periods.map(period => [period.label, period.count])).toEqual([["Quý 1/2026", 1], ["Quý 2/2026", 1], ["Quý 3/2026", 1], ["Quý 4/2026", 0]]);
    expect(result.periods[0].from).toBe("2026-01-10");
    expect(result.periods[3].to).toBe("2026-11-03");
  });

  it("groups by year, labelled Năm yyyy", () => {
    const result = aggregateWaterChart(chart("2024-06-01", "2026-11-03", [point("2024-12-31T10:00:00+07:00", 8, 27, 26), point("2026-02-01T10:00:00+07:00", 8, 29, 28)]), "year");
    expect(result.periods.map(period => [period.label, period.count])).toEqual([["Năm 2024", 1], ["Năm 2025", 0], ["Năm 2026", 1]]);
  });

  it("returns no periods for an inverted range", () => {
    expect(aggregateWaterChart(chart("2026-11-03", "2026-11-01", []), "month").periods).toEqual([]);
  });

  it("labels a date by month, quarter and year", () => {
    expect(periodOf("2026-09-30", "month")).toMatchObject({ label: "Tháng 9/2026", tick: "09/2026" });
    expect(periodOf("2026-09-30", "quarter")).toMatchObject({ label: "Quý 3/2026", key: "2026-Q3" });
    expect(periodOf("2026-09-30", "year")).toMatchObject({ label: "Năm 2026", tick: "2026" });
  });

  it("looks back 12 months, 8 quarters or 5 years when no start is chosen", () => {
    expect(defaultChartStart("2026-11-27", "month")).toBe("2025-11-27");
    expect(defaultChartStart("2026-11-27", "quarter")).toBe("2024-11-27");
    expect(defaultChartStart("2026-11-27", "year")).toBe("2021-11-27");
  });
});

describe("period table", () => {
  const periods = aggregateWaterChart(chart("2025-10-01", "2026-11-30", [
    point("2025-10-05T08:00:00+07:00", 8, 27, 26), point("2025-11-05T08:00:00+07:00", 8, 27, 26), point("2026-10-05T08:00:00+07:00", 8, 27, 26), point("2026-11-05T08:00:00+07:00", 8, 27, 26),
  ]), "month").periods;

  it("hides periods without measurements and explains the gap in one line", () => {
    const { rows, gaps } = tableOfPeriods(periods);
    expect(rows.map(row => row.label)).toEqual(["Tháng 10/2025", "Tháng 11/2025", "Tháng 10/2026", "Tháng 11/2026"]);
    expect(gaps).toEqual([{ from: "12/2025", to: "09/2026" }]);
    expect(gapText(gaps)).toBe("Không có lượt đo từ 12/2025 đến 09/2026");
  });

  it("says nothing when every period has measurements, and names a single empty period", () => {
    expect(gapText(tableOfPeriods(periods.filter(period => !period.missing)).gaps)).toBe("");
    expect(gapText([{ from: "05/2026", to: "05/2026" }])).toBe("Không có lượt đo trong 05/2026");
  });
});
