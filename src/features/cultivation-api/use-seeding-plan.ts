import { useMemo } from "react";
import { readCycleSummary } from "@/features/cycles-api/repository";
import { useRemote } from "@/features/operations/ui";

/** Tiers against the cycle plan (same as the backend): up to 110% is normal, over 110% needs a reason, over 150% is refused. */
export const SOFT_LIMIT = 110, HARD_LIMIT = 150;

/**
 * Seed hung against the planned seed quantity if this session is saved.
 * `others` = seed of the other sessions (a correction leaves its own quantity out); undefined planned = the cycle has no plan, nothing is judged.
 */
export function seedingPlanOf(seedHung: number | undefined, planned: number | null | undefined, quantityText: string, ownQuantity = 0) {
  const quantity = Number(quantityText.replace(",", ".")) || 0;
  const total = Math.max(0, (seedHung ?? 0) - ownQuantity) + quantity;
  const percent = typeof planned === "number" && planned > 0 ? Math.round((total / planned) * 1000) / 10 : undefined;
  return { planned: percent === undefined ? null : (planned as number), total, percent, hard: percent !== undefined && percent > HARD_LIMIT, soft: percent !== undefined && percent > SOFT_LIMIT && percent <= HARD_LIMIT };
}

/** Loads the cycle's plan and seed already hung (a failed read just means no plan is shown; the backend still decides). */
export function useSeedingPlan(cycleId: string, quantityText: string, ownQuantity = 0) {
  const summary = useRemote(useMemo(() => (signal: AbortSignal) => readCycleSummary(cycleId, signal), [cycleId]));
  return { ...seedingPlanOf(summary.data?.seedHung, summary.data?.expectedSeedQuantity, quantityText, ownQuantity), seedUnit: summary.data?.seedUnit ?? undefined };
}
