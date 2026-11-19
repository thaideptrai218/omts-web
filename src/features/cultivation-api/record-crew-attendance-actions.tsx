"use client";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { assignmentSchema } from "@/features/operations/new-module-contracts";
import { operationAllowed } from "@/features/operations/permissions";
import { businessToday, operationError, useRemote } from "@/features/operations/ui";
import { workforceRepository } from "@/features/operations/workforce-shared";

type Done = "working" | "finished";

/**
 * Manual check-in / check-out of one crew member of a record, from the screen that blocks completion. It reads today's day board once
 * (the backend records attendance for today only), finds the assignment of each employee and calls the same endpoints as the Chấm công
 * screen: only where the caller holds the Attendance grant for the zone of that assignment; the backend decides the rest.
 */
export function useCrewAttendanceActions() {
  const context = useApiWorkspace();
  const board = useRemote(useMemo(() => (signal: AbortSignal) => workforceRepository.read("list", { day: businessToday() }, z.array(assignmentSchema), signal), []));
  const [done, setDone] = useState<Record<string, Done>>({});
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();

  async function record(employeeId: string, action: "check-in" | "check-out") {
    const row = board.data?.find((item) => item.employeeId === employeeId);
    if (!row || busy) return;
    setBusy(employeeId); setError(undefined);
    const result = await workforceRepository.write(action, { qrCode: null }, assignmentSchema, row.id, row.zoneId).catch(() => undefined);
    setBusy(undefined);
    if (result?.status === "success") setDone((current) => ({ ...current, [employeeId]: action === "check-in" ? "working" : "finished" }));
    else setError(result ? operationError(result) : "Chưa ghi nhận được. Hãy tải lại và kiểm tra trước khi thử lại.");
  }

  /** What the member can still be given: nothing when no assignment today, no grant for its zone, or the check-out is recorded already. */
  function offer(employeeId: string, checkedIn: boolean): { state: Done | undefined; action?: "check-in" | "check-out" } {
    const row = board.data?.find((item) => item.employeeId === employeeId);
    const state = done[employeeId];
    if (state === "finished") return { state };
    if (!row || !operationAllowed("workforce", context.identity, context.permissions.functionPermissions, "AttendanceCreate", row.zoneId)) return { state };
    if (state === "working" || checkedIn || row.checkedInAt) return { state, action: "check-out" };
    return { state, action: "check-in" };
  }
  return { error, busy, record, offer, loading: board.loading };
}

export function CrewAttendanceButton({ employeeId, name, checkedIn, actions }: {
  employeeId: string; name: string; checkedIn: boolean; actions: ReturnType<typeof useCrewAttendanceActions>;
}) {
  const { state, action } = actions.offer(employeeId, checkedIn);
  if (state === "finished") return <span className="ml-2 text-text-muted">Đã ghi ra về</span>;
  if (!action) return null;
  return <Button type="button" className="ml-2 w-auto" variant="secondary" disabled={!!actions.busy} onClick={() => void actions.record(employeeId, action)}
    aria-label={`${action === "check-in" ? "Ghi vào làm" : "Ghi ra về"} cho ${name}`}>{action === "check-in" ? "Ghi vào làm" : "Ghi ra về"}</Button>;
}
