import { z } from "zod";
import { employeeViewSchema } from "@/features/employee-management/api/employee-contract.schemas";

/** No grants or subject type cross this step; roles are assigned in account management. */
export const issueEmployeeAccountRequestSchema = z.strictObject({
  username: z.string().trim().regex(/^(?=[A-Za-z0-9._-]*[A-Za-z])[A-Za-z0-9._-]{3,50}$/u, "Tên đăng nhập gồm 3–50 ký tự: chữ, số, dấu chấm, gạch ngang hoặc gạch dưới; cần ít nhất một chữ cái."),
});

/** Link an existing staff account that no employee has yet; the backend re-checks type, status and the link. */
export const linkEmployeeAccountRequestSchema = z.strictObject({ accountId: z.guid() });

/** Active staff accounts without an employee, for the picker. Only what the picker shows is read. */
export const linkableAccountsSchema = z.object({
  items: z.array(z.object({ id: z.guid(), username: z.string(), displayName: z.string(), phoneNumber: z.string().nullish() })),
});
export type LinkableAccount = z.infer<typeof linkableAccountsSchema>["items"][number];

/** One-use handover only. Never use this schema for a cached employee read. */
export const issueEmployeeAccountResponseSchema = z.strictObject({
  employee: employeeViewSchema.strict().refine(employee => employee.account !== null && employee.status === "Employed"),
  temporaryPassword: z.string().min(1),
  temporaryPasswordExpiresAt: z.iso.datetime({ offset: true }),
  // A newer API answer may carry this flag; it is read and ignored (seasonal workers have no account).
  fixedPassword: z.boolean().optional(),
  accountMessageCode: z.literal("MSG-ACCOUNT-23").nullish(),
  // The backend always sends this key on an employee save; for an account it is null. Anything else is not expected here.
  duplicateIdNumber: z.null().nullish(),
});

export type IssueEmployeeAccountRequest = z.infer<typeof issueEmployeeAccountRequestSchema>;
export type IssueEmployeeAccountResponse = z.infer<typeof issueEmployeeAccountResponseSchema>;

// The backend envelope also carries generic save copy. It is validated then
// discarded so arbitrary upstream messages never reach credential handover UI.
export const issueEmployeeAccountSavedSchema = issueEmployeeAccountResponseSchema.extend({
  message: z.string(),
  messageCode: z.literal("MSG-GEN-05"),
});
