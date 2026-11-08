// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
const mocks = vi.hoisted(() => ({ options: vi.fn(), read: vi.fn(), write: vi.fn(), upload: vi.fn(), download: vi.fn() }));
vi.mock("./repository", () => ({ createOperationsRepository: () => mocks }));
vi.mock("./lookups", () => ({ loadOptions: (...args: unknown[]) => mocks.options(...args) }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: "CooperativeOwner" }, permissions: { functionPermissions: [] } }) }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ title, children }: { title: string; children: ReactNode }) => <div role="dialog" aria-label={title}>{children}</div> }));
import { ReceiptEditor, ReceiptScreen } from "./receipt-screen";
import { PaymentEditor } from "./payment-screen";
import { WaterScreen } from "./water-screen";
import { ids, receiptFixture } from "./__tests__/fixtures";

const unavailable = { status: "error", httpStatus: 503, uncertain: false };
const record = receiptFixture();
const options = {
  zones: [{ ...record.zone, statusId: 101 }],
  suppliers: [{ ...record.supplier, statusId: 101 }],
  "input-items": [{ id: ids.item, name: "Vật tư QA", code: "IT01", unit: "kg", statusId: 101 }],
};
const debt = { totals: { supplierId: ids.supplier, supplierName: record.supplier.name, payable: 100000, paid: 0, returned: 0, refunded: 0, unallocated: 0, outstanding: 100000 },
  receipts: [{ receiptId: ids.receipt, code: record.code, receiptDate: record.receiptDate, payable: 100000, paid: 0, returned: 0, refunded: 0, outstanding: 100000 }] };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.options.mockResolvedValue({ status: "success", data: [] });
  mocks.read.mockResolvedValue({ status: "success", data: { page: { items: [], total: 0 }, totals: { payable: 0, paid: 0, returned: 0, outstanding: 0, completedCount: 0 }, from: "2026-10-01", to: "2026-10-30" } });
});
afterEach(cleanup);

describe("manual lookup recovery without losing drafts or writing", () => {
  it.each([
    ["zones", record.zone.name], ["suppliers", record.supplier.name], ["input-items", "Vật tư QA"],
  ] as const)("retries only the failed %s receipt lookup and retains the code filter", async (resource, label) => {
    let failed = false;
    mocks.options.mockImplementation(async (name: keyof typeof options) => {
      if (name === resource && !failed) { failed = true; return unavailable; }
      return { status: "success", data: options[name] ?? [] };
    });
    render(<ReceiptScreen />);
    fireEvent.change(screen.getByLabelText("Mã phiếu"), { target: { value: "QA giữ bộ lọc" } });
    const retry = await screen.findByRole("button", { name: "Tải lại danh mục phiếu nhập" });
    await waitFor(() => expect((retry as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(retry); await screen.findByRole("option", { name: label });
    expect((screen.getByLabelText("Mã phiếu") as HTMLInputElement).value).toBe("QA giữ bộ lọc");
    for (const name of Object.keys(options)) expect(mocks.options.mock.calls.filter((args) => args[0] === name)).toHaveLength(name === resource ? 2 : 1);
    expect(mocks.write).not.toHaveBeenCalled();
  });
  it("retries raft options with the same zone and preserves receipt input", async () => {
    mocks.options.mockResolvedValueOnce(unavailable).mockResolvedValue({ status: "success", data: [{ id: crypto.randomUUID(), code: "RAFT-QA", statusId: 101 }] });
    render(<ReceiptEditor record={record} zones={options.zones} suppliers={options.suppliers} items={options["input-items"]} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Ghi chú"), { target: { value: "Nháp danh mục bè" } });
    fireEvent.change(screen.getByLabelText("Số lượng"), { target: { value: "7" } });
    fireEvent.click(await screen.findByRole("button", { name: "Tải lại danh sách bè" }));
    await screen.findByRole("option", { name: "RAFT-QA" });
    expect((screen.getByLabelText("Ghi chú") as HTMLTextAreaElement).value).toBe("Nháp danh mục bè");
    expect((screen.getByLabelText("Số lượng") as HTMLInputElement).value).toBe("7");
    expect(mocks.options.mock.calls[1][2]).toEqual({ zoneId: ids.zone, statusId: "101" });
    expect(mocks.write).not.toHaveBeenCalled(); expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("retries payment debt for the same supplier while retaining the amount and reference", async () => {
    mocks.read.mockResolvedValueOnce(unavailable).mockResolvedValue({ status: "success", data: debt });
    render(<PaymentEditor payment={null} suppliers={[debt.totals]} canCreate initialSupplierId={ids.supplier} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Số tiền đã trả (đồng) *"), { target: { value: "1000" } });
    fireEvent.change(screen.getByLabelText("Mã tham chiếu"), { target: { value: "QA giữ tham chiếu" } });
    fireEvent.click(await screen.findByRole("button", { name: "Tải lại công nợ theo phiếu" }));
    await screen.findByRole("option", { name: /PN-QA-01/ });
    expect((screen.getByLabelText("Số tiền đã trả (đồng) *") as HTMLInputElement).value).toBe("1000");
    expect((screen.getByLabelText("Mã tham chiếu") as HTMLInputElement).value).toBe("QA giữ tham chiếu");
    expect(mocks.read.mock.calls[1][1]).toEqual({ supplierId: ids.supplier }); expect(mocks.write).not.toHaveBeenCalled();
  });
  it("does not unlock or replay an uncertain receipt save when its failed raft lookup recovers", async () => {
    mocks.options.mockResolvedValueOnce(unavailable).mockResolvedValue({ status: "success", data: [{ id: crypto.randomUUID(), code: "RAFT-QA", statusId: 101 }] });
    mocks.write.mockResolvedValue({ status: "error", httpStatus: 0, uncertain: true });
    render(<ReceiptEditor record={record} zones={options.zones} suppliers={options.suppliers} items={options["input-items"]} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Ghi chú"), { target: { value: "Nháp chưa rõ kết quả" } });
    await screen.findByRole("button", { name: "Tải lại danh sách bè" });
    fireEvent.click(screen.getByRole("button", { name: "Lưu nháp" }));
    await screen.findByText(/Bản nháp đang được giữ/);
    fireEvent.click(screen.getByRole("button", { name: "Tải lại danh sách bè" }));
    await screen.findByRole("option", { name: "RAFT-QA" });
    expect((screen.getByRole("button", { name: "Lưu nháp" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText("Ghi chú") as HTMLTextAreaElement).value).toBe("Nháp chưa rõ kết quả");
    expect(mocks.write).toHaveBeenCalledTimes(1);
  });
  it("recovers the zone picker when water zone loading fails before any zone can be selected", async () => {
    mocks.options.mockResolvedValueOnce(unavailable).mockResolvedValue({ status: "success", data: options.zones });
    render(<WaterScreen />);
    fireEvent.click(await screen.findByRole("button", { name: "Tải lại danh sách vùng" }));
    await screen.findByRole("option", { name: record.zone.name });
    expect((screen.getByLabelText("Vùng nuôi *") as HTMLSelectElement).value).toBe("");
    expect(mocks.options).toHaveBeenCalledTimes(2); expect(mocks.write).not.toHaveBeenCalled();
  });
});
