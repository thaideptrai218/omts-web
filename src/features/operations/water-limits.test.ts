import { describe, expect, it } from "vitest";
import { recordWaterSchema, setThresholdsSchema } from "./contracts";

const base = { raftId: "00000000-0000-4000-8000-000000000001", measuredAt: "2026-11-11T08:00:00+07:00", ph: 7.5, salinity: 25, temperature: 26, photoKey: "photo-key", clientOperationId: "00000000-0000-4000-8000-000000000002" };

describe("water ranges decided on 11/11/2026", () => {
  it("accepts the edges 50 ‰ and 45 °C and refuses anything above", () => {
    expect(recordWaterSchema.safeParse({ ...base, salinity: 50, temperature: 45 }).success).toBe(true);
    expect(recordWaterSchema.safeParse({ ...base, salinity: 50.01 }).success).toBe(false);
    expect(recordWaterSchema.safeParse({ ...base, temperature: 45.01 }).success).toBe(false);
  });
  it("applies the same ceilings to thresholds", () => {
    const thresholds = { phMin: 6, phMax: 8, salinityMin: 10, salinityMax: 50, temperatureMin: 20, temperatureMax: 45 };
    expect(setThresholdsSchema.safeParse(thresholds).success).toBe(true);
    expect(setThresholdsSchema.safeParse({ ...thresholds, salinityMax: 60 }).success).toBe(false);
    expect(setThresholdsSchema.safeParse({ ...thresholds, temperatureMax: 46 }).success).toBe(false);
  });
});
