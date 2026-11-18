import { z } from "zod";
import { createOperationsRepository } from "./repository";
import * as c from "./new-module-contracts";

/** Shared pieces of the workforce (assignment and attendance) screens. */
export const workforceRepository = createOperationsRepository("workforce");

export type Assignment = z.infer<typeof c.assignmentSchema>;
/** The two views of the day board: who is assigned where, and the recorded check-in/out times. */
export type WorkforceTab = "assignments" | "attendance";
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

export const attendanceLabel = {
  planned: "Chưa vào làm",
  working: "Đang làm",
  finished: "Đã ra về",
  missing: "Thiếu lượt vào",
};
