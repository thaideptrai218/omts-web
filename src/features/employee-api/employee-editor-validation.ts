import type { EmployeeTabKey } from "./employee-tabs";

/** Map both local field paths and normalized backend field paths to their group. */
export function employeeFieldTab(path: string): EmployeeTabKey {
  if (path.startsWith("bankAccount")) return "bank";
  if (["employeeType", "employeeTypeFrom", "jobTypeIds", "workingZoneIds", "rowVersion"].includes(path)) return "work";
  if (path === "accountId") return "account";
  return "information";
}

export function focusEmployeeField(form: HTMLFormElement | null, path: string) {
  // A grouped bank error points to its first real input, rather than an absent group control.
  const target = path === "bankAccount" ? "bankAccount.bankName" : path;
  const field = Array.from(form?.querySelectorAll<HTMLElement>("[name]") ?? []).find(node => node.getAttribute("name") === target);
  field?.focus();
}
