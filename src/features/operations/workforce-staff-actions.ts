"use client";
import { useCallback, useState } from "react";
import { operationError } from "./ui";
import * as w from "./workforce-contracts";
import { workforceRepository as repository } from "./workforce-shared";

export type StaffRow = w.StaffAttendance;
export type StaffStep = "check-in" | "check-out";
/** One batch is limited: each person is one call, sent one after another. */
export const MAX_STAFF_BATCH = 30;
export type StaffResult = { id: string; name: string; ok: boolean; message: string };

/**
 * One-click check-in / check-out of internal employees. The row shows the new state at once (optimistic) with its own spinner;
 * a failed call restores the row and reports why. No confirmation step: the Owner can correct a wrong time afterwards.
 */
export function useStaffAttendanceActions(day: string, onSettled: () => void) {
  // Optimistic or confirmed state of a row, keyed by day so another day never inherits it.
  const [overrides, setOverrides] = useState<Record<string, Partial<StaffRow>>>({});
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const [error, setError] = useState<string>(), [notice, setNotice] = useState<string>();
  const [batch, setBatch] = useState<StaffResult[]>(), [batching, setBatching] = useState(false);
  const key = (id: string) => `${day}:${id}`;
  const merged = (row: StaffRow): StaffRow => ({ ...row, ...overrides[key(row.employeeId)] });
  const mark = (id: string, on: boolean) => setPending((current) => { const next = new Set(current); if (on) next.add(id); else next.delete(id); return next; });

  /** Sends one step; resolves with an error message, or undefined on success. */
  async function send(row: StaffRow, step: StaffStep): Promise<string | undefined> {
    const id = row.employeeId, before = overrides[key(id)];
    mark(id, true);
    setOverrides((current) => ({ ...current, [key(id)]: { ...before, ...(step === "check-in" ? { checkedInAt: new Date().toISOString() } : { checkedOutAt: new Date().toISOString() }) } }));
    try {
      const result = await repository.write<unknown>(step === "check-in" ? "staff-check-in" : "staff-check-out", { qrCode: null }, w.staffAttendanceSchema, id);
      if (result.status === "success") {
        const saved = result.data as StaffRow;
        setOverrides((current) => ({ ...current, [key(id)]: { checkedInAt: saved.checkedInAt, checkedOutAt: saved.checkedOutAt } }));
        return undefined;
      }
      setOverrides((current) => { const next = { ...current }; if (before) next[key(id)] = before; else delete next[key(id)]; return next; });
      return `${operationError(result)}${result.uncertain ? " Chưa rõ kết quả, hãy tải lại danh sách để đối chiếu." : ""}`;
    } catch {
      setOverrides((current) => { const next = { ...current }; delete next[key(id)]; return next; });
      return "Chưa gửi được thao tác. Hãy thử lại.";
    } finally { mark(id, false); }
  }

  async function one(row: StaffRow, step: StaffStep) {
    setError(undefined); setNotice(undefined); setBatch(undefined);
    const failure = await send(row, step);
    if (failure) setError(failure); else setNotice(`Đã ghi ${step === "check-in" ? "vào làm" : "ra về"} cho ${row.employeeName}.`);
    onSettled();
  }

  /** "Vào làm tất cả đang chờ": the rows still without a check-in, one after another; one person failing never stops the rest. */
  async function checkInAll(rows: readonly StaffRow[]) {
    const waiting = rows.filter((row) => !row.checkedInAt && !row.checkedOutAt && !row.onLeave).slice(0, MAX_STAFF_BATCH);
    if (!waiting.length) return;
    setError(undefined); setNotice(undefined); setBatching(true);
    const items: StaffResult[] = [];
    for (const row of waiting) {
      const failure = await send(row, "check-in");
      items.push({ id: row.employeeId, name: row.employeeName, ok: !failure, message: failure ?? "Đã ghi vào làm." });
    }
    setBatch(items); setBatching(false); onSettled();
  }

  /** Fresh server data replaces the optimistic state. */
  const reset = useCallback(() => setOverrides({}), []);

  return { reset, merged, pending, error, notice, batch, batching, one, checkInAll, clearBatch: () => setBatch(undefined) };
}
