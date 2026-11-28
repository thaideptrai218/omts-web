// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast-provider";
import { detail, ids, ok, polyfillDialog, slip, slipDetail } from "./payroll-test-fixtures";

const state = vi.hoisted(() => ({
  context: { identity: { subjectType: "CooperativeOwner" }, permissions: { functionPermissions: [] as unknown[] } },
  repo: { slip: vi.fn(), saveAdjustments: vi.fn(), exportSlip: vi.fn() },
}));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => state.context }));
vi.mock("@/features/employee-api/employee-kind-badge-by-id", () => ({ EmployeeKindBadgeById: () => null }));
vi.mock("./repository", () => ({ payrollRepository: state.repo }));
import { FinalizeReasonList } from "./payroll-finalize-problems";
import { PayrollSheetSlipsTab } from "./payroll-sheet-slips-tab";
import { PayrollSlipDetail } from "./payroll-slip-detail";
import { adjustmentIssue } from "./payroll-slip-adjustments";

const staffSlip = (over = {}) => slipDetail({ salaryType: "FixedMonthly", status: "Provisional", mainPay: 8_000_000, fixedPay: 8_000_000, shiftPay: 600_000, shifts: 2, income: 8_600_000, net: 8_600_000, paid: 0, outstanding: 8_600_000,
  lines: [{ jobName: "Thu hoạch", hours: 6, hourlyRate: 0, amount: 600_000, kind: "FieldShift", shifts: 2, shiftRate: 300_000 }], allowsAdjustments: true, ...over });
const renderDetail = (onSheetChanged = vi.fn()) => render(<ToastProvider><PayrollSlipDetail slipId={ids.slipA} onSheetChanged={onSheetChanged} /></ToastProvider>);

beforeEach(() => { polyfillDialog(); state.context.identity.subjectType = "CooperativeOwner"; state.repo.slip.mockResolvedValue(ok(staffSlip())); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("the sheet lists one row per payslip with the salary type, the gross pay and what is still owed", () => {
  render(<PayrollSheetSlipsTab sheet={detail({ slips: [
    slip({ salaryType: "FixedMonthly", hours: 0, shifts: 2, mainPay: 8_000_000, shiftPay: 600_000, bonus: 500_000, manualDeduction: 200_000, advanceDeduction: 100_000, income: 8_900_000, net: 8_800_000, paid: 0, outstanding: 8_800_000, hourlyRateNote: null }),
    slip({ id: ids.slipB, code: "PL000002", employeeId: ids.empB, employeeName: "Trần Thị B", salaryType: "PerShift", hours: 21, shifts: 7, hourlyRateNote: "300.000 đ/ca", mainPay: 2_100_000, income: 2_100_000, net: 2_100_000, paid: 0, outstanding: 2_100_000 }),
    slip({ id: "4b0a1c6e-5a1e-4f4b-9c5e-0a7f6a1c9d13", code: "PL000003", employeeId: "4b0a1c6e-5a1e-4f4b-9c5e-0a7f6a1c9d23", employeeName: "Lê Văn C", salaryType: null, hours: 0, mainPay: 0, income: 0, net: 0, paid: 0, outstanding: 0 }),
  ] })} />);
  const table = screen.getByRole("table", { name: "Phiếu lương" });
  for (const heading of ["Mã phiếu", "Tên nhân viên", "Loại lương", "Tổng lương", "Còn cần trả", "Trạng thái"]) expect(within(table).getAllByRole("columnheader", { name: heading }).length).toBeGreaterThan(0);
  const rows = within(table).getAllByRole("row");
  const fixed = rows.find((row) => row.textContent?.includes("PL000001"))!, perShift = rows.find((row) => row.textContent?.includes("PL000002"))!, unset = rows.find((row) => row.textContent?.includes("PL000003"))!;
  expect(fixed.textContent).toContain("Cố định tháng"); expect(fixed.textContent).toContain("8.900.000"); expect(fixed.textContent).toContain("8.800.000");
  expect(perShift.textContent).toContain("Theo ca"); expect(perShift.textContent).toContain("2.100.000");
  const link = within(unset).getByRole("link", { name: "Chưa thiết lập lương" });
  expect(link.getAttribute("href")).toBe("/workspace/employees?recordId=4b0a1c6e-5a1e-4f4b-9c5e-0a7f6a1c9d23&search=L%C3%AA%20V%C4%83n%20C");
  expect(screen.getByTestId("payroll-slips-total").textContent).toContain("Tổng (3 nhân viên)");
});

it("a payslip shows the fixed salary, field shifts with their shift rate and the new pay figures", async () => {
  renderDetail();
  const panel = await screen.findByRole("region", { name: "Chi tiết phiếu lương PL000001" });
  const lines = within(panel).getByRole("table", { name: "Thu nhập theo công việc" });
  expect(within(lines).getByText("Lương cố định tháng")).toBeTruthy();
  expect(within(lines).getByText("Ca ngoài hiện trường")).toBeTruthy();
  expect(within(lines).getByText("2 ca")).toBeTruthy();
  expect(lines.textContent).toContain("300.000");
  for (const label of ["Loại lương chính", "Số ca", "Lương chính", "Tiền ca", "Thưởng", "Khấu trừ", "Trừ tạm ứng (dự kiến)", "Thực nhận", "Đã trả", "Còn cần trả"]) expect(within(panel).getByText(label, { selector: "dt" })).toBeTruthy();
});

const openEditor = async (user: ReturnType<typeof userEvent.setup>) => {
  await screen.findByRole("region", { name: "Chi tiết phiếu lương PL000001" });
  await user.click(screen.getByRole("button", { name: "Sửa thưởng của PL000001" }));
  return screen.findByRole("dialog", { name: "Thưởng / Khấu trừ — PL000001" });
};

it("the Owner adds a + and a - line in the popup of an internal payslip of a provisional sheet and saves the whole list", async () => {
  const onSheetChanged = vi.fn(), user = userEvent.setup();
  state.repo.saveAdjustments.mockResolvedValue(ok(detail()));
  renderDetail(onSheetChanged);
  const editor = await openEditor(user);
  const save = within(editor).getByRole("button", { name: "Lưu thưởng / khấu trừ" }) as HTMLButtonElement;
  expect(save.disabled).toBe(true);
  await user.click(within(editor).getByRole("button", { name: "Thêm thưởng" }));
  fireEvent.change(within(editor).getByLabelText("Thưởng (+), dòng 1: số tiền"), { target: { value: "500000" } });
  await user.type(within(editor).getByLabelText("Thưởng (+), dòng 1: lý do"), "  Thưởng chuyên cần ");
  await user.click(within(editor).getByRole("button", { name: "Thêm khấu trừ" }));
  fireEvent.change(within(editor).getByLabelText("Khấu trừ (−), dòng 1: số tiền"), { target: { value: "200000" } });
  await user.type(within(editor).getByLabelText("Khấu trừ (−), dòng 1: lý do"), "Đi trễ");
  await user.click(save);
  await waitFor(() => expect(state.repo.saveAdjustments).toHaveBeenCalledWith(ids.slipA, { items: [{ kind: "Bonus", amount: 500_000, reason: "Thưởng chuyên cần" }, { kind: "Deduction", amount: 200_000, reason: "Đi trễ" }] }));
  await waitFor(() => expect(onSheetChanged).toHaveBeenCalledTimes(1));
  expect(await screen.findByText("Đã lưu thưởng và khấu trừ của Nguyễn Văn A.")).toBeTruthy();
});

it("refuses a line without a reason or an amount, and a deduction above the income, before any request", async () => {
  const user = userEvent.setup();
  renderDetail();
  const editor = await openEditor(user);
  await user.click(within(editor).getByRole("button", { name: "Thêm thưởng" }));
  await user.type(within(editor).getByLabelText("Thưởng (+), dòng 1: lý do"), "Thưởng");
  await user.click(within(editor).getByRole("button", { name: "Lưu thưởng / khấu trừ" }));
  expect((await within(editor).findByRole("alert")).textContent).toContain("Dòng 1: nhập số tiền");
  expect(state.repo.saveAdjustments).not.toHaveBeenCalled();
});

it("shows the reason the backend gives for a refused line (400 with a hint) and keeps the lines being edited", async () => {
  const user = userEvent.setup();
  state.repo.saveAdjustments.mockResolvedValue({ status: "error", httpStatus: 400, code: "MSG-GEN-01", uncertain: false, hrProblem: { field: "Adjustments", hint: "Khấu trừ không được lớn hơn thu nhập của phiếu lương." } });
  renderDetail();
  const editor = await openEditor(user);
  await user.click(within(editor).getByRole("button", { name: "Thêm thưởng" }));
  fireEvent.change(within(editor).getByLabelText("Thưởng (+), dòng 1: số tiền"), { target: { value: "1000" } });
  await user.type(within(editor).getByLabelText("Thưởng (+), dòng 1: lý do"), "Thưởng");
  await user.click(within(editor).getByRole("button", { name: "Lưu thưởng / khấu trừ" }));
  expect((await within(editor).findByRole("alert")).textContent).toContain("Khấu trừ không được lớn hơn thu nhập của phiếu lương.");
  expect((within(editor).getByLabelText("Thưởng (+), dòng 1: lý do") as HTMLInputElement).value).toBe("Thưởng");
});

it("a finalized sheet, a non-owner and a seasonal worker see no editor; the lines of a finalized internal slip are read-only", async () => {
  const lines = [{ kind: "Bonus" as const, amount: 500_000, reason: "Thưởng chuyên cần" }, { kind: "Deduction" as const, amount: 200_000, reason: "Đi trễ" }];
  state.repo.slip.mockResolvedValue(ok(staffSlip({ status: "Finalized", adjustments: lines })));
  renderDetail();
  const section = await screen.findByRole("region", { name: "Thưởng và khấu trừ" });
  expect(within(section).queryByRole("button", { name: "Thêm dòng" })).toBeNull();
  expect(section.textContent).toContain("Thưởng chuyên cần"); expect(section.textContent).toContain("Đi trễ");
  cleanup();
  state.repo.slip.mockResolvedValue(ok(staffSlip({ allowsAdjustments: false })));
  renderDetail();
  await screen.findByRole("region", { name: "Chi tiết phiếu lương PL000001" });
  expect(screen.queryByRole("region", { name: "Thưởng và khấu trừ" })).toBeNull();
  cleanup();
  state.context.identity.subjectType = "Staff";
  state.repo.slip.mockResolvedValue(ok(staffSlip()));
  renderDetail();
  await screen.findByRole("region", { name: "Chi tiết phiếu lương PL000001" });
  expect(screen.queryByRole("region", { name: "Thưởng và khấu trừ" })).toBeNull();
});

it("adjustmentIssue: empty drafts are fine, 51 lines are not", () => {
  const base = { mainPay: 1_000_000, shiftPay: 0 };
  expect(adjustmentIssue([], base)).toBeUndefined();
  const line = (key: number) => ({ key, kind: "Bonus" as const, amount: 1, reason: "x" });
  expect(adjustmentIssue(Array.from({ length: 50 }, (_, key) => line(key)), base)).toBeUndefined();
  expect(adjustmentIssue(Array.from({ length: 51 }, (_, key) => line(key)), base)).toContain("Tối đa 50");
  expect(adjustmentIssue([{ key: 1, kind: "Bonus", amount: 500, reason: "x" }, { key: 2, kind: "Deduction", amount: 1_000_500, reason: "y" }], base)).toBeUndefined();
});

it("finalize problems: a missing salary links to the employee, a missing shift rate names the job and days, a negative slip says what to do", () => {
  render(<FinalizeReasonList fixed={new Set()} onFix={vi.fn()} items={[
    { kind: "NoSalarySetup", employeeId: ids.empA, employeeName: "Nguyễn Văn A" },
    { kind: "NoShiftRate", jobName: "Thu hoạch", dates: ["2026-10-02", "2026-10-03"] },
    { kind: "NegativePay", employeeId: ids.empB, employeeName: "Trần Thị B" },
    { kind: "NoRate", employeeName: "Lê Văn C", jobName: "Vệ sinh", dates: ["2026-10-05"] },
  ]} />);
  const list = screen.getByRole("list", { name: "Lý do chưa chốt được" });
  expect(within(list).getByText("Chưa thiết lập lương", { exact: false }).textContent).toContain("Chưa thiết lập lương");
  expect(within(list).getByRole("link", { name: "Thiết lập lương" }).getAttribute("href")).toBe(`/workspace/employees?recordId=${ids.empA}&search=Nguy%E1%BB%85n%20V%C4%83n%20A`);
  expect(list.textContent).toContain("Loại việc Thu hoạch chưa có đơn giá ca ngày 02/10/2026, 03/10/2026.");
  expect(list.textContent).toContain("Khấu trừ lớn hơn thu nhập của phiếu lương");
  expect(list.textContent).toContain("Chưa có đơn giá giờ (Vệ sinh): 05/10/2026");
});
