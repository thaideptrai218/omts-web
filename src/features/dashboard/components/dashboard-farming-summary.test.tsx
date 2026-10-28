// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { DashboardFarmingSummaryPanel } from "./dashboard-farming-summary";
afterEach(cleanup);

it("explains the usage ratio using the supplied counts and preserves access to the raft directory", () => {
  render(
    <DashboardFarmingSummaryPanel
      summary={{
        activeRaftCount: 3,
        discontinuedRaftCount: 1,
        openCycleCount: 2,
      }}
    />,
  );
  expect(
    screen.getByRole("img", { name: "3 bè đang sử dụng, 1 bè đã ngừng" }),
  ).toBeTruthy();
  expect(screen.getByText("3 trong 4 bè đang được sử dụng")).toBeTruthy();
  expect(
    screen.getByRole("link", { name: "Xem danh sách bè" }).getAttribute("href"),
  ).toBe("/farming/rafts");
});
it("renders a real empty registry without division-by-zero or a made-up usage bar", () => {
  const view = render(
    <DashboardFarmingSummaryPanel
      summary={{
        activeRaftCount: 0,
        discontinuedRaftCount: 0,
        openCycleCount: 0,
      }}
    />,
  );
  expect(screen.queryByRole("img")).toBeNull();
  expect(screen.getAllByText("0")).toHaveLength(3);
  expect(view.container.textContent).not.toMatch(/NaN|Infinity/);
});
