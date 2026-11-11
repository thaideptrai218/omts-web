import { z } from "zod";
import { apiTextSchema } from "@/features/auth/api/auth-contract.schemas";
import { employeeViewSchema } from "@/features/employee-management/api/employee-contract.schemas";
import { createProfileSchema, validProfileDate, validStartDate } from "./contracts";
import { issueEmployeeAccountRequestSchema } from "./employee-account-contract";

/**
 * Create request: the profile plus an optional login account (username only).
 * Grants and subject type are deliberately not accepted; roles are assigned in account management.
 */
export const createEmployeeRequestSchema = createProfileSchema
  .extend({ account: issueEmployeeAccountRequestSchema.optional() })
  .refine(validProfileDate, { path: ["birthday"] })
  .refine(validStartDate, { path: ["startDate"] });

/** Backend answer when an account was requested: the one-time password must be present and the account linked. */
export const employeeCreatedWithAccountSchema = z.object({
  employee: employeeViewSchema.refine(employee => employee.account !== null && employee.status === "Employed"),
  message: z.string(),
  messageCode: apiTextSchema,
  temporaryPassword: z.string().min(1),
  temporaryPasswordExpiresAt: z.iso.datetime({ offset: true }),
  accountMessageCode: z.literal("MSG-ACCOUNT-23").nullish(),
});

/** What the BFF hands the browser: one credential receipt, never cached, never stored. */
export const employeeCreateReceiptSchema = z.strictObject({
  employee: employeeViewSchema,
  temporaryPassword: z.string().min(1),
  temporaryPasswordExpiresAt: z.iso.datetime({ offset: true }),
  accountMessageCode: z.literal("MSG-ACCOUNT-23").nullish(),
});

export type CreateEmployeeRequest = z.infer<typeof createEmployeeRequestSchema>;
export type EmployeeCreateReceipt = z.infer<typeof employeeCreateReceiptSchema>;
