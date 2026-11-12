// @vitest-environment jsdom
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const save = vi.hoisted(() => vi.fn());
vi.mock("./service", async importOriginal => ({ ...await importOriginal<typeof import("./service")>(), nurseryService: { save } }));
import { nurseryDetailSchema } from "./contracts";
import { NurseryEditForm, type NurseryEditGuard } from "./nursery-edit-form";

const batch = nurseryDetailSchema.parse({ id: "n", code: "NU01", zoneId: "z", zoneCode: "KV01", zoneName: "Vùng 1", quantityIn: 95000,
  startDate: "2026-11-01", daysNursing: 13, statusId: 4001, status: "Nursing", rowVersion: "v1", canEdit: true,
  seedLot: { id: "lot", code: "PN1-1", itemName: "Giống hàu", unit: "con" } });
afterEach(() => { cleanup(); vi.clearAllMocks(); });
function mount() {
  return render(<NurseryEditForm batch={batch} onClose={vi.fn()} onSaved={vi.fn()} onReload={vi.fn()} leaveRef={createRef<NurseryEditGuard>()}
    guard={{ dirty: { current: false }, pending: { current: false }, leave: vi.fn(), dialog: undefined }} />);
}
describe("nursery edit immutable zone and raw quantity", () => {
  it("shows the region as text and keeps typing, deletion and blur unchanged", () => {
    mount();
    expect(screen.getByText("KV01 · Vùng 1")).toBeTruthy();
    expect(screen.queryByRole("combobox", { name: /Vùng/ })).toBeNull();
    const input = screen.getByLabelText("Số mảnh vào ươm") as HTMLInputElement;
    for (const value of ["95000", "9500", "", "95,00", "95,"]) {
      fireEvent.change(input, { target: { value } });
      fireEvent.blur(input);
      expect(input.value).toBe(value);
    }
    expect(save).not.toHaveBeenCalled();
  });
  it("parses only when saving and never includes a replacement zone in the payload", async () => {
    save.mockResolvedValue({ status: "success", data: batch });
    mount();
    fireEvent.change(screen.getByLabelText("Số mảnh vào ươm"), { target: { value: "95000,50" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    await waitFor(() => expect(save).toHaveBeenCalled());
    const [action, zoneId, form] = save.mock.calls[0] as [string, string, FormData];
    expect(action).toBe("update"); expect(zoneId).toBe("z");
    expect(form.get("quantity")).toBe("95000.5");
    expect(form.has("zoneId")).toBe(false);
  });
});
