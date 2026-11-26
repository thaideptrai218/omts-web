import { expect, it } from "vitest";
import { waitingForOwner } from "./owner-handed-over-plans";

const row = (statusId: number, executor: "Owner" | "ZoneManager", linesDone: number, lines = 2) => ({ statusId, executor, progress: { lines, linesDone, lanes: 0, lanesHarvested: 0, lanesSkipped: 0 } });

it("waits for the Owner on a handed over plan, or on his own plan once every line is done", () => {
  expect(waitingForOwner(row(4207, "ZoneManager", 2))).toBe(true);
  expect(waitingForOwner(row(4203, "Owner", 2))).toBe(true);
  expect(waitingForOwner(row(4203, "Owner", 1))).toBe(false);
  expect(waitingForOwner(row(4203, "ZoneManager", 2))).toBe(false);
  expect(waitingForOwner(row(4202, "Owner", 2))).toBe(false);
});
