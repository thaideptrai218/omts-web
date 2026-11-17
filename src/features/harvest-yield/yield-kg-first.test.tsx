// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import type { HarvestYieldReport } from "./contracts";
import { YieldKpiStrip } from "./yield-kpi-strip";
import { YieldTable } from "./yield-table";
import { kpisOf } from "./yield-summary-model";

afterEach(cleanup);
const group = (over: object) => ({ key: "g1", label: "Bè B1", zoneId: "z", zoneCode: "V01", cycleStatus: "Closed", lotCount: 1, estimatedKg: 250, soldKg: 100, lostKg: 0, differenceKg: 0, notFinal: false, lots: [], ...over }) as unknown as HarvestYieldReport["groups"][number];

describe("yield screen is kg-first without loss wording", () => {
  it("KPI strip shows cages, estimated and sold kg, kg per cage and the delta against the previous period", () => {
    const current = kpisOf([group({ lotCount: 2, estimatedKg: 600, soldKg: 180, harvestedCages: 12, availableKg: 420 })]);
    const before = kpisOf([group({ lotCount: 1, estimatedKg: 400, soldKg: 180, harvestedCages: 8, availableKg: 220 })]);
    render(<YieldKpiStrip kpis={current} previous={before} />);
    const strip = screen.getByLabelText("Chỉ số chính của báo cáo");
    expect(within(strip).getByText("12 lồng")).toBeTruthy();
    expect(within(strip).getByText("600 kg")).toBeTruthy();
    expect(within(strip).getByText("50 kg/lồng")).toBeTruthy();
    expect(within(strip).getAllByText(/▲ 50%/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Hao hụt|Chênh lệch/)).toBeNull();
  });
  it("shows the percent of target bar and the remaining kg when the API returns them", () => {
    render(<YieldTable groups={[group({ targetYieldKg: 1000, availableKg: 150, harvestedCages: 5 })]} sort={{ key: "label", dir: "asc" }} showZone={false} onSort={() => {}} />);
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("25");
    expect(screen.getByText("150 kg")).toBeTruthy();
    expect(screen.getByText("5 lồng")).toBeTruthy();
    // The nursery loss column is a nursery figure, not harvest loss wording.
    expect(screen.queryByText(/Hao hụt(?! ươm)|Chênh lệch/)).toBeNull();
  });
  it("shows a dash instead of an invented number when the target or remaining kg are missing", () => {
    render(<YieldTable groups={[group({})]} sort={{ key: "label", dir: "asc" }} showZone={false} onSort={() => {}} />);
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.getByText("Chưa đặt mục tiêu")).toBeTruthy();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2);
  });
});
