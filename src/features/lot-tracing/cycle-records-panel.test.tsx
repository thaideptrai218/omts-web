// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/toast-provider";

const { read, write } = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn() }));
vi.mock("@/features/operations/repository", () => ({ createOperationsRepository: () => ({ read, write }) }));
import { CycleRecordsPanel } from "./cycle-records-panel";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("offers correction only after opening a row and edits it inline without submitting", async () => {
  const item = { id: "session", seedingDate: "2026-11-01", seedLot: { id: "lot", code: "PN000001-1", receiptCode: "PN000001", itemName: "Giống hàu", supplierName: "NCC" }, quantity: 20, laneNumbers: [1], lotCodes: [], rowVersion: "one" };
  read.mockImplementation((action: string) => Promise.resolve({ status: "success", data: action === "seed-lots" ? { lots: [] } : {
    raftCode: "B1", startDate: "2026-11-01", closeDate: null, cycleStatus: "Open", needsOwnerApproval: false,
    seedingRecords: [item], cultivationLogs: [], harvestLots: [],
  } }));
  render(<ToastProvider><CycleRecordsPanel cycleId="cycle" raftId="raft" /></ToastProvider>);
  const date = await screen.findByText("01/11/2026");
  expect(screen.queryByRole("button", { name: /Sửa phiên thả giống/ })).toBeNull();
  fireEvent.click(date);
  fireEvent.click(screen.getByRole("button", { name: /Sửa phiên thả giống/ }));
  expect(await screen.findByRole("region", { name: "Sửa phiên thả giống 01/11/2026" })).toBeTruthy();
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByRole("button", { name: "Bỏ qua" }).getAttribute("type")).toBe("button");
  expect(screen.getByRole("button", { name: "Xem lại thay đổi" }).getAttribute("type")).toBe("submit");
  expect(write).not.toHaveBeenCalled();
});
