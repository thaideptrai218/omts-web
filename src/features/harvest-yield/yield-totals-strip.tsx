import { formatVietnameseDate } from "@/shared/format/date-only";
import type { HarvestYieldReport } from "./contracts";
import { groupingLabel } from "./contracts";
import { cagesOrDash, kgOrDash } from "./yield-target-cell";
import s from "./yield-screen.module.css";

/** Dải tổng của báo cáo kèm kỳ đã áp dụng: số lô, số lồng, kg ước tính (không dùng để tính tiền) và kg đã bán. */
export function YieldTotalsStrip({ report }: { report: HarvestYieldReport }) {
  const t = report.totals;
  const quantities = [["Số lồng", cagesOrDash(t.harvestedCages)], ["Kg ước tính", kgOrDash(t.estimatedKg)], ["Đã bán", kgOrDash(t.soldKg)]] as const;
  return (
    <div>
      <p className={s.period}>{report.from === "0001-01-01" ? "Toàn thời gian" : `${formatVietnameseDate(report.from)} – ${formatVietnameseDate(report.to)}`} · gộp theo {groupingLabel[report.groupBy].toLocaleLowerCase("vi")}</p>
      <dl className={s.totals} aria-label="Tổng của báo cáo">
        <div><dt>Số lô</dt><dd>{t.lotCount}</dd></div>
        {quantities.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
    </div>
  );
}
