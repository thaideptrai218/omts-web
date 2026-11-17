"use client";
import { useCallback } from "react";
import { cycleHistory } from "@/features/cycles-api/contracts";
import { readCycles } from "@/features/cycles-api/repository";
import { useRemote } from "@/features/operations/ui";

/** Fail closed until the existing cycle history proves there is no open cycle. */
export function useRaftLaneLock(raftId?: string) {
  const remote = useRemote(useCallback((signal: AbortSignal) => raftId
    ? readCycles({ action: "history", raftId }, cycleHistory, signal)
    : Promise.resolve({ status: "success" as const, data: [] }), [raftId]));
  const reason = !raftId ? undefined : remote.loading ? "Đang kiểm tra chu kỳ; chưa thể đổi số làn."
    : remote.error || !remote.data ? "Chưa xác định được chu kỳ; chưa thể đổi số làn."
    : remote.data.some(cycle => !cycle.closeDate) ? "Bè có chu kỳ đang mở; chỉ thêm hoặc bớt làn cuối khi không có chu kỳ mở." : undefined;
  return { reason, failed: !!remote.error, reload: remote.reload };
}
