// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LaneBoard } from "./lane-board";
afterEach(cleanup);
it("keeps numeric and named API lane states readable and selects the exact lane", () => {
  const select = vi.fn();
  render(<LaneBoard lanes={[{ laneNumber: 1, state: 0 }, { laneNumber: 4, state: "BeingHarvested" }, { laneNumber: 7, state: 3 }]} selected={4} onSelect={select} />);
  expect(screen.getByRole("button", { name: "Làn 1: Chưa thả · Đã thả 0% · Đã thu 0%" })).toBeTruthy();
  expect(screen.getByRole("button", { name: /^Làn 4: Đang thu · Đã thả 100% · Đã thu Chưa ghi %/ }).getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Làn 7: Đã thu · Đã thả 100% · Đã thu 100%" }));
  // The overview passes the click event as a second argument; the lane number stays the first.
  expect(select).toHaveBeenCalledWith(7, expect.anything());
});
