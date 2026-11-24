import { describe, expect, it } from "vitest";
import type { FunctionPermission } from "@/features/access/domain/function-permission";
import { cellAccessibleName, cellRights, emptyCellMessage, scheduleAllowed, schedulePeople, weekDays, weekStart } from "./schedule-model";
import { previewCopyWeek } from "./copy-week-model";
import { testAssignment, testIds as ids } from "./__tests__/schedule-fixtures";

const person = { id: ids.person, name: "Nguyễn An", eligible: true };
const grant = (functionCode = "WORK_ASSIGNMENTS", action: FunctionPermission["action"] = "View"): FunctionPermission => ({
  functionCode, action, dataScope: "AssignedZone", scope: { kind: "zones", zoneIds: [ids.zone] },
});

describe("schedule cell wording", () => {
  it("names an empty cell with person, weekday and date, and a filled one with its assignments", () => {
    expect(cellAccessibleName("Nguyễn An", "Thứ Ba", "25/11/2026", [])).toBe("Nguyễn An, Thứ Ba 25/11/2026: chưa có phân công");
    expect(cellAccessibleName("Nguyễn An", "Thứ Ba", "25/11/2026", ["Cấp vùng · Ươm", "B1 · Thả"])).toBe("Nguyễn An, Thứ Ba 25/11/2026: Cấp vùng · Ươm; B1 · Thả");
  });
  it("a past empty cell says the day has passed, never that the Owner lacks permission", () => {
    const cell = { person, day: "2026-11-10", assignments: [] };
    expect(emptyCellMessage(cell, "2026-11-20", false)).toBe("Ngày đã qua, không thể thêm phân công.");
    expect(emptyCellMessage(cell, "2026-11-20", false)).not.toMatch(/quyền/);
  });
});

describe("weekly schedule model", () => {
  it("uses Monday through Sunday across month/year/leap boundaries", () => {
    expect(weekStart("2027-01-03")).toBe("2026-12-28");
    expect(weekDays("2024-02-26")).toEqual(["2024-02-26", "2024-02-27", "2024-02-28", "2024-02-29", "2024-03-01", "2024-03-02", "2024-03-03"]);
    expect(() => weekStart("2026-02-30")).toThrow();
  });
  it("requires the assignment function and actual zone scope, never attendance alone", () => {
    expect(scheduleAllowed({ subjectType: "Staff" }, [grant()], "View", ids.zone)).toBe(true);
    expect(scheduleAllowed({ subjectType: "Staff" }, [grant()], "View", ids.otherZone)).toBe(false);
    expect(scheduleAllowed({ subjectType: "Staff" }, [grant("ATTENDANCE")], "View")).toBe(false);
    expect(scheduleAllowed({ subjectType: "Staff" }, [grant("PAYROLL")], "View")).toBe(false);
    expect(scheduleAllowed({ subjectType: "Staff" }, [grant()], "Create", ids.zone)).toBe(false);
    expect(scheduleAllowed({ subjectType: "Staff" }, [{ ...grant(), dataScope: "OwnRecords" }], "View")).toBe(false);
    expect(scheduleAllowed({ subjectType: "CooperativeOwner" }, [], "Delete", ids.otherZone)).toBe(true);
  });
  it("combines active zone people with historical assignments without leaking another zone", () => {
    const people = schedulePeople([person], [testAssignment({ employeeId: ids.secondPerson, employeeName: "Bình" }),
      testAssignment({ employeeId: "outside", zoneId: ids.otherZone })], ids.zone);
    expect(people).toHaveLength(2);
    expect(people.find((entry) => entry.id === ids.secondPerson)?.eligible).toBe(false);
    expect(people.some((entry) => entry.id === "outside")).toBe(false);
  });
  it("keeps past cells readonly; future replacement needs Create and Edit; checked-in work cannot be removed", () => {
    const cell = { person, day: "2026-11-23", assignments: [testAssignment()] };
    expect(cellRights(cell, ids.zone, "2026-11-24", () => true)).toEqual({ save: false, remove: false });
    expect(cellRights(cell, ids.zone, "2026-11-20", (action) => action === "Edit").save).toBe(false);
    expect(cellRights(cell, ids.zone, "2026-11-23", (action) => action === "Edit").save).toBe(true);
    expect(cellRights({ ...cell, assignments: [testAssignment({ checkedInAt: "2026-11-23T01:00:00Z" })] }, ids.zone, cell.day, () => true).remove).toBe(false);
  });
});

describe("copy preview", () => {
  const source = testAssignment({ date: "2026-11-16" });
  it("shifts exactly seven days and skips exact and occupied person/day cells, including other zones", () => {
    expect(previewCopyWeek([source], [], [person], ids.zone, "2026-11-20")[0]).toMatchObject({ status: "create", draft: { day: "2026-11-23" } });
    expect(previewCopyWeek([source], [testAssignment()], [person], ids.zone, "2026-11-20")[0].status).toBe("duplicate");
    expect(previewCopyWeek([source], [testAssignment({ zoneId: ids.otherZone })], [person], ids.zone, "2026-11-20")[0].status).toBe("occupied");
  });
  it("skips past dates, missing jobs, former zone members, other zones and duplicate source rows", () => {
    expect(previewCopyWeek([source], [], [person], ids.zone, "2026-11-24")[0].status).toBe("past");
    expect(previewCopyWeek([{ ...source, jobTypeId: null }], [], [person], ids.zone, "2026-11-20")[0].status).toBe("missing-job");
    expect(previewCopyWeek([source], [], [], ids.zone, "2026-11-20")[0].status).toBe("ineligible");
    expect(previewCopyWeek([{ ...source, zoneId: ids.otherZone }], [], [person], ids.zone, "2026-11-20")).toEqual([]);
    expect(previewCopyWeek([source, { ...source, id: "second" }], [], [person], ids.zone, "2026-11-20").map((entry) => entry.status)).toEqual(["create", "duplicate"]);
  });
});
