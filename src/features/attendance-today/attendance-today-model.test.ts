import { describe, expect, it } from "vitest";
import type { FunctionPermission } from "@/features/access/domain/function-permission";
import { assignment, ids, snapshot, staff } from "./attendance-today.fixtures";
import { attendanceAccess, attendanceSummary, grantedZones, groupPeople, offeredStep, searchPeople, todayLabel, todayPeople, todayState } from "./attendance-today-model";

const day = "2026-11-20";
const grant = (action: FunctionPermission["action"]): FunctionPermission => ({ functionCode: "ATTENDANCE", action, dataScope: "AssignedZone", scope: { kind: "zones", zoneIds: [ids.zone] } });
const allowed = attendanceAccess({ subjectType: "Staff" }, [grant("View"), grant("Create")]);

describe("today attendance projection", () => {
  it("uses function grants and never response rows to widen the zone selector", () => {
    expect(grantedZones([{ id: ids.zone }, { id: ids.other }], allowed)).toEqual([{ id: ids.zone }]);
    expect(attendanceAccess({ subjectType: "Staff" }, [])("View")).toBe(false);
    expect(attendanceAccess({ subjectType: "Staff" }, [{ ...grant("View"), dataScope: "OwnRecords" }])("View")).toBe(false);
    expect(allowed("AttendanceCreate", ids.other)).toBe(false);
  });

  it("joins internal staff to granted working zones and excludes unknown and foreign staff", () => {
    const data = snapshot(day, { assignments: [assignment(day), assignment(day, { id: "foreign", zoneId: ids.other })],
      staff: [staff(day), staff(day, { employeeId: "unknown" }), staff(day, { employeeId: "foreign" })],
      scope: [{ id: ids.staff, zoneIds: [ids.zone] }, { id: "foreign", zoneIds: [ids.other] }] });
    const rows = todayPeople(data, day, ids.zone, allowed);
    expect(rows.map(row => row.employeeId)).toEqual([ids.worker, ids.staff]);
    expect(todayPeople(data, day, ids.other, allowed)).toEqual([]);
  });

  it("places staff in one internal group instead of duplicating their assignment", () => {
    const rows = todayPeople(snapshot(day, { assignments: [assignment(day, { employeeId: ids.staff })] }), day, "", allowed);
    expect(rows).toHaveLength(1);
    expect(groupPeople(rows, () => "Vùng Đông")[0].label).toBe("Nhân viên nội bộ");
    expect(attendanceSummary(rows, day).total).toBe(1);
  });

  it("groups raft crews apart from zone-level work and keeps internal staff last", () => {
    const rows = todayPeople(snapshot(day, { assignments: [assignment(day), assignment(day, { id: "zone-work", raftId: null, raftCode: null, employeeId: "c" })] }), day, "", allowed);
    expect(groupPeople(rows, () => "Vùng Đông").map(group => group.label)).toEqual(["Bè B01 · Vùng Đông", "Vùng Đông", "Nhân viên nội bộ"]);
    expect(searchPeople(rows, "nv02", () => "Vùng Đông")).toHaveLength(1);
    expect(searchPeople(rows, "vệ sinh", () => "Vùng Đông")).toHaveLength(2);
  });

  it("retains only previous open rows and offers a date-targeted overnight checkout for assignments", () => {
    const yesterday = "2026-11-19";
    const rows = todayPeople(snapshot(day, { assignments: [assignment(yesterday, { checkedInAt: `${yesterday}T22:00:00+07:00` }), assignment(yesterday, { id: "closed", checkedOutAt: `${yesterday}T23:00:00+07:00` })],
      staff: [staff(yesterday, { checkedInAt: `${yesterday}T22:00:00+07:00` })] }), day, "", allowed);
    expect(rows).toHaveLength(2);
    expect(offeredStep(rows[0], day, "", allowed)).toBe("check-out");
    expect(offeredStep(rows[1], day, "", allowed)).toBeUndefined();
  });

  it("shares the four states, approved-leave rule and no-job rule with existing attendance", () => {
    const rows = todayPeople(snapshot(day), day, "", allowed);
    const worker = rows[0];
    expect(todayState(worker)).toBe("planned");
    expect(todayState({ ...worker, checkedInAt: `${day}T07:00:00+07:00` })).toBe("working");
    expect(todayState({ ...worker, checkedInAt: `${day}T07:00:00+07:00`, checkedOutAt: `${day}T12:00:00+07:00` })).toBe("finished");
    expect(todayState({ ...worker, checkedOutAt: `${day}T12:00:00+07:00` })).toBe("missing");
    expect(offeredStep({ ...worker, onLeave: true }, day, "", allowed)).toBeUndefined();
    expect(todayLabel({ ...worker, onLeave: true })).toBe("Nghỉ phép đã duyệt");
    expect(offeredStep({ ...worker, assignment: { ...worker.assignment!, jobTypeId: null } }, day, "", allowed)).toBeUndefined();
  });

  it("counts people once and distinguishes outstanding previous/long check-ins from normal work", () => {
    const data = snapshot(day, { assignments: [assignment(day), assignment("2026-11-19", { id: "previous", checkedInAt: "2026-11-19T22:00:00+07:00" })],
      staff: [staff(day, { checkedInAt: `${day}T08:00:00+07:00` })] });
    expect(attendanceSummary(todayPeople(data, day, "", allowed), day, Date.parse(`${day}T10:00:00+07:00`)))
      .toEqual({ total: 2, working: 2, waiting: 0, unclosed: 1 });
  });
});
