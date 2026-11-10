/**
 * Harvest quantities are cage-first ("lồng" is the business unit); kg is an estimate derived
 * from a kg-per-cage ratio. Anything computed from kg is approximate and is prefixed with "≈".
 */

const integerFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });
const approxFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });
const kgFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 });

/** Ratio usable for conversion: a finite number greater than zero. */
export function isUsableKgPerCage(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/** kg -> cages, or undefined when the ratio or the quantity is unusable. Never throws. */
export function cagesFromKg(kg: number | null | undefined, kgPerCage: number | null | undefined): number | undefined {
  if (typeof kg !== "number" || !Number.isFinite(kg) || kg < 0 || !isUsableKgPerCage(kgPerCage)) return undefined;
  return kg / kgPerCage;
}

/** "12 lồng" for exact counts, "≈ 3,6 lồng" (max 1 decimal) for derived numbers. */
export function formatCages(cages: number, options: { approx?: boolean } = {}): string {
  return options.approx ? `≈ ${approxFormat.format(cages)} lồng` : `${integerFormat.format(cages)} lồng`;
}

export function formatKg(kg: number): string {
  return `${kgFormat.format(kg)} kg`;
}

/** Approximate cage label converted from kg, or undefined when no ratio is available. */
export function approxCagesLabel(kg: number | null | undefined, kgPerCage: number | null | undefined): string | undefined {
  const cages = cagesFromKg(kg, kgPerCage);
  return cages === undefined ? undefined : formatCages(cages, { approx: true });
}

export type CageAndKg = { primary: string; secondary?: string };

/**
 * Primary/secondary text for a quantity.
 * - exact cages known: primary "12 lồng", secondary "≈ 600 kg" when kg is an estimate from kgPerCage (or exact kg otherwise).
 * - only kg known: primary "≈ 3,6 lồng" when a ratio exists, with the exact kg as secondary; else kg alone.
 */
export function formatCageAndKg(input: { cages?: number | null; kg?: number | null; kgPerCage?: number | null }): CageAndKg {
  const { cages, kg, kgPerCage } = input;
  const hasKg = typeof kg === "number" && Number.isFinite(kg);
  if (typeof cages === "number" && Number.isFinite(cages)) {
    if (hasKg) return { primary: formatCages(cages), secondary: `≈ ${formatKg(kg)}` };
    const derived = isUsableKgPerCage(kgPerCage) ? cages * kgPerCage : undefined;
    return { primary: formatCages(cages), secondary: derived === undefined ? undefined : `≈ ${formatKg(derived)}` };
  }
  if (!hasKg) return { primary: "—" };
  const approx = approxCagesLabel(kg, kgPerCage);
  return approx ? { primary: approx, secondary: formatKg(kg) } : { primary: formatKg(kg) };
}

/** Single-line "≈ 3,6 lồng · 180 kg" (kg alone when no ratio). */
export function formatCageAndKgLine(input: { cages?: number | null; kg?: number | null; kgPerCage?: number | null }): string {
  const { primary, secondary } = formatCageAndKg(input);
  return secondary ? `${primary} · ${secondary}` : primary;
}
