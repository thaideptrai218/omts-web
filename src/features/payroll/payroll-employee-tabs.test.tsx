// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { fail, ids, ok, payment, polyfillDialog } from "./payroll-test-fixtures";

const state = vi.hoisted(() => ({
  repo: { employeeSlips: vi.fn(), slip: vi.fn(), payments: vi.fn(), payable: vi.fn(), payStandalone: vi.fn() },
}));
vi.mock("./repository", () => ({ payrollRepository: state.repo }));
import { EmployeeDebtTab } from "./employee-debt-tab";
import { EmployeePayslipsTab } from "./employee-payslips-tab";
import { EmployeeTabs } from "@/features/employee-api/employee-tabs";

const slipRow = (over = {}) => ({ id: ids.slipA, code: "PL000001", payrollId: ids.a, payrollCode: "BL000001", payrollName: "Bảng lương tháng 5/2026", from: "2026-05-01", to: "2026-05-31",
  income: 3_000_000, net: 3_000_000, paid: 1_000_000, outstanding: 2_000_000, status: "Finalized", ...over });
const slipPage = (items = [slipRow()], summary = { outstanding: 2_000_000, advanceBalance: 150_000 }) => ok({ items, total: items.length, page: 1, pageSize: 15, summary });
const slipDetail = ok({
  id: ids.slipA, code: "PL000001", payrollId: ids.a, payrollCode: "BL000001", employeeId: ids.empA, employeeName: "Nguyễn Văn A", from: "2026-05-01", to: "2026-05-31", hours: 100, mainPay: 3_000_000, bonus: 0, deduction: 50_000,
  income: 3_000_000, net: 2_950_000, paid: 1_000_000, outstanding: 1_950_000, status: "Finalized",
  lines: [{ jobName: "Cho ăn", hours: 100, hourlyRate: 30_000, amount: 3_000_000 }], payments: [payment({ voucherCode: "PC000077" })], attendance: [{ date: "2026-05-02", jobName: "Cho ăn", hours: 8 }],
});

beforeEach(() => {
  polyfillDialog();
  state.repo.employeeSlips.mockResolvedValue(slipPage());
  state.repo.slip.mockResolvedValue(slipDetail);
  state.repo.payments.mockResolvedValue(ok({ items: [payment(), payment({ id: ids.b, voucherCode: "PC000002", kind: "Advance", payrollId: null, payrollCode: null, amount: 150_000 })], total: 2, page: 1, pageSize: 15 }));
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("offers the two payroll tabs only when asked (Owner directory)", () => {
  const { rerender } = render(<EmployeeTabs idPrefix="x" active="information" onChange={vi.fn()} />);
  expect(screen.queryByRole("tab", { name: "Phiếu lương" })).toBeNull();
  rerender(<EmployeeTabs idPrefix="x" active="information" onChange={vi.fn()} payroll />);
  expect(screen.getByRole("tab", { name: "Phiếu lương" })).toBeTruthy();
  expect(screen.getByRole("tab", { name: "Nợ và tạm ứng" })).toBeTruthy();
  expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Thông tin", "Công việc", "Ngân hàng", "Tài khoản đăng nhập", "Phiếu lương", "Nợ và tạm ứng"]);
});

it("payslips tab: columns, a link to the sheet, and the slip detail opened under the row", async () => {
  const user = userEvent.setup();
  render(<EmployeePayslipsTab employeeId={ids.empA} />);
  const table = await screen.findByRole("table", { name: "Phiếu lương của nhân viên" });
  for (const heading of ["Mã phiếu lương", "Bảng lương", "Kỳ làm việc", "Tổng thu nhập", "Lương thực nhận", "Đã trả", "Còn cần trả", "Trạng thái"]) expect(within(table).getByRole("columnheader", { name: heading })).toBeTruthy();
  expect(state.repo.employeeSlips).toHaveBeenCalledWith(ids.empA, { page: 1, pageSize: 15 }, expect.anything());
  const link = within(table).getByRole("link", { name: /BL000001/ });
  expect(link.getAttribute("href")).toBe(`/operations/payroll?recordId=${ids.a}&search=BL000001`);
  expect(within(table).getByText("Đã chốt lương")).toBeTruthy();
  expect(state.repo.slip).not.toHaveBeenCalled();
  await user.click(within(table).getByRole("button", { name: "PL000001" }));
  await screen.findByRole("tablist", { name: "Nội dung phiếu lương" });
  expect(state.repo.slip).toHaveBeenCalledWith(ids.slipA, expect.anything());
  expect(screen.getByText("Cho ăn")).toBeTruthy();
  expect(screen.getByRole("columnheader", { name: "Đơn giá" })).toBeTruthy();
  await user.click(screen.getByRole("tab", { name: "Thanh toán" }));
  expect(screen.getByText("PC000077")).toBeTruthy();
  await user.click(screen.getByRole("tab", { name: "Chấm công chi tiết" }));
  expect(screen.getByText("02/05/2026")).toBeTruthy();
  await user.click(within(table).getByRole("button", { name: "PL000001" }));
  expect(screen.queryByRole("tablist", { name: "Nội dung phiếu lương" })).toBeNull();
});

it("payslips tab: empty for an employee without payslips, and an error with retry otherwise", async () => {
  state.repo.employeeSlips.mockResolvedValueOnce(slipPage([]));
  const { unmount } = render(<EmployeePayslipsTab employeeId={ids.empA} />);
  expect(await screen.findByText("Nhân viên chưa có phiếu lương.")).toBeTruthy();
  unmount();
  state.repo.employeeSlips.mockResolvedValueOnce(fail(503));
  const user = userEvent.setup();
  render(<EmployeePayslipsTab employeeId={ids.empA} />);
  expect((await screen.findByRole("alert")).textContent).toContain("Chưa kết nối được dịch vụ");
  await user.click(screen.getByRole("button", { name: "Tải lại" }));
  await screen.findByRole("table", { name: "Phiếu lương của nhân viên" });
});

it("debt tab: totals, finalized slips, payments and advances of the employee", async () => {
  render(<EmployeeDebtTab employeeId={ids.empA} employeeName="Nguyễn Văn A" />);
  await screen.findByRole("table", { name: "Phiếu lương đã chốt" });
  expect(state.repo.employeeSlips).toHaveBeenCalledWith(ids.empA, { status: "Finalized", page: 1, pageSize: 100 }, expect.anything());
  expect(state.repo.payments).toHaveBeenCalledWith(expect.objectContaining({ employeeId: ids.empA, page: 1 }), expect.anything());
  const summary = document.querySelector("p")!.textContent ?? "";
  expect(summary).toContain("Nợ cần trả"); expect(summary).toContain("2.000.000"); expect(summary).toContain("Tạm ứng đã chi"); expect(summary).toContain("150.000");
  const history = screen.getByRole("table", { name: "Thanh toán và tạm ứng của nhân viên" });
  for (const heading of ["Thời gian", "Mã phiếu chi", "Loại", "Phương thức", "Số tiền", "Bảng lương", "Trạng thái"]) expect(within(history).getByRole("columnheader", { name: heading })).toBeTruthy();
  expect(within(history).getByText("Trả lương")).toBeTruthy();
  expect(within(history).getByText("Tạm ứng")).toBeTruthy();
});

it("debt tab: Thanh toán lương opens the pop-up with this employee fixed and pays them", async () => {
  state.repo.payStandalone.mockResolvedValue(ok({ id: ids.pay }));
  const user = userEvent.setup();
  render(<EmployeeDebtTab employeeId={ids.empA} employeeName="Nguyễn Văn A" />);
  await user.click(await screen.findByRole("button", { name: "Thanh toán lương" }));
  const dialog = screen.getByRole("dialog", { name: "Thanh toán lương" });
  expect(within(dialog).getByText("Nguyễn Văn A")).toBeTruthy();
  expect(within(dialog).queryByRole("searchbox")).toBeNull();
  expect(within(dialog).queryByText(/tạm ứng lương và sẽ được trừ/)).toBeNull();
  expect(state.repo.payable).not.toHaveBeenCalled();
  await user.type(within(dialog).getByLabelText("Số tiền chi"), "400000");
  await user.click(within(dialog).getByRole("button", { name: "Tạo phiếu chi" }));
  await waitFor(() => expect(state.repo.payStandalone).toHaveBeenCalledWith(expect.objectContaining({ employeeId: ids.empA, amount: 400_000 })));
  expect(await screen.findByText("Đã tạo phiếu chi. Phiếu chi xuất hiện trong Sổ quỹ.")).toBeTruthy();
  await waitFor(() => expect(state.repo.employeeSlips.mock.calls.length).toBeGreaterThan(1));
});

it("debt tab: an employee with nothing outstanding gets the advance rule", async () => {
  state.repo.employeeSlips.mockResolvedValue(slipPage([], { outstanding: 0, advanceBalance: 0 }));
  const user = userEvent.setup();
  render(<EmployeeDebtTab employeeId={ids.empB} employeeName="Trần Thị B" />);
  await user.click(await screen.findByRole("button", { name: "Thanh toán lương" }));
  expect(within(screen.getByRole("dialog", { name: "Thanh toán lương" })).getByText(/tạm ứng lương và sẽ được trừ vào kỳ lương tiếp theo/)).toBeTruthy();
});
