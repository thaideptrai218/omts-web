import { z } from "zod";
import { employeeUpdateRequestSchema } from "@/features/employee-management/api/employee-update.schema";
import { employeeViewSchema } from "@/features/employee-management/api/employee-contract.schemas";
import { employeeRowVersionSchema } from "@/features/employee-management/schemas/employee-row-version";
import { createEmployeeEndDateSchema } from "@/features/employee-management/schemas/employee-employment-schema";
import { employeeBusinessDate } from "@/features/employee-management/schemas/employee-date-only";

export { employeePageSchema, employeeViewSchema, linkableEmployeeAccountsSchema } from "@/features/employee-management/api/employee-contract.schemas";
export type { EmployeeViewDto as Employee } from "@/features/employee-management/api/employee-contract.schemas";
export const createProfileSchema = employeeUpdateRequestSchema.omit({ rowVersion: true });
export function validProfileDate<T extends { birthday: string | null }>(value: T) { return value.birthday === null || value.birthday <= employeeBusinessDate(new Date()); }
export const createProfileInputSchema = createProfileSchema.refine(validProfileDate, { path: ["birthday"] });
export const updateProfileInputSchema = employeeUpdateRequestSchema.refine(validProfileDate, { path: ["birthday"] });
export const endEmploymentSchema = z.strictObject({ endDate: z.string(), rowVersion: employeeRowVersionSchema }).refine((value) => createEmployeeEndDateSchema().safeParse(value).success, { path: ["endDate"] });
export const employeeVersionSchema = z.strictObject({ rowVersion: employeeRowVersionSchema });
export const employmentChangedSchema = z.object({ employee: employeeViewSchema, followUp: z.object({ action: z.enum(["review-lock", "review-access"]), accountId: z.guid() }).nullable() })
  .refine((value) => !value.followUp || value.employee.account?.id === value.followUp.accountId, { path: ["followUp"] });
export type EmploymentChange = z.infer<typeof employmentChangedSchema>;
