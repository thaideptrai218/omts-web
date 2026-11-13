// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { completionBatch as batch } from "./nursery-completion-test-fixtures";
import { NurseryCompleteDialog } from "./nursery-complete-dialog";
import type { NurseryPhotoDraft } from "./nursery-photo-field";

const mocks = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock("./service", async importOriginal => {
  const original = await importOriginal<typeof import("./service")>();
  return { ...original, nurseryService: { ...original.nurseryService, save: mocks.save } };
});
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ children, title }: { children: ReactNode; title: string }) => <section role="dialog" aria-label={title}>{children}</section> }));
vi.mock("./nursery-photo-field", () => ({ NurseryPhotoField: ({ onChange }: { onChange(value: NurseryPhotoDraft[]): void }) =>
  <button type="button" onClick={() => onChange([{ file: new File(["photo"], "photo.png", { type: "image/png" }), preview: "" }])}>Thêm ảnh hiện trường</button> }));

const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
const enter = (name: string, value: string) => fireEvent.change(screen.getByRole("textbox", { name }), { target: { value } });
function mount(mode: "complete" | "survivors" = "complete", record = batch) {
  const onSaved = vi.fn();
  render(<NurseryCompleteDialog batch={record} mode={mode} onClose={vi.fn()} onSaved={onSaved} />);
  return onSaved;
}

beforeEach(() => { mocks.save.mockResolvedValue({ status: "success", data: batch }); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("hoàn tất ươm một bước nhập rồi xem lại", () => {
  it("không còn chọn bè, hiện hao hụt ước tính, chỉ gửi sau xem lại", async () => {
    const onSaved = mount();
    expect(screen.getByText("Bước 1/2 · Kết quả ươm")).toBeTruthy();
    expect(screen.getByText("DEMO-01 · Vùng ươm một")).toBeTruthy();
    enter("Số sống sót (ước tính)", "95"); click("Thêm ảnh hiện trường");
    expect(screen.getByText(/Hao hụt \(ước tính\): 5 mảnh/)).toBeTruthy();
    click("Tiếp tục");
    expect(screen.getByText("Bước 2/2 · Xem lại")).toBeTruthy();
    expect(screen.getByText("1 ảnh")).toBeTruthy();
    expect(mocks.save).not.toHaveBeenCalled();
    click("Xác nhận hoàn tất ươm");
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    const [mode, zoneId, form, id] = mocks.save.mock.calls[0];
    expect([mode, zoneId, id]).toEqual(["complete", batch.zoneId, batch.id]);
    expect(form.get("survivors")).toBe("95");
    expect(form.get("rowVersion")).toBe("version");
    expect(form.has("allocations")).toBe(false);
    expect(form.getAll("photos")).toHaveLength(1);
    expect(screen.queryByText(/phân bổ|bè/i)).toBeNull();
  });
  it("chặn khi thiếu ảnh; cho sống sót 0 kèm lời nhắc không còn mảnh để thả", () => {
    mount(); enter("Số sống sót (ước tính)", "0"); click("Tiếp tục");
    expect(screen.getByText("Bước 1/2 · Kết quả ươm")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("Ảnh");
    expect(screen.getByText("Đợt ươm sẽ không còn mảnh để thả.")).toBeTruthy();
    click("Thêm ảnh hiện trường"); click("Tiếp tục");
    expect(screen.getByText("Bước 2/2 · Xem lại")).toBeTruthy();
    click("Quay lại"); expect(screen.getByText("Bước 1/2 · Kết quả ươm")).toBeTruthy();
  });
  it("sửa số sống sót: không thấp hơn đã thả, gửi số mới và lý do", async () => {
    mount("survivors", { ...batch, statusId: 4002, survivors: 80, seeded: 30, remaining: 50 });
    expect(screen.getByText(/Không thấp hơn 30 mảnh đã thả/)).toBeTruthy();
    enter("Số sống sót mới (ước tính)", "29"); enter("Lý do điều chỉnh", "Đếm lại"); click("Tiếp tục");
    expect(screen.getByRole("alert").textContent).toContain("không được thấp hơn");
    enter("Số sống sót mới (ước tính)", "90"); click("Tiếp tục");
    expect(screen.getByText("80 mảnh → 90 mảnh")).toBeTruthy();
    click("Xác nhận điều chỉnh");
    await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce());
    expect(mocks.save.mock.calls[0][2]).toEqual({ survivors: 90, reason: "Đếm lại", rowVersion: "version" });
  });
});
