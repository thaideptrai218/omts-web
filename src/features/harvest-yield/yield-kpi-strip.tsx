import { formatKg } from "./yield-logic";
import { deltaPercent, type Kpis } from "./yield-summary-model";
import s from "./yield-screen.module.css";

const kg = (value: number | null) => value == null ? "—" : `${formatKg(Math.round(value * 10) / 10)} kg`;
const cages = (value: number | null) => value == null ? "—" : `${formatKg(value)} lồng`;

/** ▲/▼ kèm phần trăm so với kỳ liền trước; chữ cho trình đọc màn hình, màu không phải dấu hiệu duy nhất. */
function Delta({ now, before }: { now: number | null; before: number | null | undefined }) {
  if (before === undefined) return null;
  const change = deltaPercent(now, before);
  if (change == null) return <small className={s.kpiDelta}>Kỳ trước chưa có số liệu</small>;
  const rounded = Math.round(change);
  if (rounded === 0) return <small className={s.kpiDelta}>= so với kỳ trước</small>;
  return <small className={rounded > 0 ? s.deltaUp : s.deltaDown}>{rounded > 0 ? "▲" : "▼"} {Math.abs(rounded)}% <span className={s.srOnly}>{rounded > 0 ? "tăng" : "giảm"}</span>so với kỳ trước</small>;
}

type Props = { kpis: Kpis; previous?: Kpis | null };

/** Dải chỉ số chính của báo cáo (đã lọc). `previous` là kỳ liền trước cùng độ dài; null/undefined thì không hiện so sánh. */
export function YieldKpiStrip({ kpis, previous }: Props) {
  const p = previous ?? undefined;
  const cards: { label: string; value: string; delta?: ReturnType<typeof Delta>; hint?: string }[] = [
    { label: "Số lô", value: String(kpis.lots), delta: <Delta now={kpis.lots} before={p?.lots} /> },
    { label: "Số lồng", value: cages(kpis.cages), delta: <Delta now={kpis.cages} before={p ? p.cages : undefined} /> },
    { label: "Kg ước tính", value: kg(kpis.kg), delta: <Delta now={kpis.kg} before={p?.kg} />, hint: "Ước tính từ số lồng" },
    { label: "Đã bán", value: kg(kpis.soldKg), delta: <Delta now={kpis.soldKg} before={p?.soldKg} /> },
    { label: "Còn để bán", value: kg(kpis.remainingKg) },
    { label: "Kg ước tính mỗi lồng", value: kpis.kgPerCage == null ? "—" : `${formatKg(Math.round(kpis.kgPerCage * 10) / 10)} kg/lồng`, hint: "Trung bình theo số lồng đã thu" },
    { label: "Số bè đã thu hoạch", value: `${kpis.rafts} bè` },
    { label: "So với mục tiêu", value: kpis.targetPct == null ? "—" : `${kpis.targetPct}%`, hint: kpis.targetCycles ? `${kpis.targetCycles} chu kỳ có mục tiêu` : "Chưa đặt mục tiêu" },
  ];
  return (
    <dl className={s.kpis} aria-label="Chỉ số chính của báo cáo">
      {cards.map((card) => <div key={card.label}><dt>{card.label}</dt><dd>{card.value}</dd>{card.delta}{card.hint && <small className={s.kpiDelta}>{card.hint}</small>}</div>)}
    </dl>
  );
}
