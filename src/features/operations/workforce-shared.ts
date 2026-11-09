import { z } from "zod";
import { createOperationsRepository } from "./repository";
import * as c from "./new-module-contracts";

/** Shared pieces of the workforce (assignment and attendance) screens. */
export const workforceRepository = createOperationsRepository("workforce");

export type Assignment = z.infer<typeof c.assignmentSchema>;

/** Derives the attendance state of one assignment from its check-in / check-out timestamps. */
export const attendanceState = (row: Assignment) =>
  row.checkedOutAt ? (row.checkedInAt ? "finished" : "missing") : row.checkedInAt ? "working" : "planned";

export const attendanceLabel = {
  planned: "Chưa vào làm",
  working: "Đang làm",
  finished: "Đã ra về",
  missing: "Thiếu lượt vào",
};
