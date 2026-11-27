import { describe, expect, it } from "vitest";
import { farmingStepLink } from "./entity-links";

describe("farmingStepLink", () => {
  it("preserves the same zone, raft and cycle at each workflow step", () => {
    const ref = { zoneId: "zone-1", raftId: "raft-2", cycleId: "cycle-3" };
    for (const step of ["seeding", "material", "harvest"] as const) {
      const url = new URL(farmingStepLink(step, ref), "https://omts.example");
      expect(Object.fromEntries(url.searchParams)).toEqual(ref);
    }
  });
  it("sends the cycle step to its raft, opened on the Chu kỳ nuôi tab", () => {
    const url = new URL(farmingStepLink("cycle", { zoneId: "zone-1", raftId: "raft-2", cycleId: "cycle-3" }), "https://omts.example");
    expect(url.pathname).toBe("/farming/rafts");
    expect(Object.fromEntries(url.searchParams)).toEqual({ zoneId: "zone-1", recordId: "raft-2", tab: "cycles" });
  });
  it("omits an unknown cycle without losing the raft", () => {
    expect(farmingStepLink("harvest", { zoneId: "z", raftId: "r" })).toBe("/operations/harvest?zoneId=z&raftId=r");
  });
});
