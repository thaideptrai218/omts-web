import { z } from "zod";
import { employeeViewSchema } from "@/features/employee-management/api/employee-contract.schemas";

/** No grants or subject type cross this step; roles are assigned in account management. */
export const issueEmployeeAccountRequestSchema = z.strictObject({
  username: z.string().trim().regex(/^(?=[A-Za-z0-9._-]*[A-Za-z])[A-Za-z0-9._-]{3,50}$/u, "Tên đăng nhập gồm 3–50 ký tự: chữ, số, dấu chấm, gạch ngang hoặc gạch dưới; cần ít nhất một chữ cái."),
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
