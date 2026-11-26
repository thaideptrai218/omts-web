import { expect, it } from "vitest";
import { indicatorRange, outsideIndicators, thresholdsLine } from "./zone-water-model";

it("writes the thresholds in force on one line with units", () => {
  expect(thresholdsLine({ phMin: 7.51, phMax: 8.5, salinityMin: 18, salinityMax: 32, temperatureMin: 10, temperatureMax: 32 })).toBe("pH 7,51–8,5 · Độ mặn 18–32 ‰ · Nhiệt độ 10–32 °C");
});
it("handles one-sided and missing thresholds", () => {
  expect(thresholdsLine({ phMin: 7, phMax: null, salinityMin: null, salinityMax: 30, temperatureMin: null, temperatureMax: null })).toBe("pH ≥ 7 · Độ mặn ≤ 30 ‰ · Nhiệt độ chưa đặt");
});
it("tells which indicators are outside, whatever the casing", () => {
  expect(outsideIndicators([{ indicator: "pH" }, { indicator: "TEMPERATURE" }])).toEqual({ ph: true, salinity: false, temperature: true });
  expect(outsideIndicators([])).toEqual({ ph: false, salinity: false, temperature: false });
});
it("gives one indicator range with its unit, or nothing when it is not set", () => {
  const limits = { phMin: 7.51, phMax: 8.5, salinityMin: 18, salinityMax: 32, temperatureMin: null, temperatureMax: null };
  expect(indicatorRange(limits, "ph")).toBe("7,51–8,5");
  expect(indicatorRange(limits, "salinity")).toBe("18–32 ‰");
  expect(indicatorRange(limits, "temperature")).toBeUndefined();
});
