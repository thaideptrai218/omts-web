// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { WaterPeriodTable } from "./water-period-table";
import { WaterKpiCards } from "./water-kpi-cards";
import { chartRows, kpiOf, kpiSummary } from "./water-chart-model";
import { aggregateWaterChart } from "./water-chart-periods";

afterEach(cleanup);
const id = "00000000-0000-4000-8000-000000000001";
const thresholds = { phMin: 7.5, phMax: 8.5, salinityMin: 18, salinityMax: 32, temperatureMin: 15, temperatureMax: 32 };
const point = (measuredAt: string, ph: number, salinity: number, temperature: number) => ({ id, measuredAt, ph, salinity, temperature });
const raw = (points: ReturnType<typeof point>[], to = "2026-06-30") => ({ zoneId: id, from: "2026-01-01", to, thresholds, points });
// January: pH 8 and 9 (one reading beyond 8,5); June: pH 9,2, so the newest period average is outside the threshold.
const chart = aggregateWaterChart(raw([point("2026-01-10T08:00:00+07:00", 8, 25, 28), point("2026-01-20T08:00:00+07:00", 9, 27, 30), point("2026-06-12T08:00:00+07:00", 9.2, 27, 30)]), "month");

it("gives each card the latest period average, the range average and the thresholds; a latest value beyond them is flagged", () => {
  const { container } = render(<WaterKpiCards data={chart} />);
  const ph = within(screen.getByRole("region", { name: "pH" }));
  expect(ph.getByText("9,2").getAttribute("data-outside")).toBe("true");
  expect(ph.getByText("Vượt ngưỡng")).toBeTruthy();
  expect(ph.getByText("TB kỳ chọn 8,73 · ngưỡng 7,5–8,5")).toBeTruthy();
  const salinity = within(screen.getByRole("region", { name: "Độ mặn (‰)" }));
  expect(salinity.getByText("27").getAttribute("data-outside")).toBeNull();
  expect(salinity.queryByText("Vượt ngưỡng")).toBeNull();
  expect(salinity.getByText("TB kỳ chọn 26,33 · ngưỡng 18–32 ‰")).toBeTruthy();
  expect(screen.getByRole("region", { name: "Nhiệt độ (°C)" })).toBeTruthy();
  expect(container.querySelectorAll("[role=img]").length).toBe(3);
});

it("describes each card for a screen reader", () => {
  render(<WaterKpiCards data={chart} />);
  expect(screen.getByRole("img", { name: "pH: trung bình kỳ mới nhất 9,2, ngưỡng 7,5 đến 8,5, 2 kỳ vượt ngưỡng." })).toBeTruthy();
  expect(kpiSummary(chart, "salinity")).toBe("Độ mặn: trung bình kỳ mới nhất 27 ‰, ngưỡng 18 đến 32 ‰.");
});

it("finds the latest measured period even when the range ends in an empty one, and marks a lone period for the sparkline", () => {
  const trailing = aggregateWaterChart(raw([point("2026-01-10T08:00:00+07:00", 8, 25, 28)], "2026-03-31"), "month");
  expect(kpiOf(trailing, "ph")).toMatchObject({ latest: 8, latestLabel: "Tháng 1/2026", latestOutside: false, outsidePeriods: 0 });
  expect(chartRows(trailing, "ph").map(row => row.isolated)).toEqual([true, false, false]);
});

it("says so when the range has no measurement", () => {
  render(<WaterKpiCards data={aggregateWaterChart(raw([], "2026-03-31"), "month")} />);
  expect(screen.getByRole("status").textContent).toBe("Chưa có lượt đo trong khoảng này.");
});

it("lists only the periods with measurements, the count once, and one muted line for the empty stretch", () => {
  const { container } = render(<WaterPeriodTable data={chart} />);
  const table = within(container.querySelector("table")!);
  expect(table.getAllByRole("rowheader").map(cell => cell.textContent)).toEqual(["Tháng 1/2026", "Tháng 6/2026"]);
  expect(table.getAllByRole("columnheader").map(cell => cell.textContent)).toContain("Lượt đo");
  expect(container.textContent).toContain("Không có lượt đo từ 02/2026 đến 05/2026");
});
