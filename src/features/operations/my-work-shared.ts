import type { z } from "zod";
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
