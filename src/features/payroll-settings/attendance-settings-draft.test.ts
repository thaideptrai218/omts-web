import { expect, it } from "vitest";
import { attendancePayload, attendanceProblem, attendanceQuestion, displayClock, isAttendanceDirty, sortedVersions, type AttendanceDraft } from "./attendance-settings-draft";

const current = { effectiveFrom: "2026-06-01", breakStart: "11:30:00", breakEnd: "12:30:00", roundingUnit: "Minutes15" as const };
const draft: AttendanceDraft = { breakFrom: "11:30", breakTo: "12:30", rounding: "Minutes15", effectiveFrom: "2026-11-11" };

it("shows clock values without trailing seconds", () => {
  expect(displayClock("11:30:00")).toBe("11:30");
  expect(displayClock("11:30:15")).toBe("11:30:15");
  expect(displayClock(null)).toBe("");
});

it("is dirty only when something differs from the current version or the default date", () => {
  expect(isAttendanceDirty(draft, current, "2026-11-11")).toBe(false);
  expect(isAttendanceDirty({ ...draft, rounding: "Hour1" }, current, "2026-11-11")).toBe(true);
  expect(isAttendanceDirty({ ...draft, effectiveFrom: "2026-12-01" }, current, "2026-11-11")).toBe(true);
});

it("requires both break times or neither, with the end after the start", () => {
  expect(attendanceProblem(draft)).toBeUndefined();
  expect(attendanceProblem({ ...draft, breakFrom: "", breakTo: "" })).toBeUndefined();
  expect(attendanceProblem({ ...draft, breakTo: "" })).toContain("đủ giờ nghỉ");
  expect(attendanceProblem({ ...draft, breakTo: "11:30" })).toContain("phải sau");
  expect(attendanceProblem({ ...draft, effectiveFrom: "" })).toContain("ngày áp dụng");
});

it("builds the backend payload with seconds, nulls and the row version, or nothing for an invalid draft", () => {
  expect(attendancePayload(draft, "a1")).toEqual({ breakStart: "11:30:00", breakEnd: "12:30:00", roundingUnit: "Minutes15", effectiveFrom: "2026-11-11", rowVersion: "a1" });
  expect(attendancePayload({ ...draft, breakFrom: "", breakTo: "" }, "a1")).toMatchObject({ breakStart: null, breakEnd: null });
  expect(attendancePayload({ ...draft, breakTo: "" }, "a1")).toBeUndefined();
});

it("words the confirmation and orders versions newest first", () => {
  expect(attendanceQuestion(draft)).toContain("11:30 đến 12:30");
  expect(attendanceQuestion({ ...draft, breakFrom: "", breakTo: "" })).toContain("không trừ giờ nghỉ");
  expect(sortedVersions([{ ...current, effectiveFrom: "2026-01-01" }, current]).map((v) => v.effectiveFrom)).toEqual(["2026-06-01", "2026-01-01"]);
});
