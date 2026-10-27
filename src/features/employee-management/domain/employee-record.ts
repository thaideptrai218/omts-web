import type { EmployeeStatus } from "./employee-management";

export type EmployeeLinkedAccount = Readonly<{
  id: string;
  username: string;
  displayName: string;
  status: "active" | "locked";
}>;

export type EmployeeWorkingZone = Readonly<{ id: string; code: string; name: string }>;
export type EmployeeBankAccount = Readonly<{
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
}>;

// Separate from the legacy mock workspace: a summary is not an editable record.
export type EmployeeListRecord = Readonly<{
  id: string;
  fullName: string;
  phone: string | null;
  workingZones: readonly EmployeeWorkingZone[];
  account: EmployeeLinkedAccount | null;
  status: EmployeeStatus;
}>;

export type EmployeeRecord = EmployeeListRecord & Readonly<{
  birthday: string | null;
  address: string | null;
  area: string | null;
  wardCommune: string | null;
  otherInformation: string | null;
  notes: string | null;
  bankAccount: EmployeeBankAccount | null;
  employmentEndDate: string | null;
  recordVersion: string;
}>;

export type EmployeePage = Readonly<{
  items: readonly EmployeeListRecord[];
  page: number;
  pageSize: number;
  total: number;
}>;

export type EmployeeLinkableAccount = EmployeeLinkedAccount & Readonly<{ phone: string | null }>;
