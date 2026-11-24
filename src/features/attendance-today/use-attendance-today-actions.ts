"use client";
import { useState } from "react";
import { useToast } from "@/components/ui/toast-provider";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { businessTime, businessToday, operationError, useMutation } from "@/features/operations/ui";
import { offeredStep, type AttendanceAllowed, type AttendanceStep, type TodayPerson } from "./attendance-today-model";
import { recordAttendance, startCrew } from "./attendance-today-service";

export type AttendanceOutcome = { key: string; name: string; ok: boolean; message: string };
export type CrewStartInput = { time: string; reason: string };
export const MAX_TODAY_BATCH = 30;

/** One write at a time, no replay after an uncertain result; successful people remain visible during refresh. */
export function useAttendanceTodayActions(day: string, zoneId: string, allowed: AttendanceAllowed, onSettled: () => void, refreshing = false) {
  const mutation = useMutation();
  const { notify } = useToast();
  const [pendingKey, setPendingKey] = useState<string>();
  const [outcomes, setOutcomes] = useState<AttendanceOutcome[]>();

  async function record(rows: readonly TodayPerson[], step: AttendanceStep, key: string, crew?: CrewStartInput) {
    if (mutation.busy() || mutation.blocked || refreshing || day !== businessToday()) return false;
    const eligible = [...new Map(rows.filter(row => offeredStep(row, day, zoneId, allowed) === step).map(row => [row.employeeId, row])).values()];
    if (!eligible.length) return false;
    const chosen = eligible.slice(0, crew ? 100 : MAX_TODAY_BATCH);
    setPendingKey(key); setOutcomes(undefined);
    let completed = 0;
    const completedNames: string[] = [];
    const result = await mutation.run(async (): Promise<WorkspaceResult<true>> => {
      if (crew) {
        const assignment = chosen[0].assignment;
        if (!assignment || !crew.reason.trim() || crew.time > businessTime().slice(11, 16)) return { status: "error", httpStatus: 400, uncertain: false };
        const saved = await startCrew({ ...(assignment.raftId ? { raftId: assignment.raftId } : { zoneId: assignment.zoneId }),
          startTime: crew.time, reason: crew.reason.trim(), employeeIds: chosen.map(row => row.employeeId) }, assignment.zoneId);
        if (saved.status === "error") return saved;
        completed = saved.data.length;
        completedNames.push(...saved.data.map(row => row.employeeName));
        return { status: "success", data: true };
      }
      const items: AttendanceOutcome[] = [];
      let failure: Extract<WorkspaceResult<unknown>, { status: "error" }> | undefined;
      for (const row of chosen) {
        const overnight = step === "check-out" && row.day < day ? row.overnightAssignment : undefined;
        const saved = await recordAttendance(overnight ? "assignment" : row.source, overnight?.id ?? row.id, step, overnight?.zoneId ?? row.assignment?.zoneId)
          .catch(() => ({ status: "error" as const, httpStatus: 0, uncertain: true }));
        items.push({ key: row.key, name: row.name, ok: saved.status === "success", message: saved.status === "success"
          ? `Đã ghi ${step === "check-in" ? "vào làm" : "ra về"}.` : `${operationError(saved)}${saved.uncertain ? " Chưa rõ kết quả; đối chiếu trước khi ghi lại." : ""}` });
        if (saved.status === "success") { completed++; completedNames.push(row.name); }
        else if (!failure || saved.uncertain) failure = saved;
        // Do not keep writing after session expiry or an ambiguous response.
        if (saved.status === "error" && (saved.uncertain || saved.httpStatus === 401)) break;
      }
      setOutcomes(items);
      return failure ?? { status: "success", data: true };
    });
    setPendingKey(undefined);
    if (completed) notify({ tone: "success", title: `Đã ghi ${step === "check-in" ? "vào làm" : "ra về"} cho ${completed === 1 ? completedNames[0] : `${completed} người`}.` });
    onSettled();
    return !!result;
  }

  return { ...mutation, pending: mutation.pending || refreshing, record, pendingKey, outcomes, clearOutcomes: () => setOutcomes(undefined) };
}

export type AttendanceTodayActions = ReturnType<typeof useAttendanceTodayActions>;
