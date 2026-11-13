// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ available: vi.fn(), products: vi.fn(), write: vi.fn() }));
const raftId = "00000000-0000-4000-8000-0000000000a1", zoneId = "00000000-0000-4000-8000-000000000001", cycleId = "00000000-0000-4000-8000-0000000000c1";
vi.mock("./repository", () => ({ writeCycle: mocks.write, readCycles: (query: { action: string }, ...rest: unknown[]) => query.action === "products" ? mocks.products(query, ...rest) : mocks.available(query, ...rest) }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ children, title }: { children: ReactNode; title: string }) => <section role="dialog" aria-label={title}>{children}</section> }));
vi.mock("@/components/form/photo-picker", () => ({ PhotoPicker: ({ onChange, error }: { onChange(files: File[]): void; error?: string }) =>
  <div><button type="button" onClick={() => onChange([new File(["photo"], "plan.jpg", { type: "image/jpeg" })])}>Chọn ảnh kế hoạch</button>{error && <p role="alert">{error}</p>}</div> }));
import { CycleStartDialog } from "./cycle-start-dialog";

const batches = [{ id: "00000000-0000-4000-8000-0000000000b1", code: "NU000007", name: "Hàu giống", remaining: 9500 }, { id: "00000000-0000-4000-8000-0000000000b2", code: "NU000008", name: "Hàu B", remaining: 6000 }];
const products = [{ id: "00000000-0000-4000-8000-0000000000d1", name: "Hàu múp" }, { id: "00000000-0000-4000-8000-0000000000d2", name: "Hàu gầy 3cm" }];
const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
function mount() {
  const onStarted = vi.fn();
  render(<CycleStartDialog raftId={raftId} raftCode="B1-11" zoneId={zoneId} zoneLabel="DEMO-01 · Vùng ươm" onClose={vi.fn()} onStarted={onStarted} />);
  return onStarted;
}
const fill = async () => {
  fireEvent.change(await screen.findByRole("combobox", { name: "Đợt ươm (loại giống đã ươm) *" }), { target: { value: batches[0].id } });
  fireEvent.change(screen.getByRole("combobox", { name: "Loại hàu nuôi (sản phẩm bán) *" }), { target: { value: products[0].id } });
  fireEvent.change(screen.getByLabelText("Sản lượng dự kiến (kg) *"), { target: { value: "2000" } });
  click("Chọn ảnh kế hoạch");
};

beforeEach(() => {
  // The repository would parse the BFF answer; the mock hands over the normalised options.
  mocks.available.mockResolvedValue({ status: "success", data: batches });
  mocks.products.mockResolvedValue({ status: "success", data: products });
  mocks.write.mockResolvedValue({ status: "success", data: { cycle: { id: cycleId } } });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("Bắt đầu chu kỳ nuôi", () => {
  it("reads the batches of the raft's zone and lists them with their estimated pool", async () => {
    mount();
    const select = await screen.findByRole("combobox", { name: "Đợt ươm (loại giống đã ươm) *" });
    expect(mocks.available).toHaveBeenCalledWith({ action: "nursery-available", zoneId }, expect.anything(), expect.anything());
    expect(screen.getByRole("option", { name: "NU000007 · Hàu giống · còn 9.500 mảnh (ước tính)" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "NU000008 · Hàu B · còn 6.000 mảnh (ước tính)" })).toBeTruthy();
    expect((screen.getByLabelText("Bè nuôi") as HTMLInputElement).value).toBe("B1-11");
    expect((screen.getByLabelText("Vùng nuôi") as HTMLInputElement).readOnly).toBe(true);
    expect((select as HTMLSelectElement).value).toBe("");
    // The farmed product comes from the in-use catalogue, read once through the cycles BFF.
    expect(mocks.products).toHaveBeenCalledTimes(1); expect(mocks.products.mock.calls[0][0]).toEqual({ action: "products" });
    expect(screen.getByRole("option", { name: "Hàu múp" })).toBeTruthy(); expect(screen.getByRole("option", { name: "Hàu gầy 3cm" })).toBeTruthy();
  });

  it("says nothing is ready when no batch finished in the zone and points to the nursery screen", async () => {
    mocks.available.mockResolvedValue({ status: "success", data: [] });
    mount();
    expect(await screen.findByText("Chưa có đợt ươm nào đã ươm xong trong vùng này")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Mở màn Ươm giống" }).getAttribute("href")).toBe("/farming/nursery");
    expect((screen.getByRole("button", { name: "Tiếp tục" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("asks for the batch, the yield and the photos before the review step", async () => {
    mount(); await screen.findByRole("combobox", { name: "Đợt ươm (loại giống đã ươm) *" });
    click("Tiếp tục");
    expect(screen.getByText("Bước 1/2 · Thông tin chu kỳ")).toBeTruthy();
    const alerts = screen.getAllByRole("alert").map(alert => alert.textContent);
    expect(alerts).toEqual(expect.arrayContaining([expect.stringContaining("Chọn đợt ươm"), expect.stringContaining("Chọn loại hàu nuôi"), expect.stringContaining("sản lượng dự kiến lớn hơn 0")]));
    expect(mocks.write).not.toHaveBeenCalled();
  });

  it("reviews, then sends the multipart start for the raft and reports the new cycle", async () => {
    const onStarted = mount(); await fill(); click("Tiếp tục");
    expect(screen.getByText("Bước 2/2 · Xem lại và xác nhận")).toBeTruthy();
    expect(screen.getByText("NU000007 · Hàu giống · còn 9.500 mảnh (ước tính)")).toBeTruthy();
    expect(screen.getByText("Hàu múp")).toBeTruthy(); expect(screen.getByText("2000 kg")).toBeTruthy(); expect(screen.getByText("1 ảnh")).toBeTruthy();
    expect(mocks.write).not.toHaveBeenCalled();
    click("Xác nhận bắt đầu chu kỳ");
    await waitFor(() => expect(onStarted).toHaveBeenCalledWith(cycleId));
    const [action, id, form] = mocks.write.mock.calls[0] as [string, string, FormData];
    expect([action, id]).toEqual(["start", raftId]);
    expect(form.get("nurseryBatchId")).toBe(batches[0].id); expect(form.get("productId")).toBe(products[0].id); expect(form.get("targetYieldKg")).toBe("2000");
    expect(form.get("startDate")).toMatch(/^\d{4}-\d{2}-\d{2}$/); expect(form.getAll("photos")).toHaveLength(1);
  });

  it("sends a refusal about the batch back to step 1, at the batch field", async () => {
    mocks.write.mockResolvedValue({ status: "error", httpStatus: 409, code: "MSG-GEN-09", problem: { reasonCode: "NURSERY_POOL_EMPTY" }, uncertain: false });
    const onStarted = mount(); await fill(); click("Tiếp tục"); click("Xác nhận bắt đầu chu kỳ");
    await waitFor(() => expect(screen.getByText("Bước 1/2 · Thông tin chu kỳ")).toBeTruthy());
    expect(screen.getByRole("alert").textContent).toContain("Hãy chọn đợt khác");
    expect(onStarted).not.toHaveBeenCalled();
  });
});
