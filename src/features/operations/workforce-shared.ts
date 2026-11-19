import { z } from "zod";
import { createOperationsRepository } from "./repository";
import * as c from "./new-module-contracts";

/** Shared pieces of the workforce (assignment and attendance) screens. */
export const workforceRepository = createOperationsRepository("workforce");

export type Assignment = z.infer<typeof c.assignmentSchema>;
/** The two views of the day board: who is assigned where, and the recorded check-in/out times. */
export type WorkforceTab = "assignments" | "attendance" | "staff";
export type AssignmentAction = "remove" | "check-in" | "check-out";

/** Derives the attendance state of one assignment from its check-in / check-out timestamps. */
export const attendanceState = (row: Assignment) =>
  row.checkedOutAt ? (row.checkedInAt ? "finished" : "missing") : row.checkedInAt ? "working" : "planned";

/** "7 giờ 30 phút"; "—" while the day has no check-in and check-out to count. */
export function formatWorked(minutes: number | null) {
  if (minutes === null) return "—";
  const hours = Math.floor(minutes / 60), rest = minutes % 60;
  return hours ? (rest ? `${hours} giờ ${rest} phút` : `${hours} giờ`) : `${rest} phút`;
}

/** Paid time of the day: break taken off and rounded down by the attendance settings (computed by the server). */
export const workedLabel = (row: Assignment) => formatWorked(row.workedMinutes);
export const breakLabel = (row: Assignment) => (row.workedMinutes === null ? "—" : row.breakMinutes ? `${row.breakMinutes} phút (nghỉ trưa được trừ)` : "Không có giờ nghỉ nằm trong ca");

/** A check-in with no check-out for this long is flagged "Quá 12 giờ chưa ra về". */
export const FORGOT_CHECK_OUT_HOURS = 12;
/** Hours since the check-in of a row that is still open; null when it is not open. */
export const openHours = (row: Assignment) => (row.checkedInAt && !row.checkedOutAt ? (Date.now() - Date.parse(row.checkedInAt)) / 3_600_000 : null);
/** A row of an earlier day that is still open (the night shift): the board of today lists it so the check-out can be recorded. */
export const isCarryOver = (row: Assignment, today: string) => row.date < today && !!row.checkedInAt && !row.checkedOutAt;

/** What needs attention on a row: the open night shift, a forgotten check-out, or a check-out with no check-in. */
export function rowWarning(row: Assignment, today: string): string | undefined {
  if (isCarryOver(row, today)) return "Chưa ra về (từ hôm qua)";
  const open = openHours(row);
  if (open !== null && open > FORGOT_CHECK_OUT_HOURS) return "Quá 12 giờ chưa ra về";
  if (attendanceState(row) === "missing") return "Thiếu lượt vào";
  return undefined;
}

export const attendanceLabel = {
  planned: "Chưa vào làm",
  working: "Đang làm",
  finished: "Đã ra về",
  missing: "Thiếu lượt vào",
};
