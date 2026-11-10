// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PayrollPaymentsScreen } from "./payroll-payments-screen";
import type { PayableLine, PayrollSheet } from "./payroll-model";
import { PayrollScreen } from "./payroll-screen";

const fetchSpy = vi.fn();
beforeEach(() => { vi.stubGlobal("fetch", fetchSpy); localStorage.clear(); });
afterEach(() => { cleanup(); fetchSpy.mockClear(); vi.unstubAllGlobals(); });

// Samples are injected through props only; the product has no payroll data source yet.
const sheet = (over: Partial<PayrollSheet>): PayrollSheet => ({
  id: "s1", periodLabel: "Tháng 10/2026", from: "2026-10-01", to: "2026-10-31", status: "pending", total: 5_000_000, paymentLabel: "Chưa trả",
  slips: [{ id: "p1", employeeName: "Nguyễn Văn A", employeeType: "Thời vụ", workLines: [{ jobName: "Cho ăn", hours: 8, hourlyRate: 30_000 }], subtotal: 240_000, adjustment: 10_000, adjustmentReason: "Thưởng", net: 250_000 }],
  laborCosts: [{ id: "c1", raftName: "Bè 01", zoneName: "Vùng A", cycleName: "Chu kỳ 3", cost: 1_000_000 }],
  payments: [{ id: "m1", voucherCode: "PC-001", employeeName: "Nguyễn Văn A", paidOn: "2026-11-02", amount: 250_000, method: "Tiền mặt", status: "Đã chi" }],
  ...over,
});
const sheets = [sheet({}), sheet({ id: "s2", periodLabel: "Tháng 9/2026", from: "2026-09-01", to: "2026-09-30", status: "final" })];

it("renders the management layout with the empty state and no request", () => {
  render(<PayrollScreen />);
  expect(screen.getByRole("heading", { level: 1, name: "Bảng lương" })).toBeTruthy();
  expect(screen.queryByText(/Lập bảng lương theo kỳ/)).toBeNull();
  expect(screen.getByPlaceholderText("Theo kỳ lương")).toBeTruthy();
  for (const pill of ["Tất cả", "Nháp", "Chờ chốt", "Đã trả lại", "Đã chốt"]) expect(screen.getByRole("radio", { name: pill })).toBeTruthy();
  expect(screen.getByText("Chưa có dữ liệu để hiển thị.")).toBeTruthy();
  expect(screen.getByRole("navigation", { name: "Phân trang" }).textContent).toContain("0 trong 0 bảng lương");
  expect((screen.getByRole("button", { name: "Hướng dẫn (chưa có)" }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByRole("button", { name: "Chọn trường hiển thị" })).toBeTruthy();
  // Nothing that cannot work yet: no create, import, export or other buttons.
  expect(screen.queryByRole("button", { name: /Tạo bảng lương|Import|Xuất|Điều chỉnh|Hủy thanh toán/ })).toBeNull();
  expect(screen.queryByRole("dialog", { hidden: true })).toBeNull();
  expect(fetchSpy).not.toHaveBeenCalled();
});

it("closed rows have only the chevron and an opened row shows the four subtabs without footers", () => {
  render(<PayrollScreen sheets={sheets} />);
  const table = screen.getByRole("table", { name: "Danh sách bảng lương theo kỳ" });
  for (const heading of ["Kỳ lương", "Từ–đến ngày", "Trạng thái", "Tổng lương", "Thanh toán lương"]) expect(within(table).getByRole("columnheader", { name: heading })).toBeTruthy();
  expect(within(table).getAllByRole("button").length).toBe(2);
  fireEvent.click(screen.getByRole("button", { name: "Mở bảng lương Tháng 10/2026" }));
  for (const tab of ["Thông tin", "Phiếu lương", "Chi phí nhân công theo bè", "Lịch sử thanh toán"]) expect(screen.getByRole("tab", { name: tab })).toBeTruthy();
  expect(screen.queryByRole("contentinfo")).toBeNull();
  fireEvent.click(screen.getByRole("tab", { name: "Phiếu lương" }));
  expect(screen.getByRole("columnheader", { name: "Giờ × đơn giá" })).toBeTruthy();
  expect(screen.getByText("Thưởng", { exact: false })).toBeTruthy();
  fireEvent.click(screen.getByRole("tab", { name: "Chi phí nhân công theo bè" }));
  expect(screen.getByText("Bè 01")).toBeTruthy();
  fireEvent.click(screen.getByRole("tab", { name: "Lịch sử thanh toán" }));
  expect(screen.getByText("PC-001")).toBeTruthy();
  // The only buttons in the open row are the subtabs and the chevrons.
  expect(screen.queryByRole("button", { name: /Gửi|Chỉnh sửa|Hủy|Thanh toán lương/ })).toBeNull();
  expect(fetchSpy).not.toHaveBeenCalled();
});

it("status pills and search filter the list on the client", () => {
  render(<PayrollScreen sheets={sheets} />);
  expect(screen.getByRole("navigation", { name: "Phân trang" }).textContent).toContain("1–2 trong 2 bảng lương");
  fireEvent.click(screen.getByRole("radio", { name: "Đã chốt" }));
  expect(screen.queryByText("Tháng 10/2026")).toBeNull();
  expect(screen.getByText("Tháng 9/2026")).toBeTruthy();
  fireEvent.click(screen.getByRole("radio", { name: "Nháp" }));
  expect(screen.getByText("Không có bảng lương phù hợp bộ lọc.")).toBeTruthy();
  fireEvent.click(screen.getByRole("radio", { name: "Tất cả" }));
  fireEvent.change(screen.getByPlaceholderText("Theo kỳ lương"), { target: { value: "thang 10" } });
  expect(screen.getByText("Tháng 10/2026")).toBeTruthy();
  expect(screen.queryByText("Tháng 9/2026")).toBeNull();
  expect(fetchSpy).not.toHaveBeenCalled();
});

it("payments screen shows its empty state with no inert buttons and no request", () => {
  render(<PayrollPaymentsScreen />);
  expect(screen.getByRole("heading", { level: 1, name: "Thanh toán lương" })).toBeTruthy();
  expect(screen.getByText("Chưa có dữ liệu để hiển thị.")).toBeTruthy();
  expect(screen.getByRole("navigation", { name: "Phân trang" }).textContent).toContain("0 trong 0 nhân viên");
  expect(screen.queryByRole("button", { name: /Ghi nhận thanh toán|Quay lại/ })).toBeNull();
  expect(screen.queryByRole("radio", { name: "Chuyển khoản" })).toBeNull();
  expect(fetchSpy).not.toHaveBeenCalled();
});

it("payments list shows the payable columns for injected rows and filters by name", () => {
  const lines: PayableLine[] = [
    { id: "a", employeeName: "Nguyễn Văn A", pay: 500_000, paid: 100_000, outstanding: 400_000, bankAccount: "VCB 0123" },
    { id: "b", employeeName: "Trần Thị B", pay: 300_000, paid: 0, outstanding: 300_000, bankAccount: "" },
  ];
  render(<PayrollPaymentsScreen lines={lines} />);
  for (const heading of ["Nhân viên", "Lương", "Đã trả", "Còn nợ", "Tài khoản ngân hàng"]) expect(screen.getByRole("columnheader", { name: heading })).toBeTruthy();
  expect(screen.queryAllByRole("button").some((button) => /Thanh toán|Ghi nhận/.test(button.textContent ?? ""))).toBe(false);
  fireEvent.change(screen.getByPlaceholderText("Theo tên nhân viên"), { target: { value: "tran" } });
  expect(screen.getByText("Trần Thị B")).toBeTruthy();
  expect(screen.queryByText("Nguyễn Văn A")).toBeNull();
  expect(fetchSpy).not.toHaveBeenCalled();
});
