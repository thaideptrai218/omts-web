import { foldVietnamese } from "@/shared/presentation/fold-text";
import { formatKg, isUsableKgPerCage } from "./cage-quantity";

/** "≈ 450 kg" for a number of cages, or undefined when the kg per cage is unknown or the count is unusable. */
export function approxKgText(cages: number | null | undefined, kgPerCage: number | null | undefined): string | undefined {
  if (typeof cages !== "number" || !Number.isFinite(cages) || cages <= 0 || !isUsableKgPerCage(kgPerCage)) return undefined;
  return `≈ ${formatKg(cages * kgPerCage)}`;
}

/** Whether a unit name is the cage unit ("Lồng", with or without accents, any case). */
export const isCageUnitName = (name: string) => foldVietnamese(name).trim().toLowerCase() === "long";

/** The kg per cage of a unit when that unit is the cage unit (its factor is kg per cage), else undefined. */
export const kgPerCageOfUnit = (unit: { name: string; factor: number } | undefined) => unit && unit.factor !== 1 && isCageUnitName(unit.name) ? unit.factor : undefined;
