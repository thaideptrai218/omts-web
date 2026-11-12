import type { AllocationInput } from "./contracts";

const cents = (value: number) => Math.round(value * 100);
/** Work in hundredths of a piece so the remainder is deterministic and totals stay exact. */
export function divideByLaneCount(survivors: number, rafts: readonly { raftId: string; laneCount: number }[]): AllocationInput[] {
  if (!Number.isFinite(survivors) || survivors < 0 || rafts.some(raft => !Number.isInteger(raft.laneCount) || raft.laneCount < 0)) return [];
  const lanes = rafts.reduce((total, raft) => total + raft.laneCount, 0);
  if (!lanes) return [];
  const total = cents(survivors), shares = rafts.map(raft => total * raft.laneCount / lanes);
  const rounded = shares.map(Math.floor);
  const order = shares.map((share, index) => ({ index, fraction: share - rounded[index] })).sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  const remainder = total - rounded.reduce((sum, value) => sum + value, 0);
  for (let index = 0; index < remainder; index++) rounded[order[index].index]++;
  return rafts.map((raft, index) => ({ raftId: raft.raftId, quantity: rounded[index] / 100 }));
}
export const putAllOnRaft = (survivors: number, raftId: string): AllocationInput[] => Number.isFinite(survivors) && survivors > 0 && raftId ? [{ raftId, quantity: cents(survivors) / 100 }] : [];
/** Positive means still to allocate, negative means too much has been allocated. */
export const allocationDifference = (survivors: number, allocations: readonly Pick<AllocationInput, "quantity">[]) =>
  (cents(survivors) - allocations.reduce((total, item) => total + cents(item.quantity), 0)) / 100;
export function estimatedLoss(quantityIn: number, survivors: number) {
  const lossPieces = (cents(quantityIn) - cents(survivors)) / 100;
  return { lossPieces, lossPercent: quantityIn > 0 ? Math.round(lossPieces / quantityIn * 10_000) / 100 : 0, estimated: true as const };
}
