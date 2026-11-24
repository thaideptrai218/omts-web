import { attendanceSummary, todayPeople, todayState, type AttendanceAllowed } from "@/features/attendance-today/attendance-today-model";
import type { TodaySnapshot } from "@/features/attendance-today/attendance-today-service";
import { lineCanHarvest } from "@/features/harvest-plans/plan-logic";
import type { z } from "zod";
import type { planView } from "@/features/harvest-plans/contracts";
import type { NurseryRow } from "@/features/nursery-api/contracts";
import { isOutside, type WaterRow } from "@/features/operations/water-history-model";

type Plan = z.infer<typeof planView>;
const NURSING = 4001;

/**
 * "Chưa vào làm hôm nay" with the very same people and numbers as the screen "Chấm công hôm nay" (/work/today):
 * assignments plus internal staff, zones limited to the grants, one person counted once (the model of that screen does the counting).
 */
export function homeAttendance(snapshot: TodaySnapshot, day: string, allowed: AttendanceAllowed, limit = 5) {
  const people = todayPeople(snapshot, day, "", allowed);
  const sum = attendanceSummary(people, day);
  const working = new Set(people.filter((row) => todayState(row) === "working").map((row) => row.employeeId));
  const names = [...new Set(people.filter((row) => todayState(row) === "planned" && !working.has(row.employeeId)).map((row) => row.name))].slice(0, limit);
  return { total: sum.total, waiting: sum.waiting, working: sum.working, names };
}

/** Kế hoạch thu hoạch quản lý vùng cần xử lý: cần nhận, còn dòng bè để thu, hoặc đã thu xong chờ bàn giao. Theo `allowedActions` của API. */
export function plansToHandle(plans: readonly Plan[]) {
  return plans.filter((plan) => plan.allowedActions.includes("Receive") || plan.allowedActions.includes("HandOver") || plan.lines.some(lineCanHarvest)).sort((a, b) => a.plannedAt.localeCompare(b.plannedAt));
}

/** Việc kế tiếp của quản lý vùng trên một kế hoạch: "Cần nhận", "Chờ bàn giao" hoặc "Đang thu". */
export function planHomeStep(plan: Pick<Plan, "allowedActions">): string {
  return plan.allowedActions.includes("Receive") ? "Cần nhận" : plan.allowedActions.includes("HandOver") ? "Chờ bàn giao" : "Đang thu";
}

/** Đợt ươm đang chạy, lâu ngày nhất lên đầu (gần xong nhất theo ngày ươm). */
export function nursingBatches(rows: readonly NurseryRow[]) {
  return rows.filter((row) => row.statusId === NURSING).sort((a, b) => b.daysNursing - a.daysNursing);
}

/** Số đo nước vượt ngưỡng trong các dòng đã đọc. */
export const outsideWaterCount = (rows: readonly WaterRow[]) => rows.filter(isOutside).length;

/** Tổng nợ nhà cung cấp: số nhà cung cấp còn nợ và tổng còn phải trả. */
export function debtSummary(debts: readonly { outstanding: number }[]) {
  const owing = debts.filter((row) => row.outstanding > 0);
  return { suppliers: owing.length, outstanding: owing.reduce((sum, row) => sum + row.outstanding, 0) };
}

/** Việc chờ Chủ duyệt, theo loại việc của backend (PendingTaskKinds) và màn xử lý; loại không biết bị bỏ qua. */
const APPROVALS: Readonly<Record<string, { title: string; href: string }>> = {
  PurchaseRequest: { title: "Yêu cầu mua chờ phản hồi", href: "/operations/purchase-requests" },
  QualityClaim: { title: "Khiếu nại chất lượng chờ xử lý", href: "/operations/quality-claims" },
  EmployeeRequest: { title: "Nghỉ phép và sửa chấm công chờ duyệt", href: "/operations/workforce" },
  Payroll: { title: "Bảng lương chờ xử lý", href: "/operations/payroll" },
};
export const approvalKinds = Object.keys(APPROVALS);

export function approvalItems(groups: readonly { kind: string; count: number }[]) {
  return groups.flatMap((group) => APPROVALS[group.kind] && group.count > 0 ? [{ kind: group.kind, count: group.count, ...APPROVALS[group.kind] }] : []);
}
