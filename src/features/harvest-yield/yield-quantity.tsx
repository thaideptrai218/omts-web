import { cagesFromKg, formatCages } from "@/shared/format/cage-quantity";
import { formatKg } from "./yield-logic";
import s from "./yield-screen.module.css";

/** "≈ 3,6 lồng" (negative differences keep their sign), or undefined without a usable kg/lồng ratio. */
export function approxCagesText(kg: number, kgPerCage?: number): string | undefined {
  const cages = cagesFromKg(Math.abs(kg), kgPerCage);
  if (cages === undefined) return undefined;
  const text = formatCages(cages, { approx: true });
  return kg < 0 ? text.replace("≈ ", "≈ −") : text;
}

/** Cage-first quantity: approximate cages lead, exact kg below. Without a ratio only exact kg is shown. */
export function YieldQuantity({ kg, kgPerCage }: { kg: number; kgPerCage?: number }) {
  const approx = approxCagesText(kg, kgPerCage);
  if (!approx) return <>{formatKg(kg)} kg</>;
  return (
    <>
      <span className={s.cageLead}>{approx}</span>
      <span className={s.cageSub}>{formatKg(kg)} kg</span>
    </>
  );
}
