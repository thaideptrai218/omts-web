// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { nurseryDetailSchema } from "./contracts";
import { NurseryCloseDialog } from "./nursery-close-dialog";

const save = vi.hoisted(() => vi.fn());
vi.mock("./service", () => ({ nurseryService: { save } }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ children, title, onOpenChange }: { children: ReactNode; title: string; onOpenChange(open: boolean): void }) =>
  <section role="dialog" aria-label={title}><button type="button" aria-label="Đóng hộp thoại" onClick={() => onOpenChange(false)}>×</button>{children}</section> }));
const batch = nurseryDetailSchema.parse({ id: "n", code: "NU01", zoneId: "z", zoneCode: "KV01", zoneName: "Vùng 1", quantityIn: 1000,
  startDate: "2026-11-01", daysNursing: 13, statusId: 4002, status: "Completed", rowVersion: "v1", survivors: 900, seeded: 400, remaining: 500,
  seedLot: { id: "lot", code: "PN1-1", itemName: "Giống hàu", unit: "con" } });
afterEach(() => { cleanup(); vi.clearAllMocks(); });
function mount() {
  const onClose = vi.fn(), onSaved = vi.fn();
  render(<NurseryCloseDialog batch={batch} onClose={onClose} onSaved={onSaved}
    guard={{ dirty: { current: false }, pending: { current: false }, leave: vi.fn(), dialog: undefined }} />);
  return { onClose, onSaved };
}
describe("đóng đợt ươm", () => {
  it("shows estimated remaining loss and sends optional reason only on confirmation", async () => {
    save.mockResolvedValue({ status: "success", data: { ...batch, statusId: 4004 } });
    const { onSaved } = mount();
    expect(screen.getByText(/500 mảnh còn lại sẽ ghi là hao hụt \(ước tính\)/)).toBeTruthy();
    expect(save).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole("textbox", { name: "Lý do (tùy chọn)" }), { target: { value: "  Kết thúc đợt  " } });
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận đóng đợt ươm" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(save).toHaveBeenCalledWith("close", "z", { reason: "Kết thúc đợt", rowVersion: "v1" }, "n");
  });
  it("allows an empty reason and closes through the x button", async () => {
    save.mockResolvedValue({ status: "success", data: batch });
    const { onClose, onSaved } = mount();
    fireEvent.click(screen.getByRole("button", { name: "Đóng hộp thoại" }));
    expect(onClose).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận đóng đợt ươm" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(save).toHaveBeenCalledWith("close", "z", { rowVersion: "v1" }, "n");
  });
  it("retains the dialog and blocks repeat writes after an uncertain failure", async () => {
    save.mockResolvedValue({ status: "error", httpStatus: 0, uncertain: true });
    const { onSaved } = mount();
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận đóng đợt ươm" }));
    await screen.findByText(/Đóng hộp thoại và tải lại/);
    expect((screen.getByRole("button", { name: "Xác nhận đóng đợt ươm" }) as HTMLButtonElement).disabled).toBe(true);
    expect(onSaved).not.toHaveBeenCalled();
  });
});
