import { describe, expect, it } from "vitest";
import { laneProgressDisplay } from "./lane-progress-display";

describe("laneProgressDisplay", () => {
  it.each([
    ["NotSeeded", 0, 0, "--omts-lane-empty"], ["Growing", 100, 0, "--omts-lane-growing"],
    ["Harvested", 100, 100, "--omts-lane-harvested"],
  ])("infers legacy % for %s", (state, seeded, harvested, token) => {
    const display = laneProgressDisplay({ laneNumber: 1, state });
    expect(display.seededPercent).toBe(seeded);
    expect(display.harvestedPercent).toBe(harvested);
    expect(display.colorToken).toBe(token);
    expect(display.inferred).toBe(true);
  });
  it("does not fabricate the amount of a partial legacy harvest", () => {
    expect(laneProgressDisplay({ laneNumber: 1, state: "BeingHarvested" })).toMatchObject({
      state: "BeingHarvested", seededPercent: 100, harvestedPercent: null, fillPercent: null, percentLabel: "Chưa ghi %",
    });
    expect(laneProgressDisplay({ laneNumber: 1, state: "BeingHarvested", seededPercent: 100, harvestedPercent: null })).toMatchObject({ state: "BeingHarvested", harvestedPercent: null, colorToken: "--omts-lane-harvesting" });
  });
  it("uses percentages ahead of old lifecycle labels, including explicit zero", () => {
    expect(laneProgressDisplay({ laneNumber: 1, state: "Harvested", seededPercent: 60, harvestedPercent: 0 })).toMatchObject({ state: "Growing", fillPercent: 60, percentLabel: "60%", inferred: false });
    expect(laneProgressDisplay({ laneNumber: 1, state: "Growing", seededPercent: 100, harvestedPercent: 35 })).toMatchObject({ state: "BeingHarvested", fillPercent: 35, colorToken: "--omts-lane-harvesting" });
    expect(laneProgressDisplay({ laneNumber: 1, state: "NotSeeded", seededPercent: 0, harvestedPercent: 0 }).state).toBe("NotSeeded");
    expect(laneProgressDisplay({ laneNumber: 1, harvestedPercent: 100 }).state).toBe("Harvested");
  });
  it("prioritizes physical incidents without discarding percentages", () => {
    expect(laneProgressDisplay({ laneNumber: 1, isDamaged: true, seededPercent: 40, harvestedPercent: 20 })).toMatchObject({ state: "Damaged", seededPercent: 40, harvestedPercent: 20, colorToken: "--omts-lane-damaged" });
    for (const incident of [{ isOutOfService: true }, { statusId: 2002 }, { state: "OutOfService" }])
      expect(laneProgressDisplay({ laneNumber: 1, isDamaged: true, ...incident }).state).toBe("OutOfService");
  });
  it("handles numeric states, unknown states and invalid display inputs safely", () => {
    expect(laneProgressDisplay({ laneNumber: 1, state: 3 }).state).toBe("Harvested");
    expect(laneProgressDisplay({ laneNumber: 1, state: "unknown" }).label).toBe("Đang sử dụng");
    expect(laneProgressDisplay({ laneNumber: 1, seededPercent: -10, harvestedPercent: 110 })).toMatchObject({ seededPercent: 0, harvestedPercent: 100 });
    expect(laneProgressDisplay({ laneNumber: 1, state: "Growing", seededPercent: NaN, harvestedPercent: Infinity })).toMatchObject({ seededPercent: 100, harvestedPercent: 0 });
    expect(laneProgressDisplay({ laneNumber: 1, seededPercent: 12.5, harvestedPercent: 0 }).percentLabel).toBe("12,5%");
  });
});
