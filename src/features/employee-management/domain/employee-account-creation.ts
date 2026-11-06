import type { AccountManagementWorkspace, CredentialDeliveryReceipt, SaveAccountInput, SaveAccountResult } from "@/features/account-management/domain/account-management";
import type { EmployeeProfile, UnlinkEmployeeAccountResult } from "./employee-management";

export type EmployeeAccountDraft = Omit<SaveAccountInput, "id" | "recordVersion">;
export type EmployeeAccountCreationOptions = Pick<AccountManagementWorkspace, "roles" | "zones" | "featureCatalog">;
export type CreateEmployeeAccountInput = Readonly<{
  employeeId: string;
  recordVersion: string;
  account: EmployeeAccountDraft;
}>;
export type EmployeeAccountRejection =
  | Extract<UnlinkEmployeeAccountResult, { status: "conflict" | "forbidden" | "session-expired" | "not-found" }>
  | Readonly<{ status: "already-linked" | "unavailable" }>
  | Readonly<{ status: "invalid-version"; message: { code: "MSG01" } }>;
export type CreateEmployeeAccountResult = EmployeeAccountRejection
  | Exclude<SaveAccountResult, { status: "saved" }>
  | Readonly<{ status: "created"; employee: EmployeeProfile; delivery?: CredentialDeliveryReceipt }>;
