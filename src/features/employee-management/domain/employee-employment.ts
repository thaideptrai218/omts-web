import type { AccountFollowUp, EmployeeProfile, UnlinkEmployeeAccountResult } from "./employee-management";

export type EndEmployeeEmploymentInput = Readonly<{
  employeeId: string;
  recordVersion: string;
  endDate: string;
}>;
export type ReinstateEmployeeInput = Readonly<{
  employeeId: string;
  recordVersion: string;
}>;
export type ChangeEmployeeEmploymentResult =
  | Readonly<{ status: "changed"; employee: EmployeeProfile; followUp?: AccountFollowUp }>
  | Readonly<{ status: "invalid-input"; field: "endDate" | "recordVersion"; message: { code: "MSG01" } }>
  | Readonly<{ status: "same-status"; message: { code: "MSG61"; params: { current_status: string; new_status: string } } }>
  | Readonly<{ status: "blocked"; message: { code: "MSG11"; params: { count: number; related_list: string } } }>
  | Extract<UnlinkEmployeeAccountResult, { status: "conflict" | "forbidden" | "session-expired" | "not-found" }>;
