import { formatCageAndKgLine, formatCages } from "@/shared/format/cage-quantity";
import type { LotForSale } from "./contracts";

/**
 * "còn ≈ 3,6 lồng · 180 kg": harvest is cage-first, but the invoice sells by kg, so the remaining
 * quantity is a kg figure with an approximate cage equivalent. The lot's own kg/lồng wins over the
 * cooperative average; without any ratio only kg is shown. When the API sends the lot's total
 * cage count it is appended as an exact number.
 */
export function lotRemainingText(lot: LotForSale, averageKgPerCage?: number): string {
  const line = formatCageAndKgLine({ kg: lot.remainingKg, kgPerCage: lot.kgPerCage ?? averageKgPerCage });
  const total = typeof lot.cageCount === "number" ? ` (lô ${formatCages(lot.cageCount)})` : "";
  return `còn ${line}${total}`;
}
