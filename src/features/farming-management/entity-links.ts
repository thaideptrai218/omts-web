import { farmingReferenceHref } from "./farming-reference-href";

/**
 * Domain-level link builders on top of `farmingReferenceHref` (the ONE place that knows the routes).
 * Each returns `undefined` when the record it points to is not identifiable, so a screen shows plain text instead of a dead link.
 */
type Maybe = string | null | undefined;
export type FarmingStep = "cycle" | "seeding" | "material" | "harvest";
/** Preserve the raft and cycle when moving along the cultivation workflow. */
export const farmingStepLink = (step: FarmingStep, ref: { zoneId: Maybe; raftId: Maybe; cycleId?: Maybe }) => farmingReferenceHref(step, ref);
/** The current employee directory opens exact records through recordId. Keep this adapter until it supports code links. */
export const employeeLink = (employeeId: Maybe) => employeeId ? farmingReferenceHref("employee", { recordId: employeeId }) : undefined;

/** A stock movement posted by a farming record (seeding session or material usage) links to that record on its own screen. */
export function movementSourceLink(movement: { sourceKind?: Maybe; sourceRecordId?: Maybe; cycleId?: Maybe; raftId?: Maybe; zoneId?: Maybe }): { label: string; href: string } | undefined {
  if (!movement.sourceRecordId || (movement.sourceKind !== "Seeding" && movement.sourceKind !== "MaterialUsage")) return undefined;
  const reference = { zoneId: movement.zoneId, raftId: movement.raftId, cycleId: movement.cycleId, recordId: movement.sourceRecordId };
  return movement.sourceKind === "Seeding" ? { label: "Thả giống", href: farmingReferenceHref("seeding", reference) } : { label: "Sửa chữa bè", href: farmingReferenceHref("material", reference) };
}

/** The use issue (Xuất dùng) a seeding session or material usage posted, by its code. */
export const issueLink = (issueCode: Maybe) => issueCode ? farmingReferenceHref("inputUse", { code: issueCode }) : undefined;

/** The Hành trình of a cycle on the cycle screen (the raft opens on that cycle). */
export const cycleJourneyLink = (ref: { zoneId: Maybe; raftId: Maybe; cycleId: Maybe }) => ref.cycleId ? farmingReferenceHref("cycle", { ...ref, tab: "journey" }) : undefined;

/** The yield report narrowed to a zone (and, when known, the raft or cycle). */
export const yieldLink = (ref: { zoneId: Maybe; raftId?: Maybe; cycleId?: Maybe }) => farmingReferenceHref("yield", ref);

/** The cash book opened on one voucher code (every fund, all time). */
export const voucherLink = (voucherCode: Maybe) => voucherCode ? farmingReferenceHref("cashBook", { search: voucherCode }) : undefined;
