/*
 * Row shapes of the payroll screens. There is no payroll endpoint on the backend yet, so nothing builds these at runtime:
 * the screens receive them through optional props (default: empty) and the component tests inject samples the same way.
 * Replace the props with the real repository read when the API exists.
 */
export type PayrollStatus = "draft" | "pending" | "returned" | "final";

export const PAYROLL_STATUSES: readonly (readonly [PayrollStatus, string])[] = [
  ["draft", "Nháp"], ["pending", "Chờ chốt"], ["returned", "Đã trả lại"], ["final", "Đã chốt"],
];
export const payrollStatusLabel = (status: PayrollStatus) => PAYROLL_STATUSES.find(([key]) => key === status)?.[1] ?? status;

export type PayrollSlip = Readonly<{
  id: string; employeeName: string; employeeType: string;
  workLines: readonly Readonly<{ jobName: string; hours: number; hourlyRate: number }>[];
  subtotal: number; adjustment: number | null; adjustmentReason: string; net: number;
}>;
export type PayrollLaborCost = Readonly<{ id: string; raftName: string; zoneName: string; cycleName: string; cost: number }>;
export type PayrollPayment = Readonly<{ id: string; voucherCode: string; employeeName: string; paidOn: string; amount: number; method: string; status: string }>;

export type PayrollSheet = Readonly<{
  id: string; periodLabel: string;
  /** yyyy-MM-dd */ from: string; /** yyyy-MM-dd */ to: string;
  status: PayrollStatus; total: number | null; paymentLabel: string;
  slips: readonly PayrollSlip[]; laborCosts: readonly PayrollLaborCost[]; payments: readonly PayrollPayment[];
}>;

/** An employee who is still owed pay, for the payment screen. */
export type PayableLine = Readonly<{ id: string; employeeName: string; pay: number; paid: number; outstanding: number; bankAccount: string }>;

const normalize = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").toLowerCase().trim();

export type SheetFilter = Readonly<{ search: string; status: string; from: string; to: string }>;

/** Client-side filter over the rows the screen was given: period text, status, and overlap with the chosen date range. */
export function filterSheets(sheets: readonly PayrollSheet[], filter: SheetFilter) {
  const term = normalize(filter.search);
  return sheets.filter((sheet) =>
    (!term || normalize(sheet.periodLabel).includes(term))
    && (!filter.status || sheet.status === filter.status)
    && (!filter.from || sheet.to >= filter.from)
    && (!filter.to || sheet.from <= filter.to));
}

export type PayableFilter = Readonly<{ search: string; outstandingFrom: string; outstandingTo: string }>;

export function filterPayables(lines: readonly PayableLine[], filter: PayableFilter) {
  const term = normalize(filter.search);
  return lines.filter((line) =>
    (!term || normalize(line.employeeName).includes(term))
    && (!filter.outstandingFrom || line.outstanding >= Number(filter.outstandingFrom))
    && (!filter.outstandingTo || line.outstanding <= Number(filter.outstandingTo)));
}
