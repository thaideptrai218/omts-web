// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ detail: vi.fn(), save: vi.fn(), allowed: true }));
vi.mock("./service", () => ({ nurseryService: mocks }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: {}, permissions: { functionPermissions: [] } }) }));
vi.mock("@/features/operations/permissions", () => ({ operationAllowed: () => mocks.allowed }));
import { nurseryDetailSchema, type NurseryDetail } from "./contracts";
import { NurseryDetailPanel } from "./nursery-detail-panel";

const batch = nurseryDetailSchema.parse({ id: "n", code: "NU01", zoneId: "z", zoneCode: "KV01", zoneName: "Vùng 1", quantityIn: 1000,
  startDate: "2026-11-01", daysNursing: 13, statusId: 4002, status: "Completed", rowVersion: "v1", canCorrectSurvivors: true, survivors: 900,
  seeded: 400, remaining: 500, seedLot: { id: "lot", code: "PN1-1", itemName: "Giống hàu", unit: "con" },
  usage: [{ raftId: "r", raftCode: "B1-06", cycleId: "c", seeded: 400, lastSeedingOn: "2026-11-12" }] });
afterEach(() => { cleanup(); vi.clearAllMocks(); mocks.allowed = true; });
function mount(record: NurseryDetail) {
  mocks.detail.mockResolvedValue({ status: "success", data: record });
  render(<NurseryDetailPanel id="n" zoneId="z" onChanged={vi.fn()} onComplete={vi.fn()} onCorrect={vi.fn()}
    guard={{ dirty: { current: false }, pending: { current: false }, leave: vi.fn(), dialog: undefined }} />);
}
describe("nursery detail V2", () => {
  it("shows inventory and usage with journey/seeding links, without a transfer tab", async () => {
    mount(batch);
    expect(await screen.findByText("Vùng ươm: KV01 · Vùng 1")).toBeTruthy();
    const inventory = screen.getByRole("region", { name: "Kho ươm" });
    expect(inventory.textContent).toContain("Đã thả400 mảnh");
    expect(inventory.textContent).toContain("Còn lại500 mảnh");
    expect(inventory.textContent).toContain("Đã thả 400 mảnh / 900 mảnh (44,4%)");
    expect(inventory.textContent).toContain("Hao hụt*: 100 mảnh · 10%");
    expect(screen.getByRole("list", { name: "Các bè dùng giống" }).textContent).toContain("Đã thả 400 mảnh");
    expect(screen.getByRole("link", { name: "B1-06" }).getAttribute("href")).toContain("/farming/rafts?");
    expect(screen.getByRole("link", { name: "Hành trình" }).getAttribute("href")).toContain("tab=cycles");
    expect(screen.getByRole("link", { name: "Lần thả giống" }).getAttribute("href")).toContain("/operations/seeding?");
    // The next step of a batch waiting in the pool: start a cycle on a raft with this batch chosen.
    expect(screen.getByRole("link", { name: "Thả giống" }).getAttribute("href")).toBe("/farming/rafts?nurseryBatch=n");
    // The lot opens on the Lô giống screen by its code, and "Còn trong kho" names what is still in stock.
    expect(screen.getByRole("link", { name: "PN1-1" }).getAttribute("href")).toBe("/farming/seed-lots?code=PN1-1");
    expect(screen.getByText("Còn trong kho (chưa ươm)")).toBeTruthy();
    expect(screen.queryByRole("tab", { name: /chuyển|phân bổ/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Xóa đợt ươm" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Hoàn tất ươm" })).toBeNull();
  });
  it("puts quantities first, shows days in the header and leaves out optional rows without a value", async () => {
    mount(batch);
    expect(await screen.findByText(/Bắt đầu 01\/11\/2026 · đã ươm 13 ngày/)).toBeTruthy();
    const regions = screen.getAllByRole("region").map(region => region.getAttribute("aria-label"));
    expect(regions.indexOf("Kho ươm")).toBeLessThan(regions.indexOf("Thông tin đợt ươm"));
    expect(screen.queryByText("Phiếu xuất dùng")).toBeNull();
    expect(screen.queryByText("Ghi chú")).toBeNull();
    expect(screen.queryByText("Người phụ trách")).toBeNull();
    expect(screen.queryByText("Mã đợt ươm")).toBeNull();
  });
  it.each([0, 500])("keeps survivor correction and only offers closing when inventory remains: %s", async remaining => {
    mount({ ...batch, remaining });
    expect(await screen.findByRole("button", { name: /Sửa số sống sót/ })).toBeTruthy();
    expect(!!screen.queryByRole("button", { name: "Đóng đợt ươm" })).toBe(remaining > 0);
  });
  it("hides write actions after closing and includes closing loss in total estimated loss", async () => {
    mount({ ...batch, statusId: 4004, remaining: 0, closedOn: "2026-11-13", closeLossPieces: 500 });
    expect(await screen.findByText("Đã đóng")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Sửa số sống sót|Đóng đợt ươm|Chỉnh sửa|Hoàn tất ươm|Xóa đợt ươm/ })).toBeNull();
    const inventory = within(screen.getByRole("region", { name: "Kho ươm" }));
    expect(inventory.getByText(/Hao hụt\*: 600 mảnh · 60%/).textContent).toContain("gồm 500 mảnh ghi hao hụt khi đóng đợt");
    expect(screen.queryByRole("link", { name: "Thả giống" })).toBeNull();
  });
  it("only offers edit, completion and deletion while nursing", async () => {
    mount({ ...batch, statusId: 4001, canEdit: true, canComplete: true });
    expect(await screen.findByRole("button", { name: "Chỉnh sửa" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Hoàn tất ươm" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Xóa đợt ươm" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Sửa số sống sót|Đóng đợt ươm/ })).toBeNull();
  });
  it("hides write actions without edit permission", async () => {
    mocks.allowed = false; mount(batch);
    await screen.findByText("Kho ươm");
    expect(screen.queryByRole("button", { name: /Sửa số sống sót|Đóng đợt ươm/ })).toBeNull();
  });
});
