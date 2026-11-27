"use client";
import { useCallback } from "react";
import { cycleHistory } from "@/features/cycles-api/contracts";
import { readCycles } from "@/features/cycles-api/repository";
import { useRemote } from "@/features/operations/ui";
import type { RaftDetail } from "./raft-model";

export type OpenCycle = { id: string; startDate: string };
/**
 * The open cycle of a raft for a tab that needs its id (care logs, material use). The raft record already carries it (`currentCycle`), so then nothing is read;
 * only a backend that does not send it makes the tab read the cycle history, once, when the tab opens.
 */
export function useOpenCycle(raft: Pick<RaftDetail, "id" | "currentCycle">): { cycle: OpenCycle | null | undefined; loading: boolean; error: string | undefined; reload(): void } {
  const known = raft.currentCycle !== undefined;
  const remote = useRemote(useCallback((signal: AbortSignal) => known
    ? Promise.resolve({ status: "success" as const, data: [] })
    : readCycles({ action: "history", raftId: raft.id }, cycleHistory, signal), [known, raft.id]));
  if (known) return { cycle: raft.currentCycle ? { id: raft.currentCycle.id, startDate: raft.currentCycle.startDate } : null, loading: false, error: undefined, reload: remote.reload };
  const open = remote.data?.find(cycle => !cycle.closeDate);
  return { cycle: remote.data ? open ? { id: open.id, startDate: open.startDate } : null : undefined, loading: remote.loading, error: remote.error, reload: remote.reload };
}
