import type { AllocationInput } from "./contracts";

/** Keep unfinished input (including empty text and trailing decimals) until validation/submission. */
export type AllocationDraft = { raftId: string; quantity: string; targetYieldKg: string };

/** UnitField drafts are ungrouped text; accept either decimal mark without guessing thousands. */
export function nurseryDraftNumber(text: string): number {
  const normalized = text.trim().replace(",", ".");
  return /^\d+(\.\d{0,2})?$/.test(normalized) ? Number(normalized) : NaN;
}

export const allocationDrafts = (items: readonly { raftId: string; quantity: number; targetYieldKg?: number | null }[]): AllocationDraft[] => items.map(item => ({
  raftId: item.raftId, quantity: String(item.quantity), targetYieldKg: item.targetYieldKg == null ? "" : String(item.targetYieldKg),
}));

export const allocationInputs = (drafts: readonly AllocationDraft[]): AllocationInput[] => drafts.map(item => ({
  raftId: item.raftId,
  quantity: nurseryDraftNumber(item.quantity),
  ...(item.targetYieldKg.trim() === "" ? {} : { targetYieldKg: nurseryDraftNumber(item.targetYieldKg) }),
}));
