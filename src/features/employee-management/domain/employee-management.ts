import type { AppMessage } from "@/shared/messages/message-catalog";

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
  wardCommune: string;
}>;

export type EmployeeManagementWorkspace = Readonly<{
  availableAccounts: readonly EmployeeAccountSummary[];
  employees: readonly EmployeeProfile[];
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
}>;

export type AccountFollowUp = Readonly<{
  account: EmployeeAccountSummary;
  action: "review-access" | "review-lock";
}>;

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
  | ForbiddenResult
  | SessionExpiredResult;
