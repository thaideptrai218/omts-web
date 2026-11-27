import { canReadEmployees } from "./employee-read-access";

type Identity = { subjectType: string };
type Held = readonly { functionCode: string; action: string }[];

/**
 * What the signed-in viewer may see on the employee screens, decided from held function codes (never from a role name).
 * - `manage`: the Owner only; personal data, bank, login account, create, import, export and edit.
 * - `payroll`: payslip and debt tabs plus the pay columns; the Owner and anyone holding PAYROLL View (the Accountant).
 * - `salary` / `salaryEdit`: the salary setup tab and its save; the Owner and anyone holding PAY_RULES View / Edit (the Accountant).
 * Everyone else who may read employees (a Zone Manager with LABOR_WORKERS View) gets a read-only view of working information.
 */
export type EmployeeViewerAccess = Readonly<{ read: boolean; manage: boolean; payroll: boolean; salary: boolean; salaryEdit: boolean }>;

export function employeeViewerAccess(identity: Identity, functions: Held): EmployeeViewerAccess {
  const manage = identity.subjectType === "CooperativeOwner", staff = identity.subjectType === "Staff";
  const holds = (functionCode: string, action: string) => staff && functions.some((entry) => entry.functionCode === functionCode && entry.action === action);
  return { read: canReadEmployees(identity, functions), manage, payroll: manage || holds("PAYROLL", "View"), salary: manage || holds("PAY_RULES", "View"), salaryEdit: manage || holds("PAY_RULES", "Edit") };
}

/** Columns that carry pay figures (the salary type is empty for a caller without payroll access); hidden for a viewer without payroll access. */
export const payrollColumnKeys: readonly string[] = ["salaryType", "debt"];
