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

/** Exact cage count as the lead number, estimated kg as the small secondary line. */
export function CagesWithEstimatedKg({ cages, kg }: { cages: number; kg: number }) {
  return (
    <>
      <span className="font-semibold tabular-nums">{cages.toLocaleString("vi-VN")} lồng</span>
      <span className="mt-1 block whitespace-nowrap text-xs font-normal text-text-muted tabular-nums">
        ≈ {kg.toLocaleString("vi-VN")} kg
      </span>
    </>
  );
}
