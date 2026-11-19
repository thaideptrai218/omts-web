import { z } from "zod";

/** Wire contract of the payroll period settings (`/api/payroll-settings`, LABOR-16); dates are yyyy-MM-dd. */
const period = z.object({ start: z.iso.date(), end: z.iso.date(), name: z.string() });
export const payrollSettingsView = z.object({ payPeriodStartDay: z.number().int().min(1).max(28), automaticPayroll: z.boolean(), nextPeriods: z.array(period), rowVersion: z.string().min(1) });
/** The next two periods under settings that are not saved yet; the message of the backend is English, the screen words its own question. */
export const payrollSettingsPreview = z.object({ payPeriodStartDay: z.number().int(), automaticPayroll: z.boolean(), nextPeriods: z.array(period) });
export const savePayrollSettings = z.strictObject({ payPeriodStartDay: z.number().int().min(1).max(28), automaticPayroll: z.boolean(), rowVersion: z.string().min(1) });
export const payrollSettingsSaved = z.object({ settings: payrollSettingsView });
export type PayrollSettings = z.infer<typeof payrollSettingsView>;
export type PayrollPeriod = z.infer<typeof period>;
