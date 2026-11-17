import { describe, expect, it } from "vitest";
import { farmingStepLink } from "./entity-links";

describe("farmingStepLink", () => {
  it("preserves the same zone, raft and cycle at each workflow step", () => {
    const ref = { zoneId: "zone-1", raftId: "raft-2", cycleId: "cycle-3" };
    for (const step of ["cycle", "seeding", "material", "harvest"] as const) {
      const url = new URL(farmingStepLink(step, ref), "https://omts.example");
      expect(Object.fromEntries(url.searchParams)).toEqual(ref);
    }
  });
  it("omits an unknown cycle without losing the raft", () => {
    expect(farmingStepLink("harvest", { zoneId: "z", raftId: "r" })).toBe("/operations/harvest?zoneId=z&raftId=r");
  });
});
