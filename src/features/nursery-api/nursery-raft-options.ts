import type { CycleRow } from "@/features/cycles-api/cycle-model";
import type { NurseryDetail } from "./contracts";

export type NurseryRaftOption = { raftId: string; raftCode: string; laneCount: number | null };

/** Rows are already scoped by the zone repository. Existing recipients remain visible during corrections. */
export function nurseryRaftOptions(rafts: readonly CycleRow[], batch: Pick<NurseryDetail, "allocations">): NurseryRaftOption[] {
  const offered: NurseryRaftOption[] = rafts.filter(row =>
    (row.raftStatusId === 101 && (!row.cycle || !!row.cycle.closeDate)) || batch.allocations.some(item => item.raftId === row.raftId));
  for (const old of batch.allocations) {
    if (!offered.some(row => row.raftId === old.raftId)) offered.push({ raftId: old.raftId, raftCode: old.raftCode, laneCount: null });
  }
  return offered;
}
