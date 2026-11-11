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

export const attendanceLabel = {
  planned: "Chưa vào làm",
  working: "Đang làm",
  finished: "Đã ra về",
  missing: "Thiếu lượt vào",
};
