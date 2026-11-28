import { createOperationsRepository, type Query } from "@/features/operations/repository";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import * as c from "./contracts";

/**
 * Data access of the payroll screens (through the BFF `/api/operations/payroll*`). Components only use this object so a test
 * or another adapter can replace it; they never call fetch themselves.
 */
const sheets = createOperationsRepository("payroll");
const payments = createOperationsRepository("payroll-payments");

export type SheetQuery = Readonly<{
  search: string; periodType: "" | c.PeriodType; statuses: readonly c.PayrollStatus[]; sortBy: string; sortDir: "asc" | "desc"; page: number; pageSize: number;
}>;
export type PaymentQuery = Readonly<{
  search: string; from: string; to: string; page: number; pageSize: number; employeeId?: string; payrollId?: string;
  method?: "" | c.PaymentMethod; kind?: "" | c.PaymentKind; status?: "" | c.PaymentStatus;
}>;
const filters = (q: Pick<SheetQuery, "search" | "periodType" | "statuses" | "sortBy" | "sortDir">): Query => ({
  search: q.search.trim() || undefined, periodType: q.periodType || undefined, status: q.statuses.join(",") || undefined, sortBy: q.sortBy, sortDir: q.sortDir,
});

/** A list read answered 404 (the endpoint is not there, or nothing is found) shows as an empty list, not as an error with a retry loop. */
const orEmpty = async <T,>(read: Promise<WorkspaceResult<T>>, empty: T): Promise<WorkspaceResult<T>> => {
  const result = await read;
  return result.status === "error" && result.httpStatus === 404 ? { status: "success", data: empty } : result;
};
const emptyPage = { items: [], total: 0, page: 1 };

export const payrollRepository = {
  list: (q: SheetQuery, signal?: AbortSignal) => orEmpty(sheets.read("list", { ...filters(q), page: String(q.page), pageSize: String(q.pageSize) }, c.sheetPage, signal),
    { ...emptyPage, pageSize: q.pageSize, summary: { total: 0, paid: 0, outstanding: 0 } }),
  detail: (id: string, signal?: AbortSignal) => sheets.read("detail", { id }, c.sheetDetail, signal),
  create: (body: c.CreateSheetBody) => sheets.write("create", body, c.sheetDetail),
  reload: (id: string, mode: "All" | "WorkingDaysOnly") => sheets.write("reload", { mode }, c.sheetDetail, id),
  /** `expected` = the total and number of payslips the Owner viewed; a changed sheet answers 409 TOTALS_CHANGED instead of finalizing. */
  finalize: (id: string, expenseMonth: string, expected?: { total: number; slips: number }) => sheets.write("finalize", { expenseMonth, ...(expected ? { expectedTotal: expected.total, expectedSlips: expected.slips } : {}) }, c.sheetDetail, id),
  cancel: (id: string) => sheets.write("cancel", {}, c.sheetDetail, id),
  /** Replaces the + / - lines of one payslip (the Owner, while the sheet is provisional); answers the whole sheet so its totals refresh. */
  saveAdjustments: (slipId: string, body: c.SaveAdjustmentsBody) => sheets.write("adjustments", body, c.sheetDetail, slipId),
  pay: (id: string, body: c.PaySheetBody, idempotencyKey?: string) => sheets.write("pay", body, c.voucherResult, id, undefined, idempotencyKey),
  employeeSlips: (employeeId: string, q: { status?: c.PayrollStatus; page: number; pageSize: number }, signal?: AbortSignal) =>
    orEmpty(sheets.read("employee-slips", { id: employeeId, status: q.status, page: String(q.page), pageSize: String(q.pageSize) }, c.employeeSlipPage, signal),
      { ...emptyPage, pageSize: q.pageSize, summary: { outstanding: 0, advanceBalance: 0 } }),
  slip: (slipId: string, signal?: AbortSignal) => sheets.read("slip", { id: slipId }, c.slipDetail, signal),
  exportSheet: (id: string, format: "pdf" | "xlsx" = "xlsx") => sheets.download({ id, format }),
  exportSlip: (id: string, format: "pdf" | "xlsx" = "xlsx") => sheets.download({ id, kind: "slip", format }),
  exportList: (q: SheetQuery) => sheets.download(filters(q)),

  payments: (query: PaymentQuery, signal?: AbortSignal) =>
    orEmpty(payments.read("list", { search: query.search.trim() || undefined, employeeId: query.employeeId, payrollId: query.payrollId, method: query.method || undefined, kind: query.kind || undefined, status: query.status || undefined,
      from: query.from || undefined, to: query.to || undefined, page: String(query.page), pageSize: String(query.pageSize) }, c.paymentPage, signal),
      { ...emptyPage, pageSize: query.pageSize }),
  /** The voucher of a wage or advance payment (id = its cash voucher), and the accounts that may be named as having paid it. */
  paymentDetail: (id: string, signal?: AbortSignal) => payments.read("detail", { id }, c.paymentDetail, signal),
  payers: (signal?: AbortSignal) => payments.read("payers", {}, c.payers, signal),
  updatePayment: (id: string, body: c.UpdatePaymentBody) => payments.write("update", body, c.paymentDetail, id),
  cancelPayment: (id: string, body: c.CancelPaymentBody) => payments.write("cancel", body, c.paymentDetail, id),
  payStandalone: (body: c.StandalonePaymentBody, idempotencyKey?: string) => payments.write("create", body, c.standalonePaymentResult, undefined, undefined, idempotencyKey),
};
