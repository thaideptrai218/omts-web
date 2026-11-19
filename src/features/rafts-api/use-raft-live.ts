"use client";
import { useCallback } from "react";
import { seedingList } from "@/features/cultivation-api/records-contracts";
import { cycleProgress } from "@/features/cycles-api/contracts";
import { logListSchema, logRequest } from "@/features/cycles-api/log-repository";
import { readCycles } from "@/features/cycles-api/repository";
import { useStickyRemote } from "@/features/farming-management/use-sticky-remote";
import { waterHistorySchema } from "@/features/operations/contracts";
import { createOperationsRepository } from "@/features/operations/repository";
import { skipped } from "@/features/zones-api/zone-summary-reads";

/** What the signed-in account may read for the live state; every part loads on its own and only when allowed. */
export type RaftLiveAccess = { cycles: boolean; logs?: boolean; water?: boolean };
const seedRepository = createOperationsRepository("seeding"), waterRepository = createOperationsRepository("water");

/**
 * Current state of one raft: today's lane progress and cycle (state, seeded/harvested %, days farming), the seeding sessions and care logs of the open
 * cycle (seed, dates, photos) and the zone's recent water measurements (the newest one of THIS raft is picked in the view). Stale data stays while a part reloads.
 */
export function useRaftLive(raftId: string, zoneId: string, access: RaftLiveAccess) {
  const progress = useStickyRemote(useCallback((signal: AbortSignal) => access.cycles ? readCycles({ action: "progress", raftId }, cycleProgress, signal) : skipped(undefined), [raftId, access.cycles]));
  const cycleId = progress.data?.cycle?.id;
  const seeding = useStickyRemote(useCallback((signal: AbortSignal) => access.cycles && cycleId ? seedRepository.read("list", { id: cycleId, zoneId }, seedingList, signal) : skipped(undefined), [access.cycles, cycleId, zoneId]));
  const logs = useStickyRemote(useCallback((signal: AbortSignal) => access.logs && cycleId ? logRequest("list", cycleId, logListSchema, undefined, undefined, signal) : skipped(undefined), [access.logs, cycleId]));
  const water = useStickyRemote(useCallback((signal: AbortSignal) => access.water ? waterRepository.read("list", { zoneId, page: "1", pageSize: "50" }, waterHistorySchema, signal) : skipped(undefined), [access.water, zoneId]));
  const reload = () => { progress.reload(); seeding.reload(); logs.reload(); water.reload(); };
  return { progress, seeding, logs, water, reload };
}
export type RaftLive = ReturnType<typeof useRaftLive>;
