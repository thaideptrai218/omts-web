import "server-only";
import { z } from "zod";
import * as c from "@/features/payroll/contracts";
import type { OperationPlan } from "./operation-plan";

/**
 * Backend plans for "Bảng lương" (area `payroll`) and "Thanh toán lương" (area `payroll-payments`), strict like the other
 * operation plans: unknown or repeated query names, unknown actions and bodies with extra fields are rejected before any
 * backend call. `operationAllowed` runs in the operations route: the Owner does everything, a Staff account (the Accountant) does the actions its PAYROLL grants allow (View, Create, Edit, Export); finalizing and cancelling a sheet and payslip adjustments are refused to it by the backend. The list `status` filter travels as one comma-separated value and becomes repeated `status=` for the backend.
 */
const id = z.guid(), empty = z.strictObject({});
const page = z.string().regex(/^[1-9]\d{0,6}$/), pageSize = z.string().regex(/^[1-9]\d{0,2}$/).refine((v) => Number(v) <= 100);
const statuses = z.string().refine((v) => v.split(",").every((s) => (c.payrollStatuses as readonly string[]).includes(s)) && new Set(v.split(",")).size === v.split(",").length);
const filters = {
  search: z.string().max(200).optional(), periodType: c.periodType.optional(), status: statuses.optional(), from: z.iso.date().optional(), to: z.iso.date().optional(),
  sortBy: z.enum(["code", "name", "from", "total", "paid", "status"]).optional(), sortDir: z.enum(["asc", "desc"]).optional(),
};
const sheetQuery = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("list"), ...filters, page: page.optional(), pageSize: pageSize.optional() }),
  // `kind: "slip"` with an id exports one payslip instead of a sheet.
  z.strictObject({ action: z.literal("export"), id: id.optional(), kind: z.literal("slip").optional(), ...filters, format: z.enum(["pdf", "xlsx"]).optional() }),
  z.strictObject({ action: z.literal("detail"), id }),
  z.strictObject({ action: z.literal("slip"), id }),
  z.strictObject({ action: z.literal("employee-slips"), id, status: c.payrollStatus.optional(), page: page.optional(), pageSize: pageSize.optional() }),
]);
const paymentQuery = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("list"), search: z.string().max(200).optional(), employeeId: id.optional(), payrollId: id.optional(), method: c.paymentMethod.optional(), kind: c.paymentKind.optional(), status: c.paymentStatus.optional(), from: z.iso.date().optional(), to: z.iso.date().optional(), page: page.optional(), pageSize: pageSize.optional() }),
  z.strictObject({ action: z.literal("payable"), search: z.string().max(200).optional(), includeAll: z.literal("true").optional() }),
  z.strictObject({ action: z.literal("detail"), id }),
  z.strictObject({ action: z.literal("payers") }),
]);
const mutation = z.strictObject({ action: z.string(), id: id.optional(), zoneId: z.undefined().optional(), body: z.unknown().default({}), idempotencyKey: z.string().regex(/^[A-Za-z0-9-]{8,64}$/).optional() });

/** Query string for the backend list/export: repeated `status`, only the names the contract defines. */
function backendFilters(values: Record<string, string | undefined>, names: readonly string[]) {
  const out = new URLSearchParams();
  for (const name of names) {
    const value = values[name];
    if (!value) continue;
    if (name === "status") for (const status of value.split(",")) out.append("status", status); else out.set(name, value);
  }
  return out;
}
const withQuery = (path: string, query: URLSearchParams) => query.size ? `${path}?${query}` : path;

export function payrollPlan(area: "payroll" | "payroll-payments", method: string, query: URLSearchParams, input?: unknown): OperationPlan | undefined {
  if (new Set(query.keys()).size !== query.size) return;
  if (method === "GET") return area === "payroll" ? readSheets(query) : readPayments(query);
  if (method !== "POST" || query.size) return;
  const parsed = mutation.safeParse(input);
  if (!parsed.success) return;
  const { action, id: sheetId, body, idempotencyKey } = parsed.data;
  const write = (path: string, validator: z.ZodType, schema: z.ZodType, permission: string, bodyless = false, verb: "POST" | "PUT" = "POST"): OperationPlan | undefined => {
    const values = validator.safeParse(body);
    return values.success ? { area, action, path, method: verb, permission, schema, ...(bodyless ? {} : { body: values.data }) } : undefined;
  };
  if (area === "payroll-payments") {
    if (sheetId) {
      // A voucher (its id is the cash voucher's): the time, method, note and payer can change, and a Recorded one can be cancelled; the answer is the voucher.
      const path = `/api/payroll-payments/${sheetId}`;
      const plan = action === "update" ? write(path, c.updatePayment, c.paymentDetail, "Edit", false, "PUT") : action === "cancel" ? write(`${path}/cancel`, c.cancelPayment, c.paymentDetail, "Edit") : undefined;
      return plan && { ...plan, expectedId: sheetId };
    }
    const plan = action === "create" ? write("/api/payroll-payments", c.standalonePayment, c.standalonePaymentResult, "Create") : undefined;
    return plan && { ...plan, idempotencyKey };
  }
  if (action === "create") return sheetId ? undefined : write("/api/payrolls", c.createSheet, c.sheetDetail, "Create");
  if (!sheetId) return;
  // The + / - lines of a payslip (the id is the slip's): the Owner alone, so the permission is the one only the Owner holds; the answer is the whole sheet.
  if (action === "adjustments") return write(`/api/payroll-slips/${sheetId}/adjustments`, c.saveAdjustments, c.sheetDetail, "Delete", false, "PUT");
  const base = `/api/payrolls/${sheetId}`;
  const plan = action === "reload" ? write(`${base}/reload`, c.reloadSheet, c.sheetDetail, "Edit")
    : action === "finalize" ? write(`${base}/finalize`, c.finalizeSheet, c.sheetDetail, "Edit")
    : action === "cancel" ? write(`${base}/cancel`, empty, c.sheetDetail, "Delete", true)
    : action === "pay" ? write(`${base}/payments`, c.paySheet, c.voucherResult, "Create") : undefined;
  return plan && (action !== "pay" ? { ...plan, expectedId: sheetId } : { ...plan, idempotencyKey });
}

function readSheets(query: URLSearchParams): OperationPlan | undefined {
  const q = sheetQuery.safeParse(Object.fromEntries(query));
  const values = Object.fromEntries(query) as Record<string, string | undefined>;
  if (!q.success || values.from && values.to && values.from > values.to) return;
  const list = ["search", "periodType", "status", "from", "to", "page", "pageSize", "sortBy", "sortDir"];
  const base = { area: "payroll" as const, action: q.data.action, method: "GET" as const };
  if (q.data.action === "slip") return { ...base, permission: "View", path: `/api/payroll-slips/${q.data.id}`, schema: c.slipDetail, expectedId: q.data.id };
  if (q.data.action === "employee-slips") return { ...base, permission: "View", path: withQuery(`/api/employees/${q.data.id}/payslips`, backendFilters(values, ["status", "page", "pageSize"])), schema: c.employeeSlipPage };
  if (q.data.action === "detail") return { ...base, permission: "View", path: `/api/payrolls/${q.data.id}`, schema: c.sheetDetail, expectedId: q.data.id };
  if (q.data.action === "list") return { ...base, permission: "View", path: withQuery("/api/payrolls", backendFilters(values, list)), schema: c.sheetPage };
  // Printable files: the sheet and the payslip come as PDF or Excel (default Excel); the list stays Excel only.
  if (q.data.kind && !q.data.id) return;
  if (q.data.format && !q.data.id) return;
  if (q.data.kind === "slip") return fileOf(`/api/payroll-slips/${q.data.id}/export`, q.data.format, base);
  if (q.data.id) return fileOf(`/api/payrolls/${q.data.id}/export`, q.data.format, base);
  const path = withQuery("/api/payrolls/export", backendFilters(values, list.slice(0, 5).concat(["sortBy", "sortDir"])));
  return { ...base, permission: "Export", path, schema: empty, file: "export" };
}

function fileOf(path: string, format: "pdf" | "xlsx" | undefined, base: { area: "payroll"; action: string; method: "GET" }): OperationPlan {
  return { ...base, permission: "Export", path: format ? `${path}?format=${format}` : path, schema: empty, file: "export", ...(format === "pdf" ? { exportFormat: "pdf" as const } : {}) };
}

function readPayments(query: URLSearchParams): OperationPlan | undefined {
  const q = paymentQuery.safeParse(Object.fromEntries(query));
  const values = Object.fromEntries(query) as Record<string, string | undefined>;
  if (!q.success || values.from && values.to && values.from > values.to) return;
  const base = { area: "payroll-payments" as const, action: q.data.action, method: "GET" as const, permission: "View" };
  if (q.data.action === "detail") return { ...base, path: `/api/payroll-payments/${q.data.id}`, schema: c.paymentDetail, expectedId: q.data.id };
  if (q.data.action === "payers") return { ...base, path: "/api/payroll-payments/payers", schema: c.payers };
  return q.data.action === "list"
    ? { ...base, path: withQuery("/api/payroll-payments", backendFilters(values, ["search", "employeeId", "payrollId", "method", "kind", "status", "from", "to", "page", "pageSize"])), schema: c.paymentPage }
    : { ...base, path: withQuery("/api/payrolls/payable-employees", backendFilters(values, ["search", "includeAll"])), schema: c.payableEmployees };
}
