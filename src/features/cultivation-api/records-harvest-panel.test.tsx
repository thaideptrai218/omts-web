// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
const read = vi.hoisted(() => vi.fn());
vi.mock("@/features/operations/repository", () => ({ createOperationsRepository: () => ({ read, write: vi.fn() }) }));
vi.mock("./records-shared", () => ({ harvestRepo: { read }, useAllowed: () => () => false }));
import { HarvestPanel } from "./records-harvest-panel";

afterEach(() => { cleanup(); vi.clearAllMocks(); });
const lot = (patch: object) => ({ id: "00000000-0000-4000-8000-000000000001", lotCode: "B1-LOT", harvestedAt: "2026-11-08T08:00:00+07:00", harvestDate: "2026-11-08", laneNumbers: [1], finishedLaneNumbers: [], cageCount: 12, kgPerCage: 50, estimatedKg: 600, invoicedKg: 180, remainingKg: 420, statusId: 1, status: "Open", rowVersion: "r", ...patch });

it("leads with the exact cage count and shows kg as the estimate", async () => {
  read.mockResolvedValue({ status: "success", data: { raftId: "00000000-0000-4000-8000-000000000002", raftCode: "B1", cycle: null, averageKgPerCage: 50, canRecordHarvest: false, lanes: [], lots: [lot({}), lot({ id: "00000000-0000-4000-8000-000000000003", lotCode: "B1-LOT2", cageCount: 4, estimatedKg: 200, invoicedKg: 0, remainingKg: 200 })] } });
  render(<HarvestPanel zoneId="z" raftId="r" />);
  expect(await screen.findByRole("columnheader", { name: "Số lồng thu hoạch" })).toBeTruthy();
  expect(screen.queryByRole("columnheader", { name: /Ước tính \(kg\)/ })).toBeNull();
  const row = screen.getByText("B1-LOT").closest("tr")!;
  expect(within(row).getByText("12 lồng")).toBeTruthy(); expect(within(row).getByText("≈ 600 kg")).toBeTruthy();
  expect(within(row).getByText("180 kg")).toBeTruthy(); expect(within(row).getByText("≈ 3,6 lồng")).toBeTruthy(); expect(within(row).getByText("≈ 8,4 lồng")).toBeTruthy();
  // Totals strip: 16 exact cages; invoiced 180 kg ≈ 3,6 lồng.
  expect(screen.getByText("16 lồng")).toBeTruthy();
});

it("does not report a partial kg-to-cage total when a lot has no usable ratio", async () => {
  read.mockResolvedValue({ status: "success", data: { raftId: "00000000-0000-4000-8000-000000000002", raftCode: "B1", cycle: null, averageKgPerCage: 50, canRecordHarvest: false, lanes: [], lots: [lot({}), lot({ id: "00000000-0000-4000-8000-000000000003", lotCode: "B1-LOT2", kgPerCage: 0, cageCount: 4, estimatedKg: 200, invoicedKg: 0, remainingKg: 200 })] } });
  render(<HarvestPanel zoneId="z" raftId="r" />);
  expect(await screen.findByRole("columnheader", { name: "Số lồng thu hoạch" })).toBeTruthy();
  expect(screen.getAllByText("Chưa đủ dữ liệu tỷ lệ quy đổi")).toHaveLength(2);
  expect(screen.queryByText("≈ 0 lồng")).toBeNull();
});
