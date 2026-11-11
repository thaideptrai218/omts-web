/** Collapsible groups of the "Thêm nhân viên" dialog and the mapping from a field path to its group. */
export type EmployeeCreateGroup = "basic" | "work" | "personal" | "bank" | "account";

export const employeeCreateGroups: readonly { key: EmployeeCreateGroup; title: string }[] = [
  { key: "basic", title: "Thông tin cơ bản" },
  { key: "work", title: "Công việc" },
  { key: "personal", title: "Thông tin cá nhân" },
  { key: "bank", title: "Thông tin ngân hàng" },
  { key: "account", title: "Tài khoản đăng nhập" },
];

/** Groups that are expanded when the dialog opens. */
export const defaultOpenGroups: readonly EmployeeCreateGroup[] = ["basic", "work"];

/** Maps both local field paths and normalized backend field paths to their group. */
export function employeeFieldGroup(path: string): EmployeeCreateGroup {
  if (path.startsWith("bankAccount")) return "bank";
  if (["workingZoneIds", "jobTypeIds", "startDate"].includes(path)) return "work";
  if (["idNumber", "address", "area", "wardCommune", "otherInformation", "notes"].includes(path)) return "personal";
  if (["createAccount", "username", "accountId"].includes(path)) return "account";
  return "basic";
}

/** Focuses the control named by `path`; a grouped bank error points to its first real input. */
export function focusEmployeeField(form: HTMLFormElement | null, path: string) {
  const target = path === "bankAccount" ? "bankAccount.bankName" : path;
  const field = Array.from(form?.querySelectorAll<HTMLElement>("[name]") ?? []).find(node => node.getAttribute("name") === target);
  field?.focus();
}
