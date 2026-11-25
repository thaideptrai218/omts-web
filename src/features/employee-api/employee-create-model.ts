import { employeeApiEditorSchema, buildEmployeeSaveBody, localFieldLabels, valuesOf, type EmployeeFormValues } from "./employee-editor-model";
import { employeeFieldGroup, type EmployeeCreateGroup } from "./employee-editor-validation";
import { issueEmployeeAccountRequestSchema } from "./employee-account-contract";
import { emptyGrantSelection, selectionError, type GrantSelection } from "@/features/account-access/user-grant-selection";

/** Values of the create dialog: the profile fields plus the optional login account. */
export type EmployeeCreateValues = EmployeeFormValues & { createAccount: boolean; username: string; grants: GrantSelection };
export type EmployeeCreateIssue = { path: string; message: string };

export const blankCreateValues = (): EmployeeCreateValues => ({ ...valuesOf(null), createAccount: false, username: "", grants: emptyGrantSelection });
export const createFieldLabels: Record<string, string> = { ...localFieldLabels, username: "Tên đăng nhập" };

/** Visual order of the fields, used to find the first invalid one. */
const fieldOrder = [
  "code", "fullName", "phone", "birthday", "gender", "employeeType", "startDate", "workingZoneIds", "jobTypeIds", "idNumber", "address", "area", "wardCommune",
  "otherInformation", "notes", "bankAccount", "bankAccount.bankName", "bankAccount.accountNumber",
  "bankAccount.accountHolderName", "username", "grants",
];
const rank = (path: string) => { const index = fieldOrder.indexOf(path); return index < 0 ? fieldOrder.length : index; };

export function groupsWithIssues(issues: readonly EmployeeCreateIssue[]): Set<EmployeeCreateGroup> {
  return new Set(issues.map(issue => employeeFieldGroup(issue.path)));
}

/**
 * Validates the whole form (every group, even collapsed ones).
 * `inactiveZoneIds` are selected zones that the catalogue no longer offers as active.
 */
export function parseEmployeeCreate(values: EmployeeCreateValues, inactiveZoneIds: readonly string[]) {
  const checked = employeeApiEditorSchema.safeParse(values);
  const issues: EmployeeCreateIssue[] = checked.success ? [] : checked.error.issues.map(issue => ({ path: issue.path.join("."), message: issue.message }));
  const add = (path: string, message: string) => { if (!issues.some(issue => issue.path === path)) issues.push({ path, message }); };
  if (!values.employeeType) add("employeeType", "Chọn loại nhân viên.");
  if (!values.workingZoneIds.length) add("workingZoneIds", "Chọn ít nhất một vùng làm việc.");
  else if (inactiveZoneIds.length) add("workingZoneIds", "Bỏ chọn vùng đã ngừng hoặc chưa có trong danh mục trước khi lưu.");
  if (values.createAccount) {
    if (!values.username.trim()) add("username", "Nhập tên đăng nhập.");
    else {
      const account = issueEmployeeAccountRequestSchema.safeParse({ username: values.username });
      if (!account.success) add("username", account.error.issues[0].message);
    }
    // The backend copies the employee's phone number to the account (BR-LABOR-01).
    if (!values.phone.trim()) add("phone", "Nhập số điện thoại để tạo tài khoản đăng nhập.");
    const missingZone = selectionError(values.grants);
    if (missingZone) add("grants", missingZone);
  }
  issues.sort((a, b) => rank(a.path) - rank(b.path));
  if (issues.length || !checked.success) return { ok: false as const, issues };
  // `grants` never enters the request body: the create endpoint accepts a username only, so roles are sent after the account exists.
  const { createAccount, username } = values;
  return {
    ok: true as const,
    body: {
      ...buildEmployeeSaveBody(checked.data, null),
      ...(createAccount ? { account: { username: username.trim() } } : {}),
    },
  };
}
