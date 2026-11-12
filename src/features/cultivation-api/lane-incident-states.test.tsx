// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { HarvestLaneChoices } from "./harvest-lane-choices";
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
it("blocks damaged, discontinued and written-off harvest lanes even if a legacy flag says selectable", () => {
  const lanes = [{ laneNumber: 1, canHarvest: true, isDamaged: true }, { laneNumber: 2, canHarvest: true, statusId: 2002 }, { laneNumber: 3, canHarvest: true, isOutOfService: true }];
  render(<HarvestLaneChoices lanes={lanes} values={[]} label="Làn thu hoạch" onChange={vi.fn()} />);
  for (const input of screen.getAllByRole("checkbox")) expect((input as HTMLInputElement).disabled).toBe(true);
  expect(screen.getByText(/cần sửa trước khi thu hoạch/)).toBeTruthy();
  expect(screen.getByText("Làn đã ngừng hoạt động.")).toBeTruthy();
  expect(screen.getByText(/số làn không dùng lại/)).toBeTruthy();
});
it("uses the same incident exclusion for seeding and keeps history visible on the lane board", () => {
  for (const lane of [{ isDamaged: true }, { statusId: 2002 }, { isOutOfService: true }, { state: "OutOfService" }, { state: 4 }]) expect(laneIsUnavailable(lane)).toBe(true);
  expect(laneIsUnavailable({})).toBe(false);
  render(<LaneBoard lanes={[{ laneNumber: 7, state: "OutOfService", isDamaged: true, statusId: 2002 }]} onSelect={vi.fn()} />);
  expect(screen.getByRole("button", { name: "Làn 7 · Ngừng hoạt động · Hỏng" }).getAttribute("type")).toBe("button");
  expect(screen.getByText("Đã ngừng sử dụng")).toBeTruthy();
});
