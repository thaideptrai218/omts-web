// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
const repository = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), upload: vi.fn(), download: vi.fn() }));
vi.mock("./repository", () => ({ createOperationsRepository: () => repository }));
vi.mock("./lookups", () => ({ loadOptions: vi.fn(async () => ({ status: "success", data: [] })) }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: "CooperativeOwner" }, permissions: { functionPermissions: [] } }) }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ title, children }: { title: string; children: ReactNode }) => <div role="dialog" aria-label={title}>{children}</div> }));
import { ReceiptEditor } from "./receipt-screen";
import { PaymentEditor } from "./payment-screen";
import { MeasurementEditor, NewMeasurement } from "./water-screen";
import { ids, receiptFixture, waterFixture } from "./__tests__/fixtures";

beforeEach(() => { vi.clearAllMocks(); vi.spyOn(window, "confirm").mockReturnValue(true); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe("tester workflow safeguards", () => {
  it("downloads an invoice without opening a popup window", () => {
    const url = `/api/operations/purchase-receipts?action=invoice&id=${ids.receipt}&index=0`;
    render(<ReceiptEditor record={receiptFixture({ invoicePhotoUrls: [url] })} zones={[]} suppliers={[]} items={[]} onClose={vi.fn()} onSaved={vi.fn()} />);
    const link = screen.getByRole("link", { name: "Tải hóa đơn 1" });
    expect(link.getAttribute("href")).toBe(url); expect(link.hasAttribute("download")).toBe(true); expect(link.hasAttribute("target")).toBe(false);
  });
  it("allows a minimal receipt draft with supplier and zone before entering any lines", async () => {
    const record = receiptFixture();
    repository.write.mockResolvedValue({ status: "success", data: record });
    render(<ReceiptEditor record={null} zones={[{ ...record.zone, statusId: 101 }]} suppliers={[{ ...record.supplier, statusId: 101 }]} items={[]} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Nhà cung cấp *"), { target: { value: ids.supplier } });
    fireEvent.change(screen.getByLabelText("Vùng nuôi *"), { target: { value: ids.zone } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu nháp" }));
    await waitFor(() => expect(repository.write).toHaveBeenCalledTimes(1));
    expect(repository.write.mock.calls[0][1]).toMatchObject({ supplierId: ids.supplier, zoneId: ids.zone, lines: [], complete: false });
  });
  it("retains a receipt draft on conflict and only saves against the reviewed version after another click", async () => {
    const record = receiptFixture(), latest = receiptFixture({ notes: "Đã sửa từ tab khác", rowVersion: "NEW" }), onSaved = vi.fn();
    repository.write.mockResolvedValueOnce({ status: "error", code: "MSG06", httpStatus: 409, uncertain: false }).mockResolvedValueOnce({ status: "success", data: latest });
    repository.read.mockResolvedValue({ status: "success", data: latest });
    render(<ReceiptEditor record={record} zones={[{ ...record.zone, statusId: 101 }]} suppliers={[{ ...record.supplier, statusId: 101 }]} items={[{ id: ids.item, code: "IT01", name: "Hàng QA", unit: "kg", statusId: 101 }]} onClose={vi.fn()} onSaved={onSaved} />);
    fireEvent.change(screen.getByLabelText("Ghi chú"), { target: { value: "Bản nháp của tôi" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu nháp" }));
    await screen.findByText(/Bản ghi đã thay đổi/);
    expect(repository.write).toHaveBeenCalledTimes(1);
    expect((screen.getByLabelText("Ghi chú") as HTMLTextAreaElement).value).toBe("Bản nháp của tôi");
    fireEvent.click(screen.getByRole("button", { name: "Tải bản mới để đối chiếu" }));
    fireEvent.click(await screen.findByRole("button", { name: "Đã đối chiếu, giữ bản nháp để sửa tiếp" }));
    expect(repository.write).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Lưu nháp" }));
    await waitFor(() => expect(repository.write).toHaveBeenCalledTimes(2));
    expect(repository.write.mock.calls[1][1]).toMatchObject({ notes: "Bản nháp của tôi", rowVersion: "NEW", complete: false });
  });
  it("never silently repeats an uncertain payment, and an explicit retry keeps the original payload and key", async () => {
    const record = receiptFixture();
    const totals = { supplierId: ids.supplier, supplierName: record.supplier.name, payable: 100000, returned: 0, paid: 0, refunded: 0, unallocated: 0, outstanding: 100000 };
    repository.read.mockImplementation(async (action: string) => action === "debt" ? { status: "success", data: { totals, receipts: [{ receiptId: ids.receipt, code: record.code, receiptDate: record.receiptDate, payable: 100000, returned: 0, paid: 0, refunded: 0, outstanding: 100000 }] } }
      : { status: "success", data: { page: { items: [], page: 1, pageSize: 100, total: 0 }, totalAmount: 0 } });
    repository.write.mockResolvedValueOnce({ status: "error", httpStatus: 0, uncertain: true }).mockResolvedValueOnce({ status: "success", data: { id: ids.line } });
    render(<PaymentEditor payment={null} suppliers={[totals]} canCreate initialSupplierId={ids.supplier} onClose={vi.fn()} onSaved={vi.fn()} />);
    const picker = await screen.findByLabelText("Phiếu nhập hoàn thành *");
    await screen.findByRole("option", { name: /PN-QA-01/ });
    fireEvent.change(picker, { target: { value: ids.receipt } });
    fireEvent.change(screen.getByLabelText("Số tiền đã trả (đồng) *"), { target: { value: "1000" } });
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận ghi nhận thanh toán" }));
    expect(repository.write).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Đồng ý ghi nhận" }));
    await screen.findByText(/Chưa gửi lại khoản tiền/);
    const originalPayload = repository.write.mock.calls[0][1];
    expect(originalPayload.deduplicationKey).toMatch(/^[a-f0-9-]{36}$/);
    expect((screen.getByLabelText("Số tiền đã trả (đồng) *") as HTMLInputElement).matches(":disabled")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Tải lịch sử để đối chiếu" }));
    fireEvent.click(await screen.findByRole("button", { name: "Đã đối chiếu, cho phép xác nhận lại khoản đang nhập" }));
    expect(repository.write).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận ghi nhận thanh toán" }));
    fireEvent.click(screen.getByRole("button", { name: "Đồng ý ghi nhận" }));
    await waitFor(() => expect(repository.write).toHaveBeenCalledTimes(2));
    expect(repository.write.mock.calls[1][1]).toEqual(originalPayload);
  });
  it("keeps failed OCR as a saved draft and waits for human confirmation", async () => {
    const draft = waterFixture({ ph: null, salinity: null, photoUrl: "/api/operations/water?action=photo" });
    const ocr = { status: "Failed" as const, ph: null, salinity: null, measuredAt: null }, onSaved = vi.fn();
    repository.upload.mockResolvedValue({ status: "success", data: { measurement: draft, ocr } });
    const view = render(<NewMeasurement zoneId={ids.zone} zoneName="Vùng QA" onClose={vi.fn()} onSaved={onSaved} />);
    fireEvent.change(screen.getByLabelText("Cách ghi"), { target: { value: "ocr" } });
    await userEvent.upload(screen.getByLabelText("Ảnh máy đo * (JPEG/PNG, tối đa 10 MB)"), new File(["png"], "qa.png", { type: "image/png" }));
    expect((screen.getByLabelText("Ảnh máy đo * (JPEG/PNG, tối đa 10 MB)") as HTMLInputElement).files?.length).toBe(1);
    // jsdom's native file-required validator does not observe user-event's FileList.
    // Submit the real handler here; native file submission is checked in the browser.
    fireEvent.submit(screen.getByRole("button", { name: "Nhận dạng và lưu nháp" }).closest("form")!);
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(draft, ocr));
    expect(repository.write).not.toHaveBeenCalled(); view.unmount();
    repository.write.mockResolvedValue({ status: "success", data: waterFixture({ statusCode: "CONFIRMED" }) });
    render(<MeasurementEditor record={draft} ocr={ocr} onClose={vi.fn()} onSaved={onSaved} onOpen={vi.fn()} />);
    expect(screen.getByText(/Ảnh và bản nháp đã được lưu/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("pH *"), { target: { value: "7.5" } });
    fireEvent.change(screen.getByLabelText("Độ mặn (‰) *"), { target: { value: "25" } });
    expect(repository.write).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận số đo" }));
    await waitFor(() => expect(repository.write).toHaveBeenCalledTimes(1));
    expect(repository.write.mock.calls[0].slice(0, 2)).toEqual(["confirm", { ph: 7.5, salinity: 25, measuredAt: "2026-10-01T08:00:00+07:00" }]);
  });
  it("does not offer editing or voiding a replaced water version", () => {
    render(<MeasurementEditor record={waterFixture({ statusCode: "SUPERSEDED", isLatestVersion: false })} onClose={vi.fn()} onSaved={vi.fn()} onOpen={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Hiệu chỉnh" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Hủy phép đo" })).toBeNull();
    expect(repository.write).not.toHaveBeenCalled();
  });
});
