"use client";
import { useCallback } from "react";
import { seedingList } from "@/features/cultivation-api/records-contracts";
import { cycleProgress } from "@/features/cycles-api/contracts";
import { logListSchema, logRequest } from "@/features/cycles-api/log-repository";
import { readCycles } from "@/features/cycles-api/repository";
import { useStickyRemote } from "@/features/farming-management/use-sticky-remote";
import { createOperationsRepository } from "@/features/operations/repository";
import { skipped } from "@/features/zones-api/zone-summary-reads";

/** What the signed-in account may read for the live state; every part loads on its own and only when allowed. */
export type RaftLiveAccess = { cycles: boolean; logs?: boolean };
const seedRepository = createOperationsRepository("seeding");

/**
 * Live state behind the "Làn & ảnh" tab: today's lane progress of the raft, and the seeding sessions and care logs of its open cycle (seed, dates, photos).
 * Used only by that tab, so nothing is read until the tab is opened. Stale data stays while a part reloads.
 */
export function useRaftLive(raftId: string, zoneId: string, access: RaftLiveAccess) {
  const progress = useStickyRemote(useCallback((signal: AbortSignal) => access.cycles ? readCycles({ action: "progress", raftId }, cycleProgress, signal) : skipped(undefined), [raftId, access.cycles]));
  const cycleId = progress.data?.cycle?.id;
  const seeding = useStickyRemote(useCallback((signal: AbortSignal) => access.cycles && cycleId ? seedRepository.read("list", { id: cycleId, zoneId }, seedingList, signal) : skipped(undefined), [access.cycles, cycleId, zoneId]));
  const logs = useStickyRemote(useCallback((signal: AbortSignal) => access.logs && cycleId ? logRequest("list", cycleId, logListSchema, undefined, undefined, signal) : skipped(undefined), [access.logs, cycleId]));
  const reload = () => { progress.reload(); seeding.reload(); logs.reload(); };
  return { progress, seeding, logs, reload };
}
export type RaftLive = ReturnType<typeof useRaftLive>;
