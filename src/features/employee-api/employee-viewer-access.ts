import { canReadEmployees } from "./employee-read-access";

type Identity = { subjectType: string };
type Held = readonly { functionCode: string; action: string }[];

/**
 * What the signed-in viewer may see on the employee screens, decided from held function codes (never from a role name).
 * - `manage`: the Owner only; personal data, bank, login account, create, import, export and edit.
 * - `payroll`: payslip and debt tabs plus the pay columns; the Owner and anyone holding PAYROLL View (the Accountant).
 * Everyone else who may read employees (a Zone Manager with LABOR_WORKERS View) gets a read-only view of working information.
 */
export type EmployeeViewerAccess = Readonly<{ read: boolean; manage: boolean; payroll: boolean }>;

export function employeeViewerAccess(identity: Identity, functions: Held): EmployeeViewerAccess {
  const manage = identity.subjectType === "CooperativeOwner";
  const payroll = manage || (identity.subjectType === "Staff" && functions.some((entry) => entry.functionCode === "PAYROLL" && entry.action === "View"));
  return { read: canReadEmployees(identity, functions), manage, payroll };
}

/** Columns that carry pay figures; hidden for a viewer without payroll access. */
export const payrollColumnKeys: readonly string[] = ["hours", "debt"];
