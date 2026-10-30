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
import { ReceiptEditor, ReceiptScreen } from "./receipt-screen";
import { receiptFixture } from "./__tests__/fixtures";

beforeEach(() => {
  vi.resetAllMocks();
  const record = receiptFixture();
  repository.read.mockImplementation(async (action: string) => ({ status: "success", data: action === "list"
    ? { page: { items: [record], total: 1 }, totals: { ...record, completedCount: 0 }, from: record.receiptDate, to: record.receiptDate }
    : record }));
  repository.write.mockResolvedValue({ status: "success", data: { ...record, notes: "Tên nháp đã lưu", rowVersion: "SAVED" } });
});
afterEach(cleanup);

async function saveWithInvoice() {
  render(<ReceiptScreen />);
  fireEvent.click(await screen.findByRole("button", { name: "Mở phiếu" }));
  const file = new File(["qa-png"], "invoice-qa.png", { type: "image/png" });
  await userEvent.upload(await screen.findByLabelText("Thêm hóa đơn (JPEG, PNG, PDF; tối đa 10 tệp, 10 MB/tệp)"), file);
  fireEvent.change(screen.getByLabelText("Ghi chú"), { target: { value: "Tên nháp đã lưu" } });
  fireEvent.click(screen.getByRole("button", { name: "Lưu nháp" }));
  await screen.findByText("Đã cập nhật phiếu PN-QA-01.");
  return file;
}

describe("invoice selection survives the real receipt editor remount", () => {
  it("blocks all completion/cancellation entries until the selected files are explicitly uploaded or removed", async () => {
    await saveWithInvoice();
    for (const name of ["Lưu và hoàn thành", "Hoàn thành phiếu đã lưu", "Hủy phiếu"]) {
      const button = screen.getByRole("button", { name }) as HTMLButtonElement;
      expect(button.disabled).toBe(true); expect(button.getAttribute("aria-describedby")).toBe("receipt-pending-invoices");
      fireEvent.click(button);
    }
    expect(repository.write).toHaveBeenCalledTimes(1); expect(repository.upload).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Bỏ chọn tệp" }));
    fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
    await waitFor(() => expect((screen.getByRole("button", { name: "Hủy phiếu" }) as HTMLButtonElement).disabled).toBe(false));
    for (const name of ["Lưu và hoàn thành", "Hoàn thành phiếu đã lưu"]) expect((screen.getByRole("button", { name }) as HTMLButtonElement).disabled).toBe(false);
    expect(repository.write).toHaveBeenCalledTimes(1);
  });
  it("also guards a cancellation form opened before selecting files and keeps its reason after removing them", async () => {
    render(<ReceiptEditor record={receiptFixture()} zones={[]} suppliers={[]} items={[]} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Hủy phiếu" }));
    fireEvent.change(screen.getByLabelText("Lý do *"), { target: { value: "Lý do đã nhập" } });
    await userEvent.upload(screen.getByLabelText("Thêm hóa đơn (JPEG, PNG, PDF; tối đa 10 tệp, 10 MB/tệp)"), new File(["qa-png"], "late-invoice.png", { type: "image/png" }));
    expect((screen.getByRole("button", { name: "Xác nhận hủy phiếu" }) as HTMLButtonElement).matches(":disabled")).toBe(true);
    expect(repository.write).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Bỏ chọn tệp" }));
    fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
    await waitFor(() => expect((screen.getByRole("button", { name: "Xác nhận hủy phiếu" }) as HTMLButtonElement).matches(":disabled")).toBe(false));
    expect((screen.getByLabelText("Lý do *") as HTMLTextAreaElement).value).toBe("Lý do đã nhập");
    expect(repository.write).not.toHaveBeenCalled();
  });
  it("explicitly clearing a selection confirms first and resets the picker without changing the saved receipt", async () => {
    const file = await saveWithInvoice();
    fireEvent.click(screen.getByRole("button", { name: "Bỏ chọn tệp" }));
    fireEvent.click(await screen.findByRole("button", { name: "Quay lại" }));
    expect(screen.getByText(file.name)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Bỏ chọn tệp" }));
    fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
    await waitFor(() => expect(screen.queryByText(file.name)).toBeNull());
    expect((screen.getByLabelText("Thêm hóa đơn (JPEG, PNG, PDF; tối đa 10 tệp, 10 MB/tệp)") as HTMLInputElement).value).toBe("");
    expect((screen.getByRole("button", { name: "Tải hóa đơn lên" }) as HTMLButtonElement).disabled).toBe(true);
    expect(repository.write).toHaveBeenCalledTimes(1); expect(repository.upload).not.toHaveBeenCalled();
  });
  it("retains the selected file after draft Save and uploads only after another explicit click", async () => {
    const record = receiptFixture();
    repository.upload.mockResolvedValue({ status: "success", data: { ...record, notes: "Tên nháp đã lưu", invoicePhotoUrls: ["/api/operations/purchase-receipts?action=invoice&index=0"], rowVersion: "UPLOADED" } });
    const file = await saveWithInvoice();
    expect((screen.getByRole("button", { name: "Tải hóa đơn lên" }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByText(file.name)).toBeTruthy(); expect(repository.upload).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Tải hóa đơn lên" }));
    await screen.findByRole("link", { name: "Tải hóa đơn 1" });
    expect(repository.upload.mock.calls[0][1][0]).toBe(file);
    expect(screen.queryByText(file.name)).toBeNull(); expect(repository.write).toHaveBeenCalledTimes(1);
  });
  it("explicit discard after Save clears the selection before the same receipt is reopened", async () => {
    const file = await saveWithInvoice();
    fireEvent.click(screen.getByRole("button", { name: "Đóng" }));
    fireEvent.click(await screen.findByRole("button", { name: "Quay lại" }));
    expect(screen.getByText(file.name)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Đóng" }));
    fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "Mở phiếu" }));
    await screen.findByLabelText("Ghi chú");
    expect(screen.queryByText(file.name)).toBeNull();
    expect((screen.getByRole("button", { name: "Tải hóa đơn lên" }) as HTMLButtonElement).disabled).toBe(true);
    expect(repository.upload).not.toHaveBeenCalled();
  });
  it("retains selection and stays blocked after an uncertain upload and a comparison read", async () => {
    repository.upload.mockResolvedValue({ status: "error", httpStatus: 0, uncertain: true });
    const file = await saveWithInvoice();
    fireEvent.click(screen.getByRole("button", { name: "Tải hóa đơn lên" }));
    await screen.findByText(/Bản nháp đang được giữ/);
    fireEvent.click(screen.getByRole("button", { name: "Tải bản mới để đối chiếu" }));
    await screen.findByRole("button", { name: "Đã đối chiếu, giữ bản nháp để sửa tiếp" });
    expect(screen.getByText(file.name)).toBeTruthy(); expect(repository.upload).toHaveBeenCalledTimes(1);
    expect((screen.getByRole("button", { name: "Tải hóa đơn lên" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
