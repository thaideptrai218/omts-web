import type { AppMessage } from "@/shared/messages/message-catalog";
import type { BindableEmployeeProblem } from "./employee-problem";
import type { EmployeeBankAccount, EmployeeZoneOption } from "./employee-working-details";
import type { EmployeeAccountCreationOptions } from "./employee-account-creation";

export type EmployeeStatus = "employed" | "left";

export type EmployeeAccountSummary = Readonly<{
  displayName: string;
  id: string;
  phone: string;
  status: "active" | "locked";
  username: string;
}>;

export type EmployeeProfile = Readonly<{
  account: EmployeeAccountSummary | null;
  address: string;
  area: string;
  birthday: string;
  fullName: string;
  id: string;
  notes: string;
  otherInformation: string;
  phone: string;
  recordVersion: string;
  status: EmployeeStatus;
  employmentEndDate: string | null;
  wardCommune: string;
  workingZoneIds: readonly string[];
  bankAccount: EmployeeBankAccount | null;
}>;

export type EmployeeManagementWorkspace = Readonly<{
  availableAccounts: readonly EmployeeAccountSummary[];
  employees: readonly EmployeeProfile[];
  zones: readonly EmployeeZoneOption[];
  accountCreation?: EmployeeAccountCreationOptions;
}>;

export type SaveEmployeeInput = Readonly<{
  accountId: string | null;
  address: string;
  area: string;
  birthday: string;
  fullName: string;
  id: string | null;
  notes: string;
  otherInformation: string;
  phone: string;
  recordVersion: string | null;
  status: EmployeeStatus;
  wardCommune: string;
  workingZoneIds: readonly string[];
  bankAccount: EmployeeBankAccount | null;
}>;

export type AccountFollowUp = Readonly<{
  account: EmployeeAccountSummary;
  action: "review-access" | "review-lock";
}>;

export type UnlinkEmployeeAccountInput = Readonly<{
  employeeId: string;
  recordVersion: string;
}>;

type EmployeeConflictResult = Readonly<{
  status: "conflict";
  message: Readonly<{
    code: "MSG06";
    params: Readonly<{ user_name: string; time: string }>;
  }>;
}>;

export type UnlinkEmployeeAccountResult =
  | Extract<BindableEmployeeProblem, { status: "invalid-fields" }>
  | Readonly<{ status: "unlinked"; employee: EmployeeProfile }>
  | Readonly<{ status: "not-found" }>
  | Readonly<{ status: "invalid-version"; message: AppMessage & { code: "MSG01" } }>
  | EmployeeConflictResult
  | ForbiddenResult
  | SessionExpiredResult;

type ForbiddenResult = Readonly<{
  message: AppMessage & { code: "MSG02" };
  status: "forbidden";
}>;

type SessionExpiredResult = Readonly<{
  message: AppMessage & { code: "MSG19" };
  status: "session-expired";
}>;

export type LoadEmployeeWorkspaceResult =
  | Readonly<{
      status: "loaded";
      workspace: EmployeeManagementWorkspace;
    }>
  | ForbiddenResult
  | SessionExpiredResult;

export type SaveEmployeeResult =
  | BindableEmployeeProblem
  | Readonly<{
      employee: EmployeeProfile;
      followUp?: AccountFollowUp;
      message: AppMessage & { code: "MSG10" };
      status: "saved";
    }>
  | Readonly<{
      field:
        | "accountId"
        | "fullName"
        | "phone"
        | "status";
      message: AppMessage & { code: "MSG01" };
      status: "invalid-input";
    }>
  | Readonly<{
      existingEmployeeId: string;
      message: AppMessage & { code: "MSG03" };
      status: "duplicate";
    }>
  | Readonly<{
      existingEmployeeId: string;
      message: AppMessage & { code: "MSG24" };
      status: "account-already-linked";
    }>
  | EmployeeConflictResult
  | ForbiddenResult
  | SessionExpiredResult;
