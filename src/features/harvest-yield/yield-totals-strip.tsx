import { formatVietnameseDate } from "@/shared/format/date-only";
import type { HarvestYieldReport } from "./contracts";
import { groupingLabel } from "./contracts";
import { formatKg } from "./yield-logic";
import s from "./yield-screen.module.css";

/** Dải tổng của báo cáo (HarvestYieldTotals) kèm kỳ đã áp dụng và thông báo "chưa chốt" của backend (MSG-HARVEST-04). */
export function YieldTotalsStrip({ report }: { report: HarvestYieldReport }) {
  const t = report.totals;
  const items = [["Số lô", String(t.lotCount)], ["kg ước tính", formatKg(t.estimatedKg)], ["kg đã bán", formatKg(t.soldKg)], ["kg hao hụt", formatKg(t.lostKg)], ["Chênh lệch (kg)", formatKg(t.differenceKg)]];
  return (
    <div>
      <p className={s.period}>{formatVietnameseDate(report.from)} – {formatVietnameseDate(report.to)} · gộp theo {groupingLabel[report.groupBy].toLocaleLowerCase("vi")}</p>
      <dl className={s.totals} aria-label="Tổng của báo cáo">
        {items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
      {report.notFinalNotice && <p className={s.notice} role="note">{report.notFinalNotice}</p>}
      <p className={s.muted}>Chênh lệch = kg ước tính − kg đã bán − kg hao hụt; số âm là đã bán nhiều hơn ước tính. Bấm tên nhóm để xem các lô.</p>
    </div>
  );
}
