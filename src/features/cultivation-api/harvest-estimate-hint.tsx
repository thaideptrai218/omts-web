"use client";

const kg = (value: number) => value.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
const cagesText = (value: number) => value.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Live estimate of a trip: kg is NEVER weighed here, it is cages x kg per cage (the cooperative harvest setting) unless the user types
 * an estimate. `far` mirrors the backend notice for an estimate outside 0.2x..2x of that figure (saved with a warning, not refused).
 */
export function harvestEstimate(cages: number, typedKg: string, kgPerCage: number) {
  const computed = Number.isFinite(cages) && cages > 0 && kgPerCage > 0 ? round2(cages * kgPerCage) : 0;
  const typed = typedKg.trim() === "" ? undefined : Number(typedKg);
  const effective = typed !== undefined && Number.isFinite(typed) && typed > 0 ? typed : computed;
  const far = typed !== undefined && computed > 0 && Number.isFinite(typed) && typed > 0 && (typed < computed * 0.2 || typed > computed * 2);
  return { computed, effective, far, typed: typed !== undefined };
}

/** Shows the estimate, where the kg/lồng comes from, and the non-blocking "far from cages" notice. */
export function HarvestEstimateHint({ cages, typedKg, kgPerCage }: { cages: number; typedKg: string; kgPerCage: number }) {
  const { computed, far, typed } = harvestEstimate(cages, typedKg, kgPerCage);
  if (!(computed > 0)) return <p className="text-xs text-text-muted">Kg chỉ là ước tính: số lồng × {kg(kgPerCage)} kg/lồng (thiết lập thu hoạch của hợp tác xã).</p>;
  return <div className="grid gap-1 text-xs text-text-muted" aria-live="polite">
    <p>{typed ? `Kg ước tính nhập tay. Theo thiết lập, ${cagesText(cages)} lồng ≈ ${kg(computed)} kg ước tính.` : `${cagesText(cages)} lồng ≈ ${kg(computed)} kg ước tính.`}{" "}
      Nguồn: {cagesText(cages)} lồng × {kg(kgPerCage)} kg/lồng (thiết lập thu hoạch của hợp tác xã, lưu cùng lô).</p>
    {far && <p role="status" className="text-warning">Kg ước tính lệch nhiều so với {kg(computed)} kg. Vẫn lưu được, kèm cảnh báo để kiểm tra.</p>}
  </div>;
}
