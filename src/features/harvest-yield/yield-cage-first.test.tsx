// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import type { HarvestYieldReport } from "./contracts";
import { YieldTable } from "./yield-table";
import { YieldTotalsStrip } from "./yield-totals-strip";
import { approxCagesText } from "./yield-quantity";

afterEach(cleanup);
const report: HarvestYieldReport = {
  from: "2026-10-01", to: "2026-10-31", groupBy: "Raft", groups: [], message: null, messageCode: null, notFinalNotice: null, notFinalNoticeCode: null,
  totals: { lotCount: 2, estimatedKg: 600, soldKg: 180, lostKg: 0, differenceKg: -25, notFinal: false },
};

describe("harvest yield is cage-first when a kg/lồng ratio is readable", () => {
  it("leads the totals strip with approximate cages and keeps exact kg underneath", () => {
    render(<YieldTotalsStrip report={report} kgPerCage={50} />);
    const strip = screen.getByLabelText("Tổng của báo cáo");
    expect(within(strip).getByText("≈ 12 lồng")).toBeTruthy(); expect(within(strip).getByText("600 kg")).toBeTruthy();
    expect(within(strip).getByText("≈ 3,6 lồng")).toBeTruthy(); expect(within(strip).getByText("180 kg")).toBeTruthy();
    expect(within(strip).getByText("≈ −0,5 lồng")).toBeTruthy();
  });
  it("shows kg alone and says why when no ratio is available", () => {
    render(<YieldTotalsStrip report={report} />);
    const strip = screen.getByLabelText("Tổng của báo cáo");
    expect(within(strip).getByText("600 kg")).toBeTruthy(); expect(within(strip).queryByText(/lồng/)).toBeNull();
    expect(screen.getByText(/chưa có tỷ lệ kg\/lồng/)).toBeTruthy();
  });
  it("renders group rows with cages and exact kg", () => {
    const group = { key: "g1", label: "Bè B1", zoneCode: "V01", cycleStatus: "Closed", lotCount: 1, estimatedKg: 600, soldKg: 180, lostKg: 0, differenceKg: 420, notFinal: false, lots: [] } as unknown as HarvestYieldReport["groups"][number];
    render(<YieldTable groups={[group]} sort={{ key: "label", dir: "asc" }} showZone={false} kgPerCage={50} onSort={() => {}} />);
    expect(screen.getByText("≈ 12 lồng")).toBeTruthy(); expect(screen.getByText("600 kg")).toBeTruthy(); expect(screen.getByText("≈ 8,4 lồng")).toBeTruthy();
  });
  it("signs negative differences", () => {
    expect(approxCagesText(-25, 50)).toBe("≈ −0,5 lồng"); expect(approxCagesText(25, undefined)).toBeUndefined();
  });
});
