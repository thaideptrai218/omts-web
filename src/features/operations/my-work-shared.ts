import type { z } from "zod";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { createOperationsRepository } from "./repository";
import * as c from "./new-module-contracts";
import { displayTime } from "./ui";

/** Shared pieces of the personal work screen (Staff only). */
export const myWorkRepository = createOperationsRepository("my-work");

export type MyWork = z.infer<typeof c.myWorkSchema>;
export type MyAssignment = MyWork["assignments"][number];
export type MyAttendanceDay = MyWork["attendance"][number];
export type MyLeave = MyWork["requests"][number];
export type MyWorkTab = "assignments" | "attendance" | "leave";

/** What an account with no employee profile sees: the screen shows "Tài khoản chưa gắn hồ sơ nhân viên" instead of an error. */
export const unlinkedWork: MyWork = { employeeId: null, name: null, assignments: [], attendance: [], requests: [] };

/**
 * `/api/me/workforce` answers 401 when the signed-in account has no employee profile (the session itself is fine: every other call works).
 * Reading that as "session expired" sent people to log in again for nothing, so a plain read answered 401 becomes the unlinked state.
 */
export function readAsUnlinked(result: WorkspaceResult<MyWork>): WorkspaceResult<MyWork> {
  return result.status === "error" && result.httpStatus === 401 && !result.uncertain ? { status: "success", data: unlinkedWork } : result;
}

/** The longest period the personal work query accepts, in days. */
export const MAX_PERIOD_DAYS = 62;

export const dateLabel = (value: string) => (value ? value.split("-").reverse().join("/") : "—");
export const recordedTime = (value: string | null) => (value ? displayTime(value) : "Chưa ghi nhận");

export function isValidPeriod(period: { from: string; to: string }) {
  return !!period.from && !!period.to && period.to >= period.from && Date.parse(period.to) - Date.parse(period.from) <= MAX_PERIOD_DAYS * 86_400_000;
}

export function leaveStatusLabel(leave: MyLeave) {
  return leave.cancelledAt ? "Đã hủy" : leave.approved === null ? "Chờ duyệt" : leave.approved ? "Đã duyệt" : "Từ chối";
}

export const isPendingLeave = (leave: MyLeave) => leave.approved === null && !leave.cancelledAt;
