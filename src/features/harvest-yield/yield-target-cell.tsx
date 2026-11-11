import { formatKg, percentOfTarget } from "./yield-logic";
import s from "./yield-screen.module.css";

/** Kg thu hoạch (ước tính) so với kg mục tiêu của chu kỳ; không có mục tiêu thì nói rõ là chưa đặt. */
export function YieldTargetCell({ harvestedKg, targetKg }: { harvestedKg: number; targetKg?: number | null }) {
  const percent = percentOfTarget(harvestedKg, targetKg);
  if (percent === undefined || !targetKg) return <span className={s.muted}>Chưa đặt mục tiêu</span>;
  const width = Math.min(percent, 100);
  return (
    <div className={s.target}>
      <div className={s.targetBar} role="progressbar" aria-label="Phần trăm so với mục tiêu" aria-valuemin={0} aria-valuemax={100} aria-valuenow={width} aria-valuetext={`${percent}% mục tiêu`}>
        <span className={percent > 100 ? s.targetFillOver : s.targetFill} style={{ width: `${width}%` }} />
      </div>
      <span className={s.targetText}>{percent}% · mục tiêu {formatKg(targetKg)} kg</span>
    </div>
  );
}

/** Số có thể thiếu (null/undefined) thì hiện gạch ngang thay vì 0 giả. */
export const kgOrDash = (kg?: number | null) => (kg == null ? "—" : `${formatKg(kg)} kg`);
export const cagesOrDash = (cages?: number | null) => (cages == null ? "—" : `${formatKg(cages)} lồng`);
