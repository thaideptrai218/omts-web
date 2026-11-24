import { formatCages, formatKg, isUsableKgPerCage } from "./cage-quantity";

/**
 * Purchase-request quantities: the API stores and validates whole cages (int > 0). Kg is only an
 * estimate (cages x the cooperative's kg per cage), so it is always labelled "(ước tính)".
 * Users may type either unit; kg is converted to whole cages for the payload.
 */
export type QuantityUnit = "cages" | "kg";
/** What a quantity input holds: the unit chosen and the text typed. */
export type CageQuantityValue = { unit: QuantityUnit; text: string };

/** Backend PurchaseRequestRules.IsCages: an int32 above zero. */
export const MAX_CAGES = 2_147_483_647;

/** kg -> whole cages (nearest, at least 1); undefined when the ratio or kg is unusable. */
export function kgToWholeCages(kg: number, kgPerCage: number | null | undefined): number | undefined {
  if (!Number.isFinite(kg) || kg <= 0 || !isUsableKgPerCage(kgPerCage)) return undefined;
  const cages = Math.max(1, Math.round(kg / kgPerCage));
  return cages <= MAX_CAGES ? cages : undefined;
}

/** "≈ 600 kg (ước tính)", or undefined when no ratio is known. */
export function estimatedKgLabel(cages: number, kgPerCage: number | null | undefined): string | undefined {
  return isUsableKgPerCage(kgPerCage) ? `≈ ${formatKg(cages * kgPerCage)} (ước tính)` : undefined;
}

/** "12 lồng · ≈ 600 kg (ước tính)"; "12 lồng" alone when kg per cage is unknown. */
export function cagesWithEstimate(cages: number, kgPerCage: number | null | undefined): string {
  const estimate = estimatedKgLabel(cages, kgPerCage);
  return estimate ? `${formatCages(cages)} · ${estimate}` : formatCages(cages);
}

export type QuantityInputResult = { cages?: number; preview?: string; error?: string };

/**
 * Reads what the user typed. Cages: digits only. Kg: up to 3 decimals, "," or "." as the mark.
 * `preview` shows the live conversion: "= 12 lồng (≈ 600 kg, ước tính)" for kg input,
 * "≈ 600 kg (ước tính)" for cage input. Empty text gives neither cages nor an error.
 */
export function resolveQuantityInput(unit: QuantityUnit, text: string, kgPerCage: number | null | undefined): QuantityInputResult {
  const normalized = text.trim().replace(/\s/g, "").replace(",", ".");
  if (!normalized) return {};
  if (unit === "cages") {
    if (!/^\d{1,10}$/.test(normalized) || Number(normalized) < 1 || Number(normalized) > MAX_CAGES) return { error: "Nhập số lồng nguyên lớn hơn 0." };
    const cages = Number(normalized);
    return { cages, preview: estimatedKgLabel(cages, kgPerCage) };
  }
  if (!isUsableKgPerCage(kgPerCage)) return { error: "Chưa biết khối lượng trung bình mỗi lồng nên chưa quy đổi được kg. Hãy nhập số lồng." };
  if (!/^\d{1,15}(\.\d{1,3})?$/.test(normalized) || Number(normalized) <= 0) return { error: "Nhập số kg lớn hơn 0, tối đa 3 chữ số thập phân." };
  const cages = kgToWholeCages(Number(normalized), kgPerCage);
  if (cages === undefined) return { error: "Số kg quá lớn để quy đổi ra số lồng." };
  return { cages, preview: `= ${formatCages(cages)} (${estimatedKgLabel(cages, kgPerCage)?.replace(" (ước tính)", "")}, ước tính)` };
}
