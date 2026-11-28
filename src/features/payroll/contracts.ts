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
/** Whose pay a sheet covers: everyone, only internal (Staff) or seasonal employees by their type on the period end, or the employees picked. */
export const payrollScope = z.enum(["All", "Staff", "SeasonalWorker", "Selected"]);
export const payrollStatus = z.enum(payrollStatuses);
export const paymentMethod = z.enum(["Cash", "BankTransfer"]);
export const paymentKind = z.enum(["Wage", "Advance"]);
export const paymentStatus = z.enum(["Recorded", "Cancelled"]);
/** How the employee is paid on the slip: a fixed monthly amount, by the shift, or by the hour; null for an internal employee with no salary setup. */
export const slipSalaryType = z.enum(["FixedMonthly", "PerShift", "Hourly"]);
export const adjustmentKind = z.enum(["Bonus", "Deduction"]);
/** One + (Bonus) or - (Deduction) line of a payslip. */
export const slipAdjustment = z.object({ kind: adjustmentKind, amount: z.number().int(), reason: z.string() });
/** Hourly: hours x hourly rate. Shift: shifts x shift rate (part of the main pay). FieldShift: shifts of field work x shift rate (the shift pay of a fixed salary). */
export const payLineKind = z.enum(["Hourly", "Shift", "FieldShift"]);
export type PeriodType = z.infer<typeof periodType>;
export type PayrollScope = z.infer<typeof payrollScope>;
export type PayrollStatus = z.infer<typeof payrollStatus>;
export type PaymentMethod = z.infer<typeof paymentMethod>;
export type PaymentKind = z.infer<typeof paymentKind>;
export type PaymentStatus = z.infer<typeof paymentStatus>;
export type SlipSalaryType = z.infer<typeof slipSalaryType>;
export type SlipAdjustment = z.infer<typeof slipAdjustment>;
export type PayLineKind = z.infer<typeof payLineKind>;

export const sheetRow = z.object({ id, code: text, name: text, periodType, from: date, to: date, total: money, paid: money, outstanding: money, status: payrollStatus, createdAt: text });
export const sheetPage = z.object({
  items: z.array(sheetRow), total: z.number().int(), page: z.number().int(), pageSize: z.number().int(),
  summary: z.object({ total: money, paid: money, outstanding: money }),
});

/**
 * A payslip of a sheet. income = mainPay + shiftPay + bonus - manualDeduction; net = income - advanceDeduction (the advances taken off, a preview until the sheet is finalized).
 * `adjustments` are the + / - lines of an internal employee; `allowsAdjustments` is true for those only.
 */
export const slip = z.object({
  id, code: text, employeeId: id, employeeCode: text, employeeName: text, salaryType: slipSalaryType.nullable(), hours: z.number(), shifts: z.number(), hourlyRateNote: text.nullable().optional(),
  mainPay: money, shiftPay: money, bonus: money, manualDeduction: money, advanceDeduction: money, income: money, net: money, paid: money, outstanding: money,
  adjustments: z.array(slipAdjustment), allowsAdjustments: z.boolean(),
});
/** An employee with pay in the period who is not on the sheet because another live sheet of an overlapping period already has them. */
export const leftOutEmployee = z.object({ employeeId: id, employeeName: text, payrollId: id, payrollCode: text, from: date, to: date });
export type LeftOutEmployee = z.infer<typeof leftOutEmployee>;
export const sheetDetail = z.object({
  id, code: text, name: text, periodType, from: date, to: date, scope: payrollScope, status: payrollStatus,
  expenseMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).nullable(), note: text.nullable(), createdBy: text.nullable(), createdAt: text,
  total: money, paid: money, outstanding: money, slips: z.array(slip), employeeCount: z.number().int().optional(),
  /** UTC instant of the last calculation (create, reload or finalize); the sheet screen shows it as "Cập nhật lần cuối". */
  calculatedAt: z.string().nullish(),
  /** Who finalized the sheet and when (null until then). */
  finalizedBy: text.nullish(), finalizedAt: z.string().nullish(),
  /** Employees left out because another sheet of an overlapping period has them (create, reload and read). */
  leftOut: z.array(leftOutEmployee).nullish(),
});

export const voucherResult = z.object({ vouchers: z.array(z.object({ id, code: text, slipId: id, employeeName: text, amount: money })) });

export const paymentRow = z.object({
  id, voucherCode: text, paidAt: text, employeeId: id, employeeName: text, payrollId: id.nullable(), payrollCode: text.nullable(), method: paymentMethod, amount: money,
  kind: paymentKind, status: paymentStatus,
});
const slipPayment = z.object({ id, voucherCode: text, paidAt: text, method: paymentMethod, amount: money, kind: paymentKind, status: paymentStatus });
/** KiotViet section 7: the payslips of one employee, and one payslip with its income lines, payments and attendance. */
export const employeeSlipRow = z.object({ id, code: text, payrollId: id, payrollCode: text, payrollName: text, from: date, to: date, income: money, net: money, paid: money, outstanding: money, status: payrollStatus, finalizedAt: z.string().nullish() });
export const employeeSlipPage = z.object({
  items: z.array(employeeSlipRow), total: z.number().int(), page: z.number().int(), pageSize: z.number().int(), summary: z.object({ outstanding: money, advanceBalance: money }),
});
export const slipDetail = z.object({
  id, code: text, payrollId: id, payrollCode: text, employeeId: id, employeeName: text, from: date, to: date, hours: z.number(), mainPay: money, bonus: money, advanceDeduction: money, income: money, net: money, paid: money, outstanding: money, status: payrollStatus,
  salaryType: slipSalaryType.nullable(), shifts: z.number(), shiftPay: money, manualDeduction: money, fixedPay: money, adjustments: z.array(slipAdjustment), allowsAdjustments: z.boolean(),
  lines: z.array(z.object({ jobName: text, hours: z.number(), hourlyRate: money, amount: money, kind: payLineKind, shifts: z.number(), shiftRate: money })), payments: z.array(slipPayment),
  employeeCode: text.nullish(),
  /** One row per day and job type: rafts worked, check-in/out, hours, the rate of that day and the amount (hours × rate), so the formula can be followed. */
  attendance: z.array(z.object({ date, jobName: text, hours: z.number(), raftCodes: text.nullish(), checkInAt: z.string().nullish(), checkOutAt: z.string().nullish(), hourlyRate: money.optional(), amount: money.optional(),
    kind: payLineKind.optional(), shifts: z.number().optional(), shiftRate: money.optional() })),
});
export const standalonePaymentResult = z.object({ id });
/** The payslip a voucher paid: its value, what was paid before this voucher, this part of the voucher and the state of the payslip after it. */
export const paymentAllocation = z.object({
  slipId: id, slipCode: text, payrollId: id, payrollCode: text, periodName: text, from: date, to: date, finalizedAt: z.string().nullish(),
  slipNet: money, paidBefore: money, amount: money, slipStatus: z.enum(["Unpaid", "PartiallyPaid", "Paid"]),
});
/** `GET /api/payroll-payments/{id}` (id = the cash voucher): a Wage voucher has one allocation, an Advance none (it shows advanceAmount and what later payslips took off). */
export const paymentDetail = z.object({
  id, code: text, kind: paymentKind, employeeId: id, employeeCode: text.nullish(), employeeName: text, paidAt: text, method: paymentMethod,
  cashAccountId: id.nullish(), cashAccountName: text.nullish(), note: text.nullish(), createdById: id.nullish(), createdBy: text.nullish(), createdAt: text,
  paidById: id.nullish(), paidBy: text.nullish(), status: paymentStatus, cancelledAt: z.string().nullish(), cancelReason: text.nullish(), total: money, rowVersion: text,
  allocations: z.array(paymentAllocation), advanceAmount: money, advanceDeducted: money,
});
export const payers = z.array(z.object({ id, name: text }));
/** `summary.amount` (optional) = total of the `Recorded` payments of the whole filtered set; without it the screen sums the loaded page. */
export const paymentPage = z.object({ items: z.array(paymentRow), total: z.number().int(), page: z.number().int(), pageSize: z.number().int(), summary: z.object({ amount: money }).optional() });
export const payableEmployees = z.object({ items: z.array(z.object({ employeeId: id, code: text, name: text, outstanding: money })) });

/** Request bodies (strict). */
export const createSheet = z.strictObject({
  periodType, from: date, to: date, scope: payrollScope, employeeIds: z.array(id).min(1).max(500).optional(),
}).refine((v) => v.from <= v.to, { path: ["to"] }).refine((v) => (v.scope === "Selected") === !!v.employeeIds?.length, { path: ["employeeIds"] });
export const reloadSheet = z.strictObject({ mode: z.enum(["All", "WorkingDaysOnly"]) });
/** The most the backend takes for one adjustment line, and how many lines a slip may carry. */
export const maxAdjustmentAmount = 9_999_999_999, maxAdjustmentLines = 50, maxAdjustmentReason = 200;
export const adjustmentLine = z.strictObject({ kind: adjustmentKind, amount: z.number().int().min(1).max(maxAdjustmentAmount), reason: z.string().trim().min(1).max(maxAdjustmentReason) });
/** `PUT /api/payroll-slips/{id}/adjustments` replaces the whole list of the slip (empty removes all) and answers the whole sheet. */
export const saveAdjustments = z.strictObject({ items: z.array(adjustmentLine).max(maxAdjustmentLines) });
/** `expectedTotal` / `expectedSlips` = the totals the Owner viewed (detail `total`, `employeeCount`): the backend refuses with 409 TOTALS_CHANGED when the sheet now differs. */
export const finalizeSheet = z.strictObject({ expenseMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/), expectedTotal: money.optional(), expectedSlips: z.number().int().nonnegative().optional() });
const instant = z.string().max(40).refine((v) => !Number.isNaN(Date.parse(v)));
export const paySheet = z.strictObject({
  paidAt: instant, method: paymentMethod, note: text.max(500), cashAccountId: id.optional(),
  lines: z.array(z.strictObject({ slipId: id, amount: z.number().int().min(1) })).min(1).max(500), paidById: id.optional(),
});
export const standalonePayment = z.strictObject({ employeeId: id, amount: z.number().int().min(1), paidAt: instant, method: paymentMethod, note: text.max(500), cashAccountId: id.optional(), paidById: id.optional() });
/** Edit of a voucher: time, method (+ bank account), note and who paid; the amount never changes. `rowVersion` is the one read with the voucher. */
export const updatePayment = z.strictObject({ paidAt: instant.optional(), method: paymentMethod, cashAccountId: id.optional(), note: text.max(500), paidById: id.optional(), rowVersion: text.max(200) });
export const cancelPayment = z.strictObject({ reason: text.max(500).optional(), rowVersion: text.max(200) });

export type SheetRow = z.infer<typeof sheetRow>;
export type SheetPage = z.infer<typeof sheetPage>;
export type Slip = z.infer<typeof slip>;
export type SheetDetail = z.infer<typeof sheetDetail>;
export type EmployeeSlipRow = z.infer<typeof employeeSlipRow>;
export type EmployeeSlipPage = z.infer<typeof employeeSlipPage>;
export type SlipDetail = z.infer<typeof slipDetail>;
export type AdjustmentLine = z.infer<typeof adjustmentLine>;
export type SaveAdjustmentsBody = z.infer<typeof saveAdjustments>;
export type PaymentRow = z.infer<typeof paymentRow>;
export type PaymentPage = z.infer<typeof paymentPage>;
export type PaymentDetail = z.infer<typeof paymentDetail>;
export type UpdatePaymentBody = z.infer<typeof updatePayment>;
export type CancelPaymentBody = z.infer<typeof cancelPayment>;
export type PayableEmployee = z.infer<typeof payableEmployees>["items"][number];
export type CreateSheetBody = z.infer<typeof createSheet>;
export type PaySheetBody = z.infer<typeof paySheet>;
export type StandalonePaymentBody = z.infer<typeof standalonePayment>;
