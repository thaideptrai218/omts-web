"use client";
import { useCallback } from "react";
import { cycleHistory } from "@/features/cycles-api/contracts";
import { readCycles } from "@/features/cycles-api/repository";
import { useRemote } from "@/features/operations/ui";

const OPEN_CYCLE_REASON = "Bè có chu kỳ đang mở; chỉ thêm hoặc bớt làn cuối khi không có chu kỳ mở.";
/**
 * Why the lane count cannot change right now. `hasOpenCycle` comes from the raft record (`currentCycle`): when it is known no read is made.
 * Only when the record does not say (undefined) the cycle history is read, and only once `enabled` (the record is being edited); it fails closed until that history proves there is no open cycle.
 */
export function useRaftLaneLock(raftId: string | undefined, hasOpenCycle: boolean | undefined, enabled: boolean) {
  const known = hasOpenCycle !== undefined, read = !!raftId && !known && enabled;
  const remote = useRemote(useCallback((signal: AbortSignal) => read
    ? readCycles({ action: "history", raftId }, cycleHistory, signal)
    : Promise.resolve({ status: "success" as const, data: [] }), [read, raftId]));
  if (!raftId || !enabled) return { reason: undefined, failed: false, reload: remote.reload };
  if (known) return { reason: hasOpenCycle ? OPEN_CYCLE_REASON : undefined, failed: false, reload: remote.reload };
  const reason = remote.loading ? "Đang kiểm tra chu kỳ; chưa thể đổi số làn."
    : remote.error || !remote.data ? "Chưa xác định được chu kỳ; chưa thể đổi số làn."
    : remote.data.some(cycle => !cycle.closeDate) ? OPEN_CYCLE_REASON : undefined;
  return { reason, failed: !!remote.error, reload: remote.reload };
}
