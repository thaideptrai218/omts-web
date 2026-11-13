import Link from "next/link";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import { formatKg } from "./yield-logic";
import type { insightsOf, Ranked } from "./yield-summary-model";
import s from "./yield-screen.module.css";

type Insights = ReturnType<typeof insightsOf>;
const rankLink = (row: Ranked) => row.raftId ? farmingReferenceHref("raft", { zoneId: row.zoneId, recordId: row.raftId }) : undefined;

function Ranking({ title, rows, unit, digits }: { title: string; rows: Ranked[]; unit: string; digits: number }) {
  return <section className={s.insight} aria-label={title}><h3>{title}</h3>
    {!rows.length ? <p className={s.muted}>Chưa có số liệu.</p>
      : <ol>{rows.map((row) => <li key={row.key}>{rankLink(row) ? <Link className="text-primary underline" href={rankLink(row)!}>{row.label}</Link> : row.label}<b>{formatKg(Number(row.value.toFixed(digits)))} {unit}</b></li>)}</ol>}
  </section>;
}

/** Thẻ gợi ý nhỏ, chỉ tính từ số liệu của báo cáo (và danh sách bè đang dùng); không có số liệu thì nói rõ là chưa có. */
export function YieldInsights({ insights, showNotHarvested }: { insights: Insights; showNotHarvested: boolean }) {
  const idle = insights.notHarvested;
  return (
    <div className={s.insights}>
      <Ranking title="Top 3 bè theo kg ước tính" rows={insights.topByKg} unit="kg" digits={1} />
      <Ranking title="Top 3 bè theo kg mỗi lồng" rows={insights.topByKgPerCage} unit="kg/lồng" digits={1} />
      {showNotHarvested && <section className={s.insight} aria-label="Bè chưa thu hoạch trong kỳ"><h3>Bè chưa thu trong kỳ</h3>
        {!idle ? <p className={s.muted}>Đang tải danh sách bè...</p> : !idle.length ? <p className={s.muted}>Mọi bè đang dùng đều đã thu.</p>
          : <p className={s.chips}>{idle.slice(0, 8).map((raft) => <Link key={raft.id} className={s.chip} href={farmingReferenceHref("raft", { recordId: raft.id, search: raft.code })}>{raft.code}</Link>)}{idle.length > 8 && <span className={s.muted}>+{idle.length - 8} bè</span>}</p>}
      </section>}
      <section className={s.insight} aria-label="Chu kỳ đã đóng"><h3>Chu kỳ đã đóng gần đây</h3>
        {!insights.closed.length ? <p className={s.muted}>Chưa có chu kỳ đóng trong kỳ.</p>
          : <ol>{insights.closed.map((cycle) => <li key={cycle.key}>
            <span>{cycle.cycleId ? <Link className="text-primary underline" href={farmingReferenceHref("cycle", { zoneId: cycle.zoneId, raftId: cycle.raftId, cycleId: cycle.cycleId })}>{cycle.label}</Link> : cycle.label}
              <small className={s.muted}> {cycle.days != null ? `· nuôi ${cycle.days} ngày` : ""}</small></span>
            <b>{formatKg(cycle.estimatedKg)} kg{cycle.targetPct != null && ` · ${cycle.targetPct}% mục tiêu`}</b></li>)}</ol>}
      </section>
    </div>
  );
}
