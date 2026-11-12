import { z } from "zod";
import { employeeUpdateRequestSchema } from "@/features/employee-management/api/employee-update.schema";
import { employeeViewSchema } from "@/features/employee-management/api/employee-contract.schemas";
import { employeeRowVersionSchema } from "@/features/employee-management/schemas/employee-row-version";
import { employeeDateOnlySchema } from "@/features/employee-management/schemas/employee-date-only";
import { employeeBusinessDate } from "@/features/employee-management/schemas/employee-date-only";
import { validVietnamesePhone, vietnamesePhoneMessage } from "@/components/form/phone-input-rules";

export { employeePageSchema, employeeViewSchema, jobTypeOptionsSchema } from "@/features/employee-management/api/employee-contract.schemas";
export type { EmployeeViewDto as Employee } from "@/features/employee-management/api/employee-contract.schemas";
export const createProfileSchema = employeeUpdateRequestSchema.omit({ rowVersion: true }).extend({ employeeType: z.enum(["SeasonalWorker", "Staff"]), workingZoneIds: z.array(z.guid()).min(1).refine(ids => new Set(ids).size === ids.length) });
/** Start of work cannot lie in the future. */
export const validStartDate = <T extends { startDate?: string | null }>(value: T) => !value.startDate || value.startDate <= employeeBusinessDate(new Date());
export function validProfileDate<T extends { birthday?: string | null }>(value: T) { return !value.birthday || value.birthday <= employeeBusinessDate(new Date()); }
export const createProfileInputSchema = createProfileSchema.refine(validProfileDate, { path: ["birthday"] }).refine(validStartDate, { path: ["startDate"] });
export const updateProfileInputSchema = employeeUpdateRequestSchema
  .refine(validProfileDate, { path: ["birthday"] })
  .refine(validStartDate, { path: ["startDate"] })
  .refine(value => !value.employeeTypeFrom || !!value.employeeType, { path: ["employeeTypeFrom"] });
export const endEmploymentSchema = z.strictObject({ lastWorkingDay: employeeDateOnlySchema, rowVersion: employeeRowVersionSchema }).refine(value => value.lastWorkingDay <= employeeBusinessDate(new Date()), { path: ["lastWorkingDay"] });
export const employeeVersionSchema = z.strictObject({ rowVersion: employeeRowVersionSchema });
export const resumeEmployeeSchema = employeeVersionSchema.extend({ phoneNumber: z.string().refine(value => !value.trim() || validVietnamesePhone(value), vietnamesePhoneMessage).nullish() });
export const employmentChangedSchema = z.object({ employee: employeeViewSchema });
export type EmploymentChange = z.infer<typeof employmentChangedSchema>;
