// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/toast-provider";

const { read, write, query } = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), query: new URLSearchParams("recordId=seed-11") }));
vi.mock("next/navigation", () => ({ useSearchParams: () => query }));
vi.mock("./records-shared", async importOriginal => {
  const original = await importOriginal<typeof import("./records-shared")>();
  return { ...original, seedRepo: { read, write }, useAllowed: () => () => true };
});
import { SeedingPanel } from "./records-seeding-panel";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("opens a referenced session beyond page one and editing never submits the new form", async () => {
  const records = Array.from({ length: 11 }, (_, index) => ({
    id: `seed-${index + 1}`, seedingDate: "2026-11-01", seedLot: { id: "lot", code: `PN${index + 1}-1`, unit: "mảnh", itemName: "Giống hàu", receiptCode: `PN${index + 1}`, supplierName: "NCC" },
    quantity: 20, laneNumbers: [1], recordedByName: "Owner", recordedAt: "2026-11-01T08:00:00+07:00", canCorrect: true, rowVersion: "one",
  }));
  read.mockImplementation((action: string) => Promise.resolve({ status: "success", data: action === "seed-lots" ? { lots: [] } : {
    records, lots: [], lanes: [], canRecord: true, laneCount: 1, seededCount: 1, seedingCompletedOn: null, canMarkComplete: false,
  } }));
  render(<ToastProvider><SeedingPanel zoneId="zone" raftId="raft" cycleId="cycle" /></ToastProvider>);
  const edit = await screen.findByRole("button", { name: "Chỉnh sửa lần thả giống" });
  expect(screen.getByRole("region", { name: "Chi tiết lần thả giống" })).toBeTruthy();
  fireEvent.click(edit);
  expect(await screen.findByRole("region", { name: "Bản ghi thả giống" })).toBeTruthy();
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByRole("button", { name: "Bỏ qua" }).getAttribute("type")).toBe("button");
  expect(screen.getByRole("button", { name: "Lưu" }).getAttribute("type")).toBe("submit");
  expect(write).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Bỏ qua" }));
  expect(await screen.findByRole("button", { name: "Chỉnh sửa lần thả giống" })).toBeTruthy();
  expect(write).not.toHaveBeenCalled();
});
