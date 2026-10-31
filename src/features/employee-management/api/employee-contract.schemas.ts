import { z } from "zod";
import { apiIdSchema, apiTextSchema } from "@/features/auth/api/auth-contract.schemas";
import { employeeRowVersionSchema } from "@/features/employee-management/schemas/employee-row-version";
import { employeeDateOnlySchema } from "../schemas/employee-date-only";

// Wire snapshot: omts-backend develop@953f597. No HTTP/runtime binding.
export { employeeDateOnlySchema } from "../schemas/employee-date-only";
export const employeeStatusSchema = z.enum(["Employed", "Left"]);
const accountStatusSchema = z.enum(["Active", "Locked"]);

const workingZoneSchema = z.object({
  id: apiIdSchema,
  code: apiTextSchema,
  name: apiTextSchema,
});

// LinkedAccountView has no phone; do not substitute the employee's phone.
const linkedAccountSchema = z.object({
  id: apiIdSchema,
  username: apiTextSchema,
  displayName: apiTextSchema,
  status: accountStatusSchema,
});

const bankAccountSchema = z.object({
  bankName: apiTextSchema,
  accountNumber: apiTextSchema,
  accountHolderName: apiTextSchema,
});

export const employeeListItemSchema = z.object({
  id: apiIdSchema,
  fullName: apiTextSchema,
  phoneNumber: z.string().nullable(),
  workingZones: z.array(workingZoneSchema),
  account: linkedAccountSchema.nullable(),
  status: employeeStatusSchema,
});

export const employeePageSchema = z.object({
  items: z.array(employeeListItemSchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(100),
  total: z.number().int().min(0),
});

export const employeeViewSchema = employeeListItemSchema.extend({
  birthday: employeeDateOnlySchema.nullable(),
  address: z.string().nullable(),
  area: z.string().nullable(),
  ward: z.string().nullable(),
  otherInformation: z.string().nullable(),
  notes: z.string().nullable(),
  bankAccount: bankAccountSchema.nullable(),
  employmentEndDate: employeeDateOnlySchema.nullable(),
  rowVersion: employeeRowVersionSchema,
});

// Projection for update/unlink only. Account creation and its one-time
// credential handover need a separate contract before they are integrated.
export const employeeSavedSchema = z.object({
  employee: employeeViewSchema,
  message: z.string(),
});

export const linkableEmployeeAccountSchema = linkedAccountSchema.extend({
  phoneNumber: z.string().nullable(),
});

export const linkableEmployeeAccountsSchema = z.array(linkableEmployeeAccountSchema);

export type EmployeeListItemDto = z.infer<typeof employeeListItemSchema>;
export type EmployeeViewDto = z.infer<typeof employeeViewSchema>;
export type EmployeeSavedDto = z.infer<typeof employeeSavedSchema>;
export type LinkableEmployeeAccountDto = z.infer<typeof linkableEmployeeAccountSchema>;
