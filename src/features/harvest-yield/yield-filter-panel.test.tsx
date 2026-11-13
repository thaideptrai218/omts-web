// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { YieldFilterPanel } from "./yield-filter-panel";

afterEach(cleanup);
it("uses fixed grouping pills and an extensible zone picker while preserving multi-zone filtering", () => {
  const change = vi.fn();
  render(<YieldFilterPanel filters={{ from: "2026-11-01", to: "2026-11-30", groupBy: "Raft", zoneIds: ["v1"] }} zones={[{ id: "v1", label: "Vùng 1" }, { id: "v2", label: "Vùng 2" }]} zonesLoading={false} problem={null} busy={false} onChange={change} onApply={() => {}} onReset={() => {}} onReloadZones={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: "Chu kỳ" }));
  expect(change).toHaveBeenLastCalledWith({ groupBy: "Cycle" });
  fireEvent.change(screen.getByRole("combobox", { name: "Thêm vùng nuôi vào bộ lọc" }), { target: { value: "v2" } });
  expect(change).toHaveBeenLastCalledWith({ zoneIds: ["v1", "v2"] });
  fireEvent.click(screen.getByRole("button", { name: "Bỏ lọc vùng Vùng 1" }));
  expect(change).toHaveBeenLastCalledWith({ zoneIds: [] });
  expect(screen.queryByRole("checkbox")).toBeNull();
});
