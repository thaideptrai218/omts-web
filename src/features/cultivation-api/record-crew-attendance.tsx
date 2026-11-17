"use client";
import { z } from "zod";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { Note } from "@/features/operations/ui";

/** MSG-LABOR-37: the employees of a record who have not been checked out yet, sent back when completing the record is refused. */
export const openAttendanceEmployees = z.array(z.object({ id: z.guid(), code: z.string().nullish(), name: z.string().max(200), checkedIn: z.boolean() })).max(100);
export type OpenAttendanceEmployee = z.infer<typeof openAttendanceEmployees>[number];

/** The employees named by a refusal with reason ATTENDANCE_OPEN, or undefined for any other failure. */
export function openAttendanceOf(failure: { problem?: { reasonCode?: string; employees?: unknown } } | undefined): OpenAttendanceEmployee[] | undefined {
  if (failure?.problem?.reasonCode !== "ATTENDANCE_OPEN") return undefined;
  const parsed = openAttendanceEmployees.safeParse(failure.problem.employees);
  return parsed.success && parsed.data.length ? parsed.data : undefined;
}

type CrewOfRecord = { id: string; code?: string | null; name: string; attendance?: string }[] | undefined;
/** Employees of the given records who are assigned but not checked out yet (not checked in, or still working): known before any click, so completing can be locked up front. */
export function openCrewOf(...crews: CrewOfRecord[]): OpenAttendanceEmployee[] | undefined {
  const open = new Map<string, OpenAttendanceEmployee>();
  for (const member of crews.flatMap(crew => crew ?? []))
    if (member.attendance === "NotCheckedIn" || member.attendance === "Working") open.set(member.id, { id: member.id, code: member.code, name: member.name, checkedIn: member.attendance === "Working" });
  return open.size ? [...open.values()] : undefined;
}

/** Fields that let the Cooperative Owner complete anyway; absent while no refusal is open or no reason is typed. */
export function ownerOverride(open: unknown, reason: string): { ownerApproved: true; approvalReason: string } | undefined {
  return open && reason.trim() ? { ownerApproved: true, approvalReason: reason.trim().slice(0, 1000) } : undefined;
}

export function useIsCooperativeOwner() { return useApiWorkspace().identity.subjectType === "CooperativeOwner"; }

/** Why completing is blocked (employees still at work) and, for the Owner only, the reason field that lets them complete anyway. */
export function AttendanceGatePanel({ employees, isOwner, reason, onReason }: { employees: readonly OpenAttendanceEmployee[]; isOwner: boolean; reason: string; onReason(value: string): void }) {
  return <section role="alert" aria-label="Nhân viên chưa điểm danh ra về" className="my-3 space-y-2 rounded-control border border-warning p-3 text-sm">
    <p className="font-medium">Còn {employees.length} nhân viên chưa điểm danh ra về, nên chưa thể hoàn tất.</p>
    <ul className="list-disc pl-5">{employees.map(item => <li key={item.id}>{item.name}{item.code ? ` · ${item.code}` : ""} ({item.checkedIn ? "đang làm, chưa ra về" : "chưa điểm danh vào"})</li>)}</ul>
    {isOwner
      ? <><Note label="Lý do hoàn tất khi nhân viên chưa ra về (chủ hợp tác xã xác nhận, được lưu vào nhật ký)" value={reason} maxLength={1000} onChange={event => onReason(event.target.value)} /></>
      : <p className="text-text-muted">Hãy điểm danh ra về cho nhân viên ở màn Chấm công, hoặc nhờ chủ hợp tác xã xác nhận.</p>}
  </section>;
}
