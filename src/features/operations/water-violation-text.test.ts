import { describe, expect, it } from "vitest";
import { measurementViolationLine, violationSentence, violationsAgainst, violationsFromOutside, violationsFromText } from "./water-violation-text";

const none = { phMin: null, phMax: null, salinityMin: null, salinityMax: null, temperatureMin: null, temperatureMax: null };
const limits = { phMin: 7.51, phMax: 8.5, salinityMin: 18, salinityMax: 32, temperatureMin: 10, temperatureMax: 32 };
const FULL = "Vượt ngưỡng: pH 14 cao hơn mức cho phép 8,5 · Độ mặn 10 ‰ thấp hơn mức cho phép 18 ‰ · Nhiệt độ 40 °C cao hơn mức cho phép 32 °C";

describe("Vietnamese threshold-violation text", () => {
  it("builds the sentence from structured values outside, with units and vi-VN numbers", () => {
    const outside = violationsFromOutside([
      { indicator: "pH", value: 14, unit: null, direction: "High", min: 7.51, max: 8.5 },
      { indicator: "Salinity", value: 10, unit: "‰", direction: "Low", min: 18, max: 32 },
      { indicator: "Temperature", value: 40, unit: "°C", direction: "High", min: 10, max: 32 }]);
    expect(violationSentence(outside)).toBe(FULL);
  });
  it("maps the backend English sentence when only the string exists, and never echoes it", () => {
    const text = "pH 14.00 > 8.50; Salinity 10.00 < 18.00; Temperature 40.00 > 32.00";
    const line = measurementViolationLine({ ph: 14, salinity: 10, temperature: 40, thresholdsUsed: none, violatedValues: text });
    expect(line).toBe(FULL);
    expect(line).not.toMatch(/Salinity|Temperature|>|</);
    expect(violationsFromText("something odd")).toEqual([]);
    expect(measurementViolationLine({ ph: 7, salinity: 20, temperature: 20, thresholdsUsed: none, violatedValues: "something odd" })).toBe("Vượt ngưỡng");
  });
  it("derives the violations of a detail record from the limits it was judged with", () => {
    const line = measurementViolationLine({ ph: 9, salinity: 25, temperature: 5, thresholdsUsed: limits, violatedValues: "pH 9.00 > 8.50; Temperature 5.00 < 10.00" });
    expect(line).toBe("Vượt ngưỡng: pH 9 cao hơn mức cho phép 8,5 · Nhiệt độ 5 °C thấp hơn mức cho phép 10 °C");
  });
  it("judges nothing without a limit and says nothing for a clean measurement", () => {
    expect(violationsAgainst({ ph: 14, salinity: null, temperature: 40 }, none)).toEqual([]);
    expect(measurementViolationLine({ ph: 8, salinity: 25, temperature: 20, thresholdsUsed: limits, violatedValues: null })).toBe("");
    expect(violationsAgainst({ ph: 8.5, salinity: 18, temperature: 32 }, limits)).toEqual([]);
  });
});
