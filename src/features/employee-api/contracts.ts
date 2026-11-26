import { z } from "zod";
import { employeeUpdateRequestSchema } from "@/features/employee-management/api/employee-update.schema";
import { employeeViewSchema } from "@/features/employee-management/api/employee-contract.schemas";
import { employeeRowVersionSchema } from "@/features/employee-management/schemas/employee-row-version";
import { employeeDateOnlySchema } from "@/features/employee-management/schemas/employee-date-only";
import { employeeBusinessDate } from "@/features/employee-management/schemas/employee-date-only";
import { normalizeEmployeePhone } from "@/features/employee-management/schemas/employee-phone";

export { employeePageSchema, employeeViewSchema, jobTypeOptionsSchema } from "@/features/employee-management/api/employee-contract.schemas";
export type { EmployeeViewDto as Employee } from "@/features/employee-management/api/employee-contract.schemas";
export const createProfileSchema = employeeUpdateRequestSchema.omit({ rowVersion: true }).extend({ employeeType: z.enum(["SeasonalWorker", "Staff"]), workingZoneIds: z.array(z.guid()).refine(ids => new Set(ids).size === ids.length) });
/** An official (Staff) employee has a fixed working zone; a seasonal worker has none and is placed by assignment. */
export const staffHasZone = <T extends { employeeType?: string; workingZoneIds: readonly string[] }>(value: T) => value.employeeType !== "Staff" || value.workingZoneIds.length > 0;
/** Start of work cannot lie in the future. */
export const validStartDate = <T extends { startDate?: string | null }>(value: T) => !value.startDate || value.startDate <= employeeBusinessDate(new Date());
export function validProfileDate<T extends { birthday?: string | null }>(value: T) { return !value.birthday || value.birthday <= employeeBusinessDate(new Date()); }
export const createProfileInputSchema = createProfileSchema.refine(validProfileDate, { path: ["birthday"] }).refine(validStartDate, { path: ["startDate"] }).refine(staffHasZone, { path: ["workingZoneIds"] });
export const updateProfileInputSchema = employeeUpdateRequestSchema
  .refine(validProfileDate, { path: ["birthday"] })
  .refine(validStartDate, { path: ["startDate"] })
  .refine(value => !value.employeeTypeFrom || !!value.employeeType, { path: ["employeeTypeFrom"] });
export const endEmploymentSchema = z.strictObject({ lastWorkingDay: employeeDateOnlySchema, rowVersion: employeeRowVersionSchema, lockAccount: z.boolean().optional() }).refine(value => value.lastWorkingDay <= employeeBusinessDate(new Date()), { path: ["lastWorkingDay"] });
export const employeeVersionSchema = z.strictObject({ rowVersion: employeeRowVersionSchema });
export const resumeEmployeeSchema = employeeVersionSchema.extend({ phoneNumber: z.string().refine(value => !value.trim() || normalizeEmployeePhone(value) !== null).nullish() });
/** What ending employment on a day changes (`GET /api/employees/{id}/end-employment/preview`, and `summary` of the end answer). */
export const endingConsequencesSchema = z.object({
  lastWorkingDay: employeeDateOnlySchema,
  futureAssignments: z.array(z.object({ date: employeeDateOnlySchema, place: z.string().nullish(), jobName: z.string().nullish() })),
  checkedInNotOut: z.array(employeeDateOnlySchema),
  advanceBalance: z.number(), unpaidPayslips: z.number().int(), unpaidAmount: z.number(),
  account: z.object({ id: z.guid(), username: z.string(), displayName: z.string(), status: z.string() }).nullable(),
  accountCanBeLocked: z.boolean(),
});
export type EndingConsequences = z.infer<typeof endingConsequencesSchema>;
/** `accountNote`: null, "OwnerOnly", "NoActiveAccount" or the message code of the refusal; `accountLocked` says whether the lock happened. */
export const employmentChangedSchema = z.object({ employee: employeeViewSchema, accountLocked: z.boolean().optional(), accountNote: z.string().nullish(), summary: endingConsequencesSchema.optional() });
export type EmploymentChange = z.infer<typeof employmentChangedSchema>;
