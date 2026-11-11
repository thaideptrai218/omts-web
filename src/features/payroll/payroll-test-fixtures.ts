import type { PaymentRow, SheetDetail, SheetRow, Slip, SlipDetail } from "./contracts";

/** Test-only builders and the mocked repository shape; production code never imports this file. */
export const ids = { a: "4b0a1c6e-5a1e-4f4b-9c5e-0a7f6a1c9d01", b: "4b0a1c6e-5a1e-4f4b-9c5e-0a7f6a1c9d02", slipA: "4b0a1c6e-5a1e-4f4b-9c5e-0a7f6a1c9d11", slipB: "4b0a1c6e-5a1e-4f4b-9c5e-0a7f6a1c9d12",
  empA: "4b0a1c6e-5a1e-4f4b-9c5e-0a7f6a1c9d21", empB: "4b0a1c6e-5a1e-4f4b-9c5e-0a7f6a1c9d22", pay: "4b0a1c6e-5a1e-4f4b-9c5e-0a7f6a1c9d31" };

export const row = (over: Partial<SheetRow> = {}): SheetRow => ({ id: ids.a, code: "BL000001", name: "Bảng lương tháng 5/2026", periodType: "Monthly", from: "2026-05-01", to: "2026-05-31",
  total: 3_000_000, paid: 1_000_000, outstanding: 2_000_000, status: "Provisional", createdAt: "2026-06-01T01:00:00Z", ...over });
export const slip = (over: Partial<Slip> = {}): Slip => ({ id: ids.slipA, code: "PL000001", employeeId: ids.empA, employeeCode: "NV001", employeeName: "Nguyễn Văn A", hours: 100, hourlyRateNote: "30.000",
  mainPay: 3_000_000, bonus: 0, deduction: 0, income: 3_000_000, net: 3_000_000, paid: 1_000_000, outstanding: 2_000_000, ...over });
export const detail = (over: Partial<SheetDetail> = {}): SheetDetail => ({ ...row(), scope: "All", expenseMonth: null, note: null, createdBy: "Chủ hợp tác xã", slips: [slip()], ...over });
export const payment = (over: Partial<PaymentRow> = {}): PaymentRow => ({ id: ids.pay, voucherCode: "PC000001", paidAt: "2026-11-02T03:00:00Z", employeeId: ids.empA, employeeName: "Nguyễn Văn A",
  payrollId: ids.a, payrollCode: "BL000001", method: "Cash", amount: 500_000, kind: "Wage", status: "Recorded", ...over });
export const slipDetail = (over: Partial<SlipDetail> = {}): SlipDetail => ({ id: ids.slipA, code: "PL000001", payrollId: ids.a, payrollCode: "BL000001", employeeId: ids.empA, employeeName: "Nguyễn Văn A", from: "2026-05-01", to: "2026-05-31",
  hours: 100, mainPay: 3_000_000, bonus: 0, deduction: 0, income: 3_000_000, net: 3_000_000, paid: 1_000_000, outstanding: 2_000_000, status: "Finalized",
  lines: [{ jobName: "Thu hoạch", hours: 100, hourlyRate: 30_000, amount: 3_000_000 }], payments: [], attendance: [{ date: "2026-05-02", jobName: "Thu hoạch", hours: 8 }], ...over });
export const ok = <T,>(data: T) => ({ status: "success" as const, data });
export const fail = (httpStatus: number, code?: string) => ({ status: "error" as const, httpStatus, code, uncertain: false });

/** jsdom has no modal <dialog>: open and close are attribute toggles. */
export function polyfillDialog() {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
}
