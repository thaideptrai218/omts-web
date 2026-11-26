import { approxCagesLabel } from "@/shared/format/cage-quantity";

/** Exact kg with the approximate cage equivalent below it (lot's own kg/lồng ratio). */
export function KgWithApproxCages({ kg, kgPerCage }: { kg: number; kgPerCage?: number }) {
  const approx = approxCagesLabel(kg, kgPerCage);
  return (
    <>
      <span className="tabular-nums">{kg.toLocaleString("vi-VN")} kg</span>
      {approx && <span className="mt-1 block whitespace-nowrap text-xs font-normal text-text-muted tabular-nums">{approx}</span>}
    </>
  );
}

/** Exact cage count as the lead number; the kg are the port weighing ("Chờ cân" until it is done), the conversion estimate is never shown as kg. */
export function CagesWithWeighedKg({ cages, weighedKg }: { cages: number; weighedKg?: number | null }) {
  return (
    <>
      <span className="font-semibold tabular-nums">{cages.toLocaleString("vi-VN")} lồng</span>
      <span className="mt-1 block whitespace-nowrap text-xs font-normal text-text-muted tabular-nums">
        {weighedKg == null ? "Chờ cân" : `cân ${weighedKg.toLocaleString("vi-VN")} kg`}
      </span>
    </>
  );
}
