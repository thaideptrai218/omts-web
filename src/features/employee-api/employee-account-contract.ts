import { z } from "zod";
import { employeeViewSchema } from "@/features/employee-management/api/employee-contract.schemas";

/** No grants or subject type cross this step; roles are assigned in account management. */
export const issueEmployeeAccountRequestSchema = z.strictObject({
  username: z.string().trim().min(1),
  email: z.email().optional(),
});

/** One-use handover only. Never use this schema for a cached employee read. */
export const issueEmployeeAccountResponseSchema = z.strictObject({
  employee: employeeViewSchema.strict().refine(employee => employee.account !== null && employee.status === "Employed"),
  temporaryPassword: z.string().min(1),
  temporaryPasswordExpiresAt: z.iso.datetime({ offset: true }),
  accountMessageCode: z.literal("MSG-ACCOUNT-23").nullish(),
});

export type IssueEmployeeAccountRequest = z.infer<typeof issueEmployeeAccountRequestSchema>;
export type IssueEmployeeAccountResponse = z.infer<typeof issueEmployeeAccountResponseSchema>;

// The backend envelope also carries generic save copy. It is validated then
// discarded so arbitrary upstream messages never reach credential handover UI.
export const issueEmployeeAccountSavedSchema = issueEmployeeAccountResponseSchema.extend({
  message: z.string(),
  messageCode: z.literal("MSG-GEN-05"),
});
