// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { WaterPeriodTable } from "./water-period-table";
import { WaterQualityChart } from "./water-quality-chart";
import { aggregateWaterChart } from "./water-chart-periods";

afterEach(cleanup);
const id = "00000000-0000-4000-8000-000000000001";
const thresholds = { phMin: 7.5, phMax: 8.5, salinityMin: 18, salinityMax: 32, temperatureMin: 15, temperatureMax: 32 };
const point = (measuredAt: string, ph: number, salinity: number, temperature: number) => ({ id, measuredAt, ph, salinity, temperature });
const chart = aggregateWaterChart({ zoneId: id, from: "2026-01-01", to: "2026-06-30", thresholds, points: [
  point("2026-01-10T08:00:00+07:00", 8, 25, 28), point("2026-01-20T08:00:00+07:00", 9, 27, 30), point("2026-06-12T08:00:00+07:00", 8.2, 27, 30)] }, "month");

it("draws pH, độ mặn and nhiệt độ with a screen-reader summary each, including the zone thresholds and periods outside them", () => {
  render(<WaterQualityChart data={chart} />);
  expect(screen.getByRole("img", { name: /^pH: trung bình 8,4, thấp nhất 8, cao nhất 9, từ Tháng 1\/2026 đến Tháng 6\/2026; ngưỡng vùng 7,5–8,5; 1 kỳ có lượt đo vượt ngưỡng\.$/ })).toBeTruthy();
  expect(screen.getByRole("img", { name: /^Độ mặn: .*ngưỡng vùng 18–32 ‰\.$/ })).toBeTruthy();
  expect(screen.getByRole("img", { name: /^Nhiệt độ: .*ngưỡng vùng 15–32 °C\.$/ })).toBeTruthy();
});

it("says so when the range has no measurement", () => {
  const empty = aggregateWaterChart({ zoneId: id, from: "2026-01-01", to: "2026-03-31", thresholds, points: [] }, "month");
  render(<WaterQualityChart data={empty} />);
  expect(screen.getByRole("status").textContent).toBe("Chưa có lượt đo trong khoảng này.");
});

it("lists only the periods with measurements, once the count, and one muted line for the empty stretch", () => {
  const { container } = render(<WaterPeriodTable data={chart} />);
  const table = within(container.querySelector("table")!);
  expect(table.getAllByRole("rowheader").map(cell => cell.textContent)).toEqual(["Tháng 1/2026", "Tháng 6/2026"]);
  expect(table.getAllByRole("columnheader").map(cell => cell.textContent)).toContain("Lượt đo");
  expect(container.textContent).toContain("Không có lượt đo từ 02/2026 đến 05/2026");
  expect(table.getAllByRole("row")[2].textContent).toContain("8,5");
});
