import { z } from "zod";
import { apiIdSchema } from "@/features/auth/api/auth-contract.schemas";
import { employeeTypeSchema, salaryTypeSchema } from "@/features/employee-management/api/employee-contract.schemas";
import { employeeDateOnlySchema } from "@/features/employee-management/schemas/employee-date-only";
import { employeeRowVersionSchema } from "@/features/employee-management/schemas/employee-row-version";

export { salaryTypeSchema };
export type SalaryType = z.infer<typeof salaryTypeSchema>;

/**
 * One dated setup. `monthlyAmount` is whole VND for FixedMonthly and absent for the other types (the shift rate or the hourly rate of each job type applies).
 * `payFieldShifts` is true only for a FixedMonthly setup that also pays the shifts of field work.
 */
export const salarySetupSchema = z.object({
  type: salaryTypeSchema,
  monthlyAmount: z.number().nullish(),
  payFieldShifts: z.boolean().nullish(),
  effectiveFrom: employeeDateOnlySchema,
  enteredAt: z.iso.datetime({ offset: true }),
});
export type SalarySetup = z.infer<typeof salarySetupSchema>;

/** `GET /api/employees/{id}/salary`: the setup in force, the type that applies today, and every setup latest first. */
export const employeeSalarySchema = z.object({
  employeeId: apiIdSchema,
  employeeType: employeeTypeSchema.nullable(),
  current: salarySetupSchema.nullable(),
  currentType: salaryTypeSchema.nullable(),
  history: z.array(salarySetupSchema),
  rowVersion: employeeRowVersionSchema,
});
export type EmployeeSalary = z.infer<typeof employeeSalarySchema>;

/** The largest monthly amount the screen accepts (the backend has its own limit and answers MSG-GEN-01 above it). */
export const maxMonthlySalary = 999_999_999;

/** `POST /api/employees/{id}/salary`: a fixed monthly setup needs an amount (and may turn field-shift pay off); a per-shift or hourly one carries neither. */
export const saveSalaryRequestSchema = z.strictObject({
  type: salaryTypeSchema,
  monthlyAmount: z.number().int().positive().max(maxMonthlySalary).optional(),
  payFieldShifts: z.boolean().optional(),
  effectiveFrom: employeeDateOnlySchema,
  rowVersion: employeeRowVersionSchema,
}).refine(value => value.type === "FixedMonthly" ? value.monthlyAmount !== undefined : value.monthlyAmount === undefined && value.payFieldShifts === undefined, { path: ["monthlyAmount"] });
export type SaveSalaryRequest = z.infer<typeof saveSalaryRequestSchema>;
