"use client";
import Link from "next/link";
import { StatusPill } from "@/components/ui/management-page";
import { seedLotsHref } from "@/features/input-items/stock-kind";
import { finalSeedLotStates, type SeedLotState } from "./contracts";

/** The state of a seed lot, as the API works it out from the quantities. Chưa dùng → Đang ươm → Đang treo dở → Đã treo hết; the other finals end it too. */
export const seedLotStateLabel: Record<SeedLotState, string> = {
  Unused: "Chưa dùng", Nursing: "Đang ươm", PartlySeeded: "Đang treo dở", FullySeeded: "Đã treo hết", FullyReturned: "Đã trả hết", FullyLost: "Hao hụt hết", UsedUp: "Đã dùng hết",
};
export const isFinalSeedLotState = (state: SeedLotState) => finalSeedLotStates.includes(state);
/** A lot seeded out is the good ending (green), a lot lost is the bad one (red); every other state is plain. */
const tone = (state: SeedLotState) => state === "FullySeeded" ? "success" as const : state === "FullyLost" ? "danger" as const : "neutral" as const;

export function SeedLotStateBadge({ state }: { state: SeedLotState }) {
  return <StatusPill tone={tone(state)}>{seedLotStateLabel[state]}</StatusPill>;
}

/** A state shown on a line of a receipt, linked to the Lô giống screen on the code of that lot. */
export function SeedLotStateLink({ code, state, className }: { code: string; state: SeedLotState; className?: string }) {
  return <Link className={className} href={seedLotsHref(code)} title={`Mở lô giống ${code}`}>{seedLotStateLabel[state]}</Link>;
}

/**
 * The state of a whole seed receipt from the states of its lots: one state when they agree; the lots all final but different is Đã dùng hết;
 * otherwise the one that tells most about what is still going on (a lot in the nursery, then a lot half seeded, then a lot not used yet).
 */
export function combinedSeedLotState(states: readonly SeedLotState[]): SeedLotState | undefined {
  if (!states.length) return undefined;
  if (states.every((state) => state === states[0])) return states[0];
  if (states.every(isFinalSeedLotState)) return "UsedUp";
  if (states.includes("Nursing")) return "Nursing";
  if (states.includes("PartlySeeded") || states.some(isFinalSeedLotState)) return "PartlySeeded";
  return "Unused";
}
