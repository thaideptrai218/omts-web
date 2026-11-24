import { describe, expect, it } from "vitest";
import type { FunctionPermission } from "@/features/access/domain/function-permission";
import type { NurseryRow } from "@/features/nursery-api/contracts";
import { attendanceAccess, attendanceSummary, todayPeople } from "@/features/attendance-today/attendance-today-model";
import { assignment, ids, snapshot, staff } from "@/features/attendance-today/attendance-today.fixtures";
import { approvalItems, debtSummary, homeAttendance, nursingBatches, planHomeStep, plansToHandle } from "./home-selection";

const day = "2026-11-20";
const grant = (action: FunctionPermission["action"]): FunctionPermission => ({ functionCode: "ATTENDANCE", action, dataScope: "AssignedZone", scope: { kind: "zones", zoneIds: [ids.zone] } });
const allowed = attendanceAccess({ subjectType: "Staff" }, [grant("View"), grant("Create")]);

describe("home selection", () => {
  it("counts who has not checked in from the same source and numbers as the screen Chấm công hôm nay", () => {
    // One assignment plus one internal staff member, nobody checked in: the old block saw only the assignment.
    const data = snapshot(day, { assignments: [assignment(day)], staff: [staff(day)] });
    const home = homeAttendance(data, day, allowed);
    const screen = attendanceSummary(todayPeople(data, day, "", allowed), day);
    expect(home.total).toBe(2);
    expect(home.waiting).toBe(screen.waiting);
    expect(home.total).toBe(screen.total);
    expect(home.names).toHaveLength(2);
  });
  it("does not list people who are already working or outside the granted zones", () => {
    const data = snapshot(day, { assignments: [assignment(day), assignment(day, { id: "foreign", zoneId: ids.other, employeeId: "other-worker" })],
      staff: [staff(day, { checkedInAt: `${day}T08:00:00+07:00` })] });
    const home = homeAttendance(data, day, allowed);
    expect(home).toMatchObject({ total: 2, waiting: 1, working: 1 });
    expect(home.names).toHaveLength(1);
  });
  it("lists nursing batches only, longest first", () => {
    const row = (id: string, statusId: number, daysNursing: number) => ({ id, statusId, daysNursing }) as NurseryRow;
    expect(nursingBatches([row("a", 4001, 3), row("b", 4002, 40), row("c", 4001, 9)]).map((item) => item.id)).toEqual(["c", "a"]);
  });
  it("sums only suppliers that still owe", () => {
    expect(debtSummary([{ outstanding: 100 }, { outstanding: 0 }, { outstanding: 50 }])).toEqual({ suppliers: 2, outstanding: 150 });
  });
  it("keeps known approval kinds with a count and drops the rest", () => {
    const items = approvalItems([{ kind: "PurchaseRequest", count: 2 }, { kind: "QualityClaim", count: 0 }, { kind: "Other", count: 5 }, { kind: "EmployeeRequest", count: 1 }]);
    expect(items.map((item) => [item.kind, item.href])).toEqual([["PurchaseRequest", "/operations/purchase-requests"], ["EmployeeRequest", "/operations/workforce"]]);
  });
});

describe("plans the zone manager has to handle", () => {
  const plan = (code: string, plannedAt: string, allowedActions: string[], canHarvest = false) => ({ code, plannedAt, allowedActions, lines: [{ canHarvest, lot: null }] }) as never;
  it("keeps plans to receive, to harvest and to hand over, oldest first, with the step of each", () => {
    const rows = [plan("C", "2026-11-20", ["HandOver"]), plan("A", "2026-11-18", ["Receive"]), plan("B", "2026-11-19", ["Harvest"], true), plan("D", "2026-11-17", [])];
    const kept = plansToHandle(rows);
    expect(kept.map((row) => (row as { code: string }).code)).toEqual(["A", "B", "C"]);
    expect(kept.map(planHomeStep)).toEqual(["Cần nhận", "Đang thu", "Chờ bàn giao"]);
  });
});
