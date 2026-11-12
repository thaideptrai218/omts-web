// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const detail = vi.hoisted(() => vi.fn());
vi.mock("./service", () => ({ nurseryService: { detail } }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: {}, permissions: { functionPermissions: [] } }) }));
vi.mock("@/features/operations/permissions", () => ({ operationAllowed: () => true }));
import { nurseryDetailSchema, type NurseryDetail } from "./contracts";
import { NurseryDetailPanel } from "./nursery-detail-panel";

const batch = nurseryDetailSchema.parse({ id: "n", code: "NU01", zoneId: "z", zoneCode: "KV01", zoneName: "Vùng 1", quantityIn: 1000,
  startDate: "2026-11-01", daysNursing: 13, statusId: 4002, status: "Completed", rowVersion: "v1", canCorrectSurvivors: true, survivors: 900,
  seedLot: { id: "lot", code: "PN1-1", itemName: "Giống hàu", unit: "con" },
  allocations: [{ id: "a", raftId: "r", raftCode: "B1-06", cycleId: "c", quantity: 900, seeded: 400, canChange: true }] });
afterEach(() => { cleanup(); vi.clearAllMocks(); });
function mount(record: NurseryDetail) {
  detail.mockResolvedValue({ status: "success", data: record });
  render(<NurseryDetailPanel id="n" zoneId="z" onChanged={vi.fn()} onComplete={vi.fn()} onCorrect={vi.fn()} onTransfer={vi.fn()}
    guard={{ dirty: { current: false }, pending: { current: false }, leave: vi.fn(), dialog: undefined }} />);
}
describe("nursery detail applicable actions", () => {
  it("keeps the zone visible and the raft and cultivation links in the compact received list", async () => {
    mount(batch);
    expect(await screen.findByText("Vùng ươm: KV01 · Vùng 1")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Xóa đợt ươm" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Hoàn tất ươm" })).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "Đã chuyển sang bè" }));
    expect(await screen.findByRole("button", { name: "Chuyển lại số mảnh giữa các bè" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "B1-06" }).getAttribute("href")).toContain("/farming/rafts?");
    expect(screen.getByRole("link", { name: "Xem nuôi trên bè" }).getAttribute("href")).toContain("cycleId=c");
    expect(screen.getByRole("list", { name: "Bè đã nhận" }).textContent).toContain("B1-06 · 900 mảnh · đã thả 400 mảnh");
  });
  it.each([true, false])("allows an increase after every raft has finished only if there are losses: %s", async canIncrease => {
    mount({ ...batch, survivors: canIncrease ? 900 : 1000, allocations: batch.allocations.map(row => ({ ...row, quantity: canIncrease ? 900 : 1000, canChange: false })) });
    await screen.findByText("Vùng ươm: KV01 · Vùng 1");
    expect(!!screen.queryByRole("button", { name: /Sửa số sống sót/ })).toBe(canIncrease);
    fireEvent.click(screen.getByRole("tab", { name: "Đã chuyển sang bè" }));
    await screen.findByRole("link", { name: "Xem đợt nuôi đã kết thúc" });
    expect(screen.queryByRole("button", { name: "Chuyển lại số mảnh giữa các bè" })).toBeNull();
  });
  it("hides transfer after every piece is seeded but retains correction", async () => {
    mount({ ...batch, allocations: batch.allocations.map(row => ({ ...row, seeded: row.quantity })) });
    expect(await screen.findByRole("button", { name: /Sửa số sống sót/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Đã chuyển sang bè" }));
    await waitFor(() => expect(screen.getByRole("tabpanel").getAttribute("aria-labelledby")).toContain("allocations"));
    expect(screen.queryByRole("button", { name: "Chuyển lại số mảnh giữa các bè" })).toBeNull();
  });
  it("retains survivor correction after a zero-survivor completion", async () => {
    mount({ ...batch, survivors: 0, allocations: [] });
    expect(await screen.findByRole("button", { name: /Sửa số sống sót/ })).toBeTruthy();
  });
});
