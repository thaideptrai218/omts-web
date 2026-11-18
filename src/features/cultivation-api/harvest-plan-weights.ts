import { DEFAULT_KG_PER_CAGE } from "@/features/harvest-plans/plan-logic";

/** The read-only conversion shown beside "Số lồng thu được": kg = cages x the Lồng factor of the product (50 kg when it has none), tấn = kg / 1000. An estimate only; null without a count. */
export function harvestPlanWeights(cages: number | null, factor?: number | null) {
  if (cages == null || !Number.isFinite(cages) || cages <= 0) return null;
  const kgPerCage = factor && factor > 0 ? factor : DEFAULT_KG_PER_CAGE, kg = Math.round(cages * kgPerCage * 100) / 100;
  return { kgPerCage, kg, tons: Math.round(kg) / 1000 };
}
