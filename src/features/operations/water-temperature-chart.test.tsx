// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { WaterQualityChart } from "./water-quality-chart";
import { aggregateWaterChart } from "./water-chart-periods";

afterEach(cleanup);
const id = "00000000-0000-4000-8000-000000000001";
const thresholds = { phMin: 7.5, phMax: 8.5, salinityMin: 18, salinityMax: 32, temperatureMin: 15, temperatureMax: 32 };
const chart = aggregateWaterChart({ zoneId: id, from: "2026-09-01", to: "2026-10-31", thresholds, points: [
  { id, measuredAt: "2026-09-10T08:00:00+07:00", ph: 8, salinity: 25, temperature: 28 }, { id, measuredAt: "2026-10-12T08:00:00+07:00", ph: 8.2, salinity: 27, temperature: 30 }] }, "month");

it("draws the temperature panel with its own thresholds beside pH and salinity", () => {
  render(<WaterQualityChart data={chart} />);
  expect(screen.getByRole("img", { name: /Nhiệt độ \(°C\): .* ngưỡng hiện tại 15 đến 32/ })).toBeTruthy();
  expect(screen.getByRole("img", { name: /Độ pH:/ })).toBeTruthy();
  expect(screen.getByRole("img", { name: /Độ mặn/ })).toBeTruthy();
  expect(screen.getByText("Nhiệt độ TB / thấp nhất / cao nhất (°C)")).toBeTruthy();
});
