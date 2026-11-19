import { z } from "zod";
import { apiIdSchema, apiTextSchema } from "@/features/auth/api/auth-contract.schemas";
import { employeeRowVersionSchema } from "@/features/employee-management/schemas/employee-row-version";
import { employeeDateOnlySchema } from "../schemas/employee-date-only";

// Wire contract: omts-backend develop@db158b44.
export { employeeDateOnlySchema } from "../schemas/employee-date-only";
export const employeeTypeSchema = z.enum(["SeasonalWorker", "Staff"]);
export const jobTypeOptionsSchema = z.array(z.object({ id: apiIdSchema, name: apiTextSchema }));
/** Backend stores the enum name; "Other" is offered as "Khác". */
export const employeeGenderSchema = z.enum(["Male", "Female", "Other"]);
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
  // NV000001...; unique per cooperative, upper-case.
  code: apiTextSchema,
  fullName: apiTextSchema,
  phoneNumber: z.string().nullable(),
  employeeType: employeeTypeSchema.nullable(),
  jobTypes: z.array(z.object({ id: apiIdSchema, name: apiTextSchema, status: apiTextSchema })),
  lastWorkingDay: employeeDateOnlySchema.nullable(),
  canMaintain: z.boolean(),
  rowVersion: employeeRowVersionSchema,
  workingZones: z.array(workingZoneSchema),
  account: linkedAccountSchema.nullable(),
  status: employeeStatusSchema,
  // Only in the list, and only for callers with PAYROLL View (Owner, Accountant): paid hours this month and the wage still owed on finalized sheets.
  monthHours: z.number().nullish(),
  outstandingWage: z.number().nullish(),
});

export const employeePageSchema = z.object({
  items: z.array(employeeListItemSchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(100),
  total: z.number().int().min(0),
});

/** Another profile with the same ID number (saved anyway; the screen shows a warning). Sent only in the answer of a create or update. */
export const duplicateIdNumberSchema = z.object({ employeeId: apiIdSchema, code: apiTextSchema, fullName: apiTextSchema, message: z.string() });

export const employeeViewSchema = employeeListItemSchema.extend({
  duplicateIdNumber: duplicateIdNumberSchema.nullish(),
  birthday: employeeDateOnlySchema.nullish(),
  gender: employeeGenderSchema.nullish(),
  // Only sent to callers who may maintain the employee; the list never carries it.
  idNumber: z.string().nullish(),
  startDate: employeeDateOnlySchema.nullish(),
  address: z.string().nullish(),
  area: z.string().nullish(),
  ward: z.string().nullish(),
  otherInformation: z.string().nullish(),
  notes: z.string().nullish(),
  bankAccount: bankAccountSchema.nullish(),
  typeHistory: z.array(z.object({ type: employeeTypeSchema, effectiveFrom: employeeDateOnlySchema })),
  hasStaffAccount: z.boolean(),
});

// Projection for profile saves only. Account creation and its one-time
// credential handover need a separate contract before they are integrated.
export const employeeSavedSchema = z.object({
  employee: employeeViewSchema,
  message: z.string(),
  messageCode: apiTextSchema,
  duplicateIdNumber: duplicateIdNumberSchema.nullish(),
});

export type EmployeeListItemDto = z.infer<typeof employeeListItemSchema>;
export type EmployeeViewDto = z.infer<typeof employeeViewSchema>;
export type EmployeeSavedDto = z.infer<typeof employeeSavedSchema>;
