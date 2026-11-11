import { formatVietnameseDate } from "@/shared/format/date-only";
import type { HarvestYieldReport } from "./contracts";
import { groupingLabel } from "./contracts";
import { formatKg } from "./yield-logic";
import { YieldQuantity } from "./yield-quantity";
import s from "./yield-screen.module.css";

/** Dải tổng của báo cáo (HarvestYieldTotals) kèm kỳ đã áp dụng và thông báo "chưa chốt" của backend (MSG-HARVEST-04). */
export function YieldTotalsStrip({ report, kgPerCage }: { report: HarvestYieldReport; kgPerCage?: number }) {
  const t = report.totals;
  const quantities = [["Ước tính", t.estimatedKg], ["Đã bán", t.soldKg], ["Hao hụt", t.lostKg], ["Chênh lệch", t.differenceKg]] as const;
  return (
    <div>
      <p className={s.period}>{formatVietnameseDate(report.from)} – {formatVietnameseDate(report.to)} · gộp theo {groupingLabel[report.groupBy].toLocaleLowerCase("vi")}</p>
      <dl className={s.totals} aria-label="Tổng của báo cáo">
        <div><dt>Số lô</dt><dd>{t.lotCount}</dd></div>
        {quantities.map(([label, kg]) => <div key={label}><dt>{label}</dt><dd><YieldQuantity kg={kg} kgPerCage={kgPerCage} /></dd></div>)}
      </dl>
      <p className={s.muted}>{kgPerCage ? `Thu hoạch tính theo lồng. Số lồng có dấu “≈” được quy đổi từ kg theo trung bình ${formatKg(kgPerCage)} kg/lồng của hợp tác xã; số kg là giá trị chính xác từ báo cáo.` : "Báo cáo hiện chỉ trả số kg; chưa có tỷ lệ kg/lồng để quy đổi ra lồng."}</p>
      {report.notFinalNotice && <p className={s.notice} role="note">Một số lô vẫn đang được bán nên số liệu có thể còn thay đổi.</p>}
      <p className={s.muted}>Chênh lệch = kg ước tính − kg đã bán − kg hao hụt; số âm là đã bán nhiều hơn ước tính. Bấm tên nhóm để xem các lô.</p>
    </div>
  );
}
