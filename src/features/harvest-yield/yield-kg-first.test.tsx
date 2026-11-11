// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import type { HarvestYieldReport } from "./contracts";
import { YieldTable } from "./yield-table";
import { YieldTotalsStrip } from "./yield-totals-strip";

afterEach(cleanup);
const report = {
  from: "2026-10-01", to: "2026-10-31", groupBy: "Raft", groups: [], message: null, messageCode: null, notFinalNotice: null, notFinalNoticeCode: null,
  totals: { lotCount: 2, estimatedKg: 600, soldKg: 180, lostKg: 0, differenceKg: -25, notFinal: false, harvestedCages: 12 },
} as HarvestYieldReport;
const group = (over: object) => ({ key: "g1", label: "Bè B1", zoneId: "z", zoneCode: "V01", cycleStatus: "Closed", lotCount: 1, estimatedKg: 250, soldKg: 100, lostKg: 0, differenceKg: 0, notFinal: false, lots: [], ...over }) as unknown as HarvestYieldReport["groups"][number];

describe("yield screen is kg-first without loss wording", () => {
  it("totals show cages, estimated kg and sold kg and never the dropped loss/difference columns", () => {
    render(<YieldTotalsStrip report={report} />);
    const strip = screen.getByLabelText("Tổng của báo cáo");
    expect(within(strip).getByText("12 lồng")).toBeTruthy();
    expect(within(strip).getByText("600 kg")).toBeTruthy();
    expect(within(strip).getByText("180 kg")).toBeTruthy();
    expect(screen.queryByText(/Hao hụt|Chênh lệch/)).toBeNull();
  });
  it("shows the percent of target bar and the remaining kg when the API returns them", () => {
    render(<YieldTable groups={[group({ targetYieldKg: 1000, availableKg: 150, harvestedCages: 5 })]} sort={{ key: "label", dir: "asc" }} showZone={false} onSort={() => {}} />);
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("25");
    expect(screen.getByText("150 kg")).toBeTruthy();
    expect(screen.getByText("5 lồng")).toBeTruthy();
    expect(screen.queryByText(/Hao hụt|Chênh lệch/)).toBeNull();
  });
  it("shows a dash instead of an invented number when the target or remaining kg are missing", () => {
    render(<YieldTable groups={[group({})]} sort={{ key: "label", dir: "asc" }} showZone={false} onSort={() => {}} />);
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.getByText("Chưa đặt mục tiêu")).toBeTruthy();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2);
  });
});
