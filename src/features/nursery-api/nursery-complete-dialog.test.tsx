// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { completionBatch as batch, completionRafts as rafts, completionRecipient as recipient } from "./nursery-completion-test-fixtures";
import { NurseryCompleteDialog } from "./nursery-complete-dialog";
import type { NurseryPhotoDraft } from "./nursery-photo-field";

const mocks = vi.hoisted(() => ({ read: vi.fn(), save: vi.fn() }));
vi.mock("@/features/cycles-api/repository", () => ({ readCycles: mocks.read }));
vi.mock("./service", async importOriginal => {
  const original = await importOriginal<typeof import("./service")>();
  return { ...original, nurseryService: { ...original.nurseryService, save: mocks.save } };
});
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ children, title }: { children: ReactNode; title: string }) => <section role="dialog" aria-label={title}>{children}</section> }));
vi.mock("./nursery-photo-field", () => ({ NurseryPhotoField: ({ onChange }: { onChange(value: NurseryPhotoDraft[]): void }) =>
  <button type="button" onClick={() => onChange([{ file: new File(["photo"], "photo.png", { type: "image/png" }), preview: "" }])}>Thêm ảnh hiện trường</button> }));

const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
const enter = (name: string, value: string) => fireEvent.change(screen.getByRole("textbox", { name }), { target: { value } });
const next = () => screen.getByRole("button", { name: "Tiếp tục" }) as HTMLButtonElement;
function mount(mode: "complete" | "survivors" | "allocations" = "complete", record = batch) {
  const onSaved = vi.fn();
  render(<NurseryCompleteDialog batch={record} mode={mode} onClose={vi.fn()} onSaved={onSaved} />);
  return onSaved;
}
async function goToTransfer() {
  enter("Số sống sót (ước tính)", "95"); click("Thêm ảnh hiện trường"); click("Tiếp tục");
  await screen.findByRole("button", { name: "Chọn bè B1-01" });
}

beforeEach(() => {
  mocks.read.mockResolvedValue({ status: "success", data: rafts });
  mocks.save.mockResolvedValue({ status: "success", data: batch });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("hoàn tất ươm qua từng bước", () => {
  it("tách kết quả và bè, giữ nháp khi quay lại, chỉ gửi sau xem lại", async () => {
    const onSaved = mount();
    expect(screen.getByText("Bước 1/3 · Kết quả ươm")).toBeTruthy();
    expect(screen.getByText("DEMO-01 · Vùng ươm một")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Chọn bè B1-01" })).toBeNull();
    await goToTransfer();
    expect(screen.getByText("Bước 2/3 · Chuyển sang bè")).toBeTruthy();
    expect(next().disabled).toBe(true);
    click("Chọn bè B1-01"); click("Chọn bè B1-02");
    enter("Số mảnh chuyển sang bè B1-01", "20"); enter("Số mảnh chuyển sang bè B1-02", "75");
    enter("Sản lượng dự kiến bè B1-02 (kg)", "10");
    expect(next().disabled).toBe(false); click("Tiếp tục");
    expect(screen.getByText("Bước 3/3 · Xem lại")).toBeTruthy();
    expect(screen.getByText("Bắt đầu nuôi ở 2 bè.")).toBeTruthy();
    expect(mocks.save).not.toHaveBeenCalled();
    click("Quay lại");
    expect((screen.getByRole("textbox", { name: "Số mảnh chuyển sang bè B1-01" }) as HTMLInputElement).value).toBe("20");
    click("Tiếp tục"); click("Xác nhận hoàn tất và bắt đầu nuôi");
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    const [mode, zoneId, form, id] = mocks.save.mock.calls[0];
    expect([mode, zoneId, id]).toEqual(["complete", batch.zoneId, batch.id]);
    expect(form.get("survivors")).toBe("95");
    expect(JSON.parse(form.get("allocations"))).toEqual([{ raftId: rafts[0].raftId, quantity: 20 }, { raftId: rafts[1].raftId, quantity: 75, targetYieldKg: 10 }]);
    expect(form.getAll("photos")).toHaveLength(1);
  });
  it("không cho qua bước kết quả khi chưa có ảnh, bỏ bước bè khi sống sót 0", async () => {
    mount(); enter("Số sống sót (ước tính)", "0"); click("Tiếp tục");
    expect(screen.getByText("Bước 1/3 · Kết quả ươm")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("Ảnh");
    click("Thêm ảnh hiện trường"); click("Tiếp tục");
    expect(screen.getByText("Bước 3/3 · Xem lại")).toBeTruthy();
    expect(screen.getByText("Hoàn tất đợt ươm, không có mảnh nào chuyển sang bè")).toBeTruthy();
    click("Quay lại"); expect(screen.getByText("Bước 1/3 · Kết quả ươm")).toBeTruthy();
    click("Tiếp tục"); click("Xác nhận hoàn tất");
    await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce());
    expect(mocks.save.mock.calls[0][2].get("allocations")).toBe("[]");
  });
  it("cho sửa lựa chọn khi tải lại thấy bè vừa bận", async () => {
    mount(); await goToTransfer(); click("Chọn bè B1-01"); enter("Số mảnh chuyển sang bè B1-01", "95");
    mocks.read.mockResolvedValue({ status: "success", data: rafts.map((raft, index) => index ? raft : { ...raft, raftStatusId: 102 }) });
    click("Tải lại bè nuôi");
    await screen.findByRole("button", { name: "Bỏ chọn bè" });
    expect(next().disabled).toBe(true); click("Bỏ chọn bè");
    click("Chọn bè B1-02"); enter("Số mảnh chuyển sang bè B1-02", "95");
    expect(next().disabled).toBe(false);
  });
  it("chặn tổng lệch, ô trống, hỗ trợ chia theo làn và dồn hết", async () => {
    mount(); await goToTransfer(); click("Chọn bè B1-01");
    expect(next().disabled).toBe(true); enter("Số mảnh chuyển sang bè B1-01", "96"); expect(next().disabled).toBe(true);
    click("Chọn bè B1-02"); click("Chia đều theo số làn");
    expect(next().disabled).toBe(false);
    fireEvent.click(screen.getAllByRole("button", { name: "Dồn hết vào bè này" })[1]);
    expect(screen.queryByRole("textbox", { name: "Số mảnh chuyển sang bè B1-01" })).toBeNull();
    expect((screen.getByRole("textbox", { name: "Số mảnh chuyển sang bè B1-02" }) as HTMLInputElement).value).toBe("95");
    expect(next().disabled).toBe(false);
  });
  it("hiện vùng, lý do bè bận và liên kết tạo bè khi không còn bè trống", async () => {
    mocks.read.mockResolvedValue({ status: "success", data: [{ ...rafts[0], cycle: { id: "busy", startDate: "2026-11-12", closeDate: null } }] });
    mount(); enter("Số sống sót (ước tính)", "95"); click("Thêm ảnh hiện trường"); click("Tiếp tục");
    const link = await screen.findByRole("link", { name: /Tạo bè nuôi cho vùng này/ });
    expect(link.getAttribute("href")).toBe("/farming/rafts?zoneId=zone&create=1");
    expect(screen.getByRole("list", { name: "Bè đang bận" }).textContent).toContain("B1-01 · đang nuôi từ 12/11/2026");
    expect(next().disabled).toBe(true);
    expect(screen.getByRole("dialog").textContent).not.toMatch(/phân bổ|chu kỳ/i);
  });
  it("giữ hai bước điều chỉnh và bảo vệ bè đã thả", async () => {
    mount("allocations", { ...batch, survivors: 80, allocations: [recipient] });
    const remove = await screen.findByRole("button", { name: "Bỏ chọn bè B1-01" }) as HTMLButtonElement;
    expect(remove.disabled).toBe(true);
    expect(screen.getByText("Bước 1/2 · Điều chỉnh")).toBeTruthy();
    enter("Số mảnh chuyển sang bè B1-01", "29"); click("Chọn bè B1-02"); enter("Số mảnh chuyển sang bè B1-02", "51");
    enter("Lý do điều chỉnh", "Đổi bè"); click("Tiếp tục");
    expect(screen.getByRole("alert").textContent).toContain("không được giảm dưới");
    enter("Số mảnh chuyển sang bè B1-01", "30"); enter("Số mảnh chuyển sang bè B1-02", "50"); click("Tiếp tục");
    expect(screen.getByText("Bước 2/2 · Xem lại")).toBeTruthy();
  });
  it("sửa số sống sót qua hai bước, gửi số mới và lý do cùng số mảnh từng bè", async () => {
    mount("survivors", { ...batch, survivors: 80, allocations: [recipient] });
    await screen.findByRole("button", { name: "Bỏ chọn bè B1-01" });
    enter("Số sống sót mới (ước tính)", "90"); enter("Số mảnh chuyển sang bè B1-01", "90");
    enter("Sản lượng dự kiến bè B1-01 (kg)", "");
    enter("Lý do điều chỉnh", "Đếm lại tại vùng"); click("Tiếp tục");
    expect(screen.getByText("80 mảnh → 90 mảnh")).toBeTruthy();
    expect(screen.getByText("20 kg")).toBeTruthy();
    expect(mocks.save).not.toHaveBeenCalled(); click("Xác nhận điều chỉnh");
    await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce());
    expect(mocks.save.mock.calls[0][2]).toMatchObject({ survivors: 90, reason: "Đếm lại tại vùng", allocations: [{ raftId: recipient.raftId, quantity: 90, targetYieldKg: 20 }] });
  });
});
