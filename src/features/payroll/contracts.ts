import { z } from "zod";

/**
 * Wire contract of the payroll screens (docs/reports/PAYROLL_API_CONTRACT_2026-11-11.md). Money is integer VND, dates are
 * yyyy-MM-dd, instants are ISO-8601. Responses are parsed leniently (extra fields ignored); requests are strict so the BFF
 * never forwards fields it does not know.
 */
const id = z.guid(), date = z.iso.date(), money = z.number().int(), text = z.string();

export const periodTypes = ["Monthly", "Custom"] as const;
export const payrollStatuses = ["Creating", "Provisional", "Finalized", "Cancelled"] as const;
export const periodType = z.enum(periodTypes);
export const payrollStatus = z.enum(payrollStatuses);
export const paymentMethod = z.enum(["Cash", "BankTransfer"]);
export type PeriodType = z.infer<typeof periodType>;
export type PayrollStatus = z.infer<typeof payrollStatus>;
export type PaymentMethod = z.infer<typeof paymentMethod>;

export const sheetRow = z.object({ id, code: text, name: text, periodType, from: date, to: date, total: money, paid: money, outstanding: money, status: payrollStatus, createdAt: text });
export const sheetPage = z.object({
  items: z.array(sheetRow), total: z.number().int(), page: z.number().int(), pageSize: z.number().int(),
  summary: z.object({ total: money, paid: money, outstanding: money }),
});

export const slip = z.object({
  id, code: text, employeeId: id, employeeCode: text, employeeName: text, hours: z.number(), hourlyRateNote: text.nullable().optional(),
  mainPay: money, bonus: money, deduction: money, income: money, net: money, paid: money, outstanding: money,
});
export const sheetDetail = z.object({
  id, code: text, name: text, periodType, from: date, to: date, scope: z.enum(["All", "Selected"]), status: payrollStatus,
  expenseMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).nullable(), note: text.nullable(), createdBy: text.nullable(), createdAt: text,
  total: money, paid: money, outstanding: money, slips: z.array(slip),
});

export const voucherResult = z.object({ vouchers: z.array(z.object({ id, code: text, slipId: id, employeeName: text, amount: money })) });

export const paymentRow = z.object({
  id, voucherCode: text, paidAt: text, employeeId: id, employeeName: text, payrollId: id.nullable(), payrollCode: text.nullable(), method: paymentMethod, amount: money,
  kind: z.enum(["Wage", "Advance"]), status: z.enum(["Recorded", "Cancelled"]),
});
const slipPayment = z.object({ id, voucherCode: text, paidAt: text, method: paymentMethod, amount: money, kind: z.enum(["Wage", "Advance"]), status: z.enum(["Recorded", "Cancelled"]) });
/** KiotViet section 7: the payslips of one employee, and one payslip with its income lines, payments and attendance. */
export const employeeSlipRow = z.object({ id, code: text, payrollId: id, payrollCode: text, payrollName: text, from: date, to: date, income: money, net: money, paid: money, outstanding: money, status: payrollStatus });
export const employeeSlipPage = z.object({
  items: z.array(employeeSlipRow), total: z.number().int(), page: z.number().int(), pageSize: z.number().int(), summary: z.object({ outstanding: money, advanceBalance: money }),
});
export const slipDetail = z.object({
  id, code: text, payrollId: id, payrollCode: text, employeeId: id, employeeName: text, from: date, to: date, hours: z.number(), mainPay: money, bonus: money, deduction: money, income: money, net: money, paid: money, outstanding: money, status: payrollStatus,
  lines: z.array(z.object({ jobName: text, hours: z.number(), hourlyRate: money, amount: money })), payments: z.array(slipPayment),
  attendance: z.array(z.object({ date, jobName: text, hours: z.number() })),
});
export const standalonePaymentResult = z.object({ id });
export const paymentPage = z.object({ items: z.array(paymentRow), total: z.number().int(), page: z.number().int(), pageSize: z.number().int() });
export const payableEmployees = z.object({ items: z.array(z.object({ employeeId: id, code: text, name: text, outstanding: money })) });

/** Request bodies (strict). */
export const createSheet = z.strictObject({
  periodType, from: date, to: date, scope: z.enum(["All", "Selected"]), employeeIds: z.array(id).min(1).max(500).optional(),
}).refine((v) => v.from <= v.to, { path: ["to"] }).refine((v) => (v.scope === "Selected") === !!v.employeeIds?.length, { path: ["employeeIds"] });
export const reloadSheet = z.strictObject({ mode: z.enum(["All", "WorkingDaysOnly"]) });
export const finalizeSheet = z.strictObject({ expenseMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) });
const instant = z.string().max(40).refine((v) => !Number.isNaN(Date.parse(v)));
export const paySheet = z.strictObject({
  paidAt: instant, method: paymentMethod, note: text.max(500),
  lines: z.array(z.strictObject({ slipId: id, amount: z.number().int().min(1) })).min(1).max(500),
});
export const standalonePayment = z.strictObject({ employeeId: id, amount: z.number().int().min(1), paidAt: instant, method: paymentMethod, note: text.max(500) });

export type SheetRow = z.infer<typeof sheetRow>;
export type SheetPage = z.infer<typeof sheetPage>;
export type Slip = z.infer<typeof slip>;
export type SheetDetail = z.infer<typeof sheetDetail>;
export type EmployeeSlipRow = z.infer<typeof employeeSlipRow>;
export type EmployeeSlipPage = z.infer<typeof employeeSlipPage>;
export type SlipDetail = z.infer<typeof slipDetail>;
export type PaymentRow = z.infer<typeof paymentRow>;
export type PaymentPage = z.infer<typeof paymentPage>;
export type PayableEmployee = z.infer<typeof payableEmployees>["items"][number];
export type CreateSheetBody = z.infer<typeof createSheet>;
export type PaySheetBody = z.infer<typeof paySheet>;
export type StandalonePaymentBody = z.infer<typeof standalonePayment>;
