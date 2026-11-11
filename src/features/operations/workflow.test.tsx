// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render as baseRender, screen, waitFor } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/toast-provider";
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
const render = (ui: ReactNode) => baseRender(<ToastProvider>{ui}</ToastProvider>);

beforeEach(() => { vi.clearAllMocks(); vi.spyOn(window, "confirm").mockReturnValue(true); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe("tester workflow safeguards", () => {
  it("keeps a selected unuploaded invoice until explicit discard", async () => {
    const onClose = vi.fn();
    render(<ReceiptEditor record={receiptFixture()} zones={[]} suppliers={[]} items={[]} onClose={onClose} onSaved={vi.fn()} />);
    const picker = screen.getByLabelText("Thêm hóa đơn (JPEG, PNG, PDF; tối đa 10 tệp, 10 MB/tệp)");
    await userEvent.upload(picker, new File(["qa-png"], "invoice-qa.png", { type: "image/png" }));
    fireEvent.click(screen.getByRole("button", { name: "Đóng" }));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: "Quay lại" }));
    expect((picker as HTMLInputElement).files?.[0]?.name).toBe("invoice-qa.png");
    expect((screen.getByRole("button", { name: "Tải hóa đơn lên" }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Đóng" }));
    fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(repository.upload).not.toHaveBeenCalled(); expect(repository.write).not.toHaveBeenCalled();
  });
  it("cancels against the explicitly reviewed receipt version while retaining the cancellation reason", async () => {
    const record = receiptFixture(), latest = receiptFixture({ notes: "Tab khác đã lưu", rowVersion: "REVIEWED" }), onSaved = vi.fn();
    repository.write.mockResolvedValueOnce({ status: "error", code: "MSG06", httpStatus: 409, uncertain: false })
      .mockResolvedValueOnce({ status: "success", data: { ...latest, statusId: 1703, status: "Cancelled" } });
    repository.read.mockResolvedValue({ status: "success", data: latest });
    render(<ReceiptEditor record={record} zones={[]} suppliers={[]} items={[]} onClose={vi.fn()} onSaved={onSaved} />);
    fireEvent.click(screen.getByRole("button", { name: "Hủy phiếu" }));
    fireEvent.change(screen.getByLabelText("Lý do *"), { target: { value: "Lý do đang nhập" } });
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận hủy phiếu" }));
    fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
    await screen.findByText(/Bản ghi đã thay đổi/);
    expect(repository.write.mock.calls[0][1]).toMatchObject({ rowVersion: record.rowVersion, reason: "Lý do đang nhập" });
    fireEvent.click(screen.getByRole("button", { name: "Tải bản mới để đối chiếu" }));
    const adopt = await screen.findByRole("button", { name: "Đã đối chiếu, giữ bản nháp để sửa tiếp" });
    expect((screen.getByRole("button", { name: "Xác nhận hủy phiếu" }) as HTMLButtonElement).matches(":disabled")).toBe(true);
    expect(repository.write).toHaveBeenCalledTimes(1);
    fireEvent.click(adopt);
    expect((screen.getByLabelText("Lý do *") as HTMLTextAreaElement).value).toBe("Lý do đang nhập");
    expect(repository.write).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận hủy phiếu" }));
    fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
    await waitFor(() => expect(repository.write).toHaveBeenCalledTimes(2));
    expect(repository.write.mock.calls[1][1]).toMatchObject({ rowVersion: latest.rowVersion, reason: "Lý do đang nhập" });
    expect(onSaved).toHaveBeenCalledOnce();
  });
  it("keeps a chosen measurement photo until explicit discard", async () => {
    const onClose = vi.fn();
    render(<NewMeasurement zoneId={ids.zone} zoneName="Vùng QA" onClose={onClose} onSaved={vi.fn()} />);
    const picker = screen.getByLabelText("Ảnh máy đo * (JPEG/PNG, tối đa 10 MB)");
    await userEvent.upload(picker, new File(["png"], "qa.png", { type: "image/png" }));
    fireEvent.click(screen.getByRole("button", { name: "Bỏ qua" }));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: "Quay lại" }));
    expect((picker as HTMLInputElement).files?.[0]?.name).toBe("qa.png");
    fireEvent.click(screen.getByRole("button", { name: "Bỏ qua" }));
    fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(repository.write).not.toHaveBeenCalled(); expect(repository.upload).not.toHaveBeenCalled();
  });
  it.each([
    ["Ngày trả *", "2026-01-01"],
    ["Hình thức *", "BankTransfer"],
    ["Nhà cung cấp *", ids.supplier],
  ])("keeps a payment draft when only %s changed until explicit discard", async (label, value) => {
    const onClose = vi.fn(), record = receiptFixture();
    const totals = { supplierId: ids.supplier, supplierName: record.supplier.name, payable: 100000, returned: 0, paid: 0, refunded: 0, unallocated: 0, outstanding: 100000 };
    repository.read.mockResolvedValue({ status: "success", data: { totals, receipts: [] } });
    render(<PaymentEditor payment={null} suppliers={[totals]} canCreate initialSupplierId="" onClose={onClose} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
    fireEvent.click(screen.getByRole("button", { name: "Đóng" }));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: "Quay lại" }));
    expect((screen.getByLabelText(label) as HTMLInputElement | HTMLSelectElement).value).toBe(value);
    fireEvent.click(screen.getByRole("button", { name: "Đóng" }));
    fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(repository.write).not.toHaveBeenCalled();
  });
  it("closes untouched or restored measurement and payment forms without a discard prompt", async () => {
    const closeMeasurement = vi.fn();
    const measurement = render(<NewMeasurement zoneId={ids.zone} zoneName="Vùng QA" onClose={closeMeasurement} onSaved={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Bỏ qua" }));
    expect(closeMeasurement).toHaveBeenCalledOnce(); measurement.unmount();
    const closePayment = vi.fn(); repository.read.mockResolvedValue({ status: "success", data: undefined });
    render(<PaymentEditor payment={null} suppliers={[]} canCreate initialSupplierId={ids.supplier} onClose={closePayment} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Hình thức *"), { target: { value: "BankTransfer" } });
    fireEvent.change(screen.getByLabelText("Hình thức *"), { target: { value: "Cash" } });
    fireEvent.click(screen.getByRole("button", { name: "Đóng" }));
    expect(closePayment).toHaveBeenCalledOnce(); expect(repository.write).not.toHaveBeenCalled();
  });
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
    fireEvent.change(screen.getByLabelText("Số tiền đã trả *"), { target: { value: "1000" } });
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận ghi nhận thanh toán" }));
    expect(repository.write).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Đồng ý ghi nhận" }));
    await screen.findByText(/Chưa gửi lại khoản tiền/);
    const originalPayload = repository.write.mock.calls[0][1];
    expect(originalPayload.deduplicationKey).toMatch(/^[a-f0-9-]{36}$/);
    expect((screen.getByLabelText("Số tiền đã trả *") as HTMLInputElement).matches(":disabled")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Tải lịch sử để đối chiếu" }));
    fireEvent.click(await screen.findByRole("button", { name: "Đã đối chiếu, cho phép xác nhận lại khoản đang nhập" }));
    expect(repository.write).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận ghi nhận thanh toán" }));
    fireEvent.click(screen.getByRole("button", { name: "Đồng ý ghi nhận" }));
    await waitFor(() => expect(repository.write).toHaveBeenCalledTimes(2));
    expect(repository.write.mock.calls[1][1]).toEqual(originalPayload);
  });
  it("reads the photo first, then records the confirmed values with the returned photo key", async () => {
    const { loadOptions } = await import("./lookups");
    vi.mocked(loadOptions).mockResolvedValueOnce({ status: "success", data: [{ id: ids.raft, code: "B-QA" }] });
    const ocr = { status: "Failed" as const, ph: null, salinity: null, temperature: null, measuredAt: null, unread: ["PH", "SALINITY", "TEMPERATURE"],
      warning: { code: "MSG-WATER-01", text: "Chưa đọc được pH, độ mặn, nhiệt độ." } };
    const recognition = { photoKey: "photo-key-qa", measuredAt: "2026-10-01T08:00:00+07:00", ocr, valuesOutside: [], thresholdWarning: null };
    const recorded = waterFixture(), onSaved = vi.fn();
    repository.upload.mockResolvedValue({ status: "success", data: recognition });
    repository.write.mockResolvedValue({ status: "success", data: recorded });
    render(<NewMeasurement zoneId={ids.zone} zoneName="Vùng QA" onClose={vi.fn()} onSaved={onSaved} />);
    await userEvent.upload(screen.getByLabelText("Ảnh máy đo * (JPEG/PNG, tối đa 10 MB)"), new File(["png"], "qa.png", { type: "image/png" }));
    // jsdom's native file-required validator does not observe user-event's FileList; submit the real handler.
    const recognizeButton = screen.getByRole("button", { name: "Nhận dạng từ ảnh" });
    fireEvent.submit(recognizeButton.closest("form")!);
    expect(await screen.findByText("Chưa đọc được pH, độ mặn, nhiệt độ.")).toBeTruthy();
    expect(repository.upload.mock.calls[0].slice(0, 3)).toEqual(["recognize", [expect.any(File)], {}]);
    expect(repository.write).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Lưu phép đo" })).not.toBe(recognizeButton);
    await screen.findByRole("option", { name: "B-QA" });
    fireEvent.change(screen.getByLabelText("Bè đo *"), { target: { value: ids.raft } });
    fireEvent.change(screen.getByLabelText("pH (0–14) *"), { target: { value: "7.5" } });
    fireEvent.change(screen.getByLabelText("Độ mặn (‰, 0–50) *"), { target: { value: "25" } });
    fireEvent.change(screen.getByLabelText("Nhiệt độ (°C, 0–45) *"), { target: { value: "26" } });
    fireEvent.submit(screen.getByRole("button", { name: "Lưu phép đo" }).closest("form")!);
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(recorded, ocr));
    expect(repository.write.mock.calls[0].slice(0, 2)).toEqual(["record", expect.objectContaining({
      raftId: ids.raft, measuredAt: "2026-10-01T08:00:00+07:00", ph: 7.5, salinity: 25, temperature: 26, photoKey: "photo-key-qa", clientOperationId: expect.any(String),
    })]);
  });
  it("corrects an active measurement in place with a reason and no version", async () => {
    const record = waterFixture(), onSaved = vi.fn();
    repository.write.mockResolvedValue({ status: "success", data: waterFixture({ ph: 7.8 }) });
    render(<MeasurementEditor record={record} onClose={vi.fn()} onSaved={onSaved} onOpen={vi.fn()} />);
    const editButton = screen.getByRole("button", { name: "Hiệu chỉnh" });
    expect(editButton.getAttribute("type")).toBe("button");
    await userEvent.click(editButton);
    expect(repository.write).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Lưu" })).not.toBe(editButton);
    expect(screen.getByRole("button", { name: "Lưu" }).getAttribute("type")).toBe("submit");
    fireEvent.change(screen.getByLabelText("pH (0–14) *"), { target: { value: "7.8" } });
    fireEvent.change(screen.getByLabelText("Lý do hiệu chỉnh *"), { target: { value: "Đọc lại ảnh" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(repository.write).toHaveBeenCalledTimes(1));
    expect(repository.write.mock.calls[0].slice(0, 3)).toEqual(["correct", { raftId: ids.raft, measuredAt: "2026-10-01T08:00:00+07:00", ph: 7.8, salinity: 25, temperature: 26, reason: "Đọc lại ảnh" }, expect.anything()]);
    expect(onSaved).toHaveBeenCalledOnce();
  });
  it("voids an active measurement with only a reason after confirmation", async () => {
    repository.write.mockResolvedValue({ status: "success", data: waterFixture({ statusCode: "VOIDED", status: "Voided", voidReason: "Đo nhầm bè" }) });
    render(<MeasurementEditor record={waterFixture()} onClose={vi.fn()} onSaved={vi.fn()} onOpen={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Hủy bỏ phép đo" }));
    fireEvent.change(screen.getByLabelText("Lý do hủy *"), { target: { value: "Đo nhầm bè" } });
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận hủy phép đo" }));
    await waitFor(() => expect(repository.write).toHaveBeenCalledTimes(1));
    expect(repository.write.mock.calls[0].slice(0, 2)).toEqual(["void", { reason: "Đo nhầm bè" }]);
  });
  it("does not offer editing or voiding a voided measurement", () => {
    render(<MeasurementEditor record={waterFixture({ statusCode: "VOIDED", status: "Voided", voidReason: "Đo nhầm bè" })} onClose={vi.fn()} onSaved={vi.fn()} onOpen={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Hiệu chỉnh" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Hủy bỏ phép đo" })).toBeNull();
    expect(screen.getByText("Lý do hủy: Đo nhầm bè")).toBeTruthy();
    expect(repository.write).not.toHaveBeenCalled();
  });
  it("retains the cancellation reason and confirmation when the server refuses the change", async () => {
    repository.write.mockResolvedValue({ status: "error", httpStatus: 400, uncertain: false });
    render(<MeasurementEditor record={waterFixture()} onClose={vi.fn()} onSaved={vi.fn()} onOpen={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Hủy bỏ phép đo" }));
    fireEvent.change(screen.getByLabelText("Lý do hủy *"), { target: { value: "Đo nhầm bè" } });
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận hủy phép đo" }));
    await waitFor(() => expect(repository.write).toHaveBeenCalledOnce());
    expect(screen.getByRole("dialog", { name: "Hủy bỏ phép đo?" })).toBeTruthy();
    expect((screen.getByLabelText("Lý do hủy *") as HTMLTextAreaElement).value).toBe("Đo nhầm bè");
    expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Đã hủy phép đo tại/)).toBeNull();
  });
});
