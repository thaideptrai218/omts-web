// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LaneBoard } from "./lane-board";
afterEach(cleanup);
it("keeps numeric and named API lane states readable and selects the exact lane", () => {
  const select = vi.fn();
  render(<LaneBoard lanes={[{ laneNumber: 1, state: 0 }, { laneNumber: 4, state: "BeingHarvested" }, { laneNumber: 7, state: 3 }]} selected={4} onSelect={select} />);
  expect(screen.getByRole("button", { name: "Làn 1 · Chưa thả giống" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Làn 4 · Đang thu hoạch" }).getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Làn 7 · Đã thu hoạch" }));
  expect(select).toHaveBeenCalledWith(7);
});
