// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { LaneBoard } from "./lane-board";
import { harvestLane, laneState } from "./records-contracts";
import { laneIsUnavailable } from "./lane-availability";
afterEach(cleanup);
it("parses legacy lanes and optional incident fields including OutOfService", () => {
  expect(harvestLane.safeParse({ laneNumber: 1, canHarvest: true }).success).toBe(true);
  expect(harvestLane.parse({ laneNumber: 2, canHarvest: false, state: "OutOfService", isDamaged: true, lineLengthM: 18 }).state).toBe("OutOfService");
  expect(laneState.parse("OutOfService")).toBe("OutOfService");
  expect(laneState.parse(4)).toBe(4);
});
it("uses the same incident exclusion for seeding and keeps history visible on the lane board", () => {
  for (const lane of [{ isDamaged: true }, { statusId: 2002 }, { isOutOfService: true }, { state: "OutOfService" }, { state: 4 }]) expect(laneIsUnavailable(lane)).toBe(true);
  expect(laneIsUnavailable({})).toBe(false);
  render(<LaneBoard lanes={[{ laneNumber: 7, state: "OutOfService", isDamaged: true, statusId: 2002 }]} onSelect={vi.fn()} />);
  // The lane stays on the board (history is not hidden) as an out-of-service column; the incident wins over "damaged".
  const column = screen.getByRole("button", { name: /^Làn 7: Ngừng hoạt động · / });
  expect(column.getAttribute("type")).toBe("button");
  expect(column.getAttribute("data-state")).toBe("OutOfService");
  expect(within(column).getByText("Ngừng hoạt động")).toBeTruthy();
});
