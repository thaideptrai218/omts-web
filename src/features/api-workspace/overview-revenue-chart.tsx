"use client";
import { useMemo, useState } from "react";
import { BarChart } from "@/components/ui/charts/bar-chart";
import { formatMoneyShort } from "@/components/ui/charts/format-money-short";
import type { SalesReport } from "@/features/sales-reports/contracts";
import { vnd } from "@/features/sales-reports/report-format";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { OverviewCard, type RemoteView } from "./overview-card";
import styles from "./owner-overview.module.css";

const TABS = [["day", "Theo ngày"], ["zone", "Theo vùng"]] as const;
type Tab = typeof TABS[number][0];

const addDay = (date: string) => { const next = new Date(`${date}T00:00:00Z`); next.setUTCDate(next.getUTCDate() + 1); return next.toISOString().slice(0, 10); };

/** Mỗi ngày từ đầu tháng đến hôm nay một cột (ngày không có hóa đơn là 0) để biểu đồ không bị đứt quãng. */
function dayPoints(report: SalesReport, from: string, to: string) {
  const byDay = new Map(report.groups.map((group) => [group.key, group.netRevenue]));
  const points: { label: string; values: number[] }[] = [];
  for (let day = from; day <= to; day = addDay(day)) points.push({ label: formatVietnameseDate(day).slice(0, 5), values: [byDay.get(day) ?? 0] });
  return points;
}

type Props = Readonly<{ byDay: RemoteView<SalesReport>; byZone: RemoteView<SalesReport>; from: string; to: string }>;

/** Biểu đồ doanh thu thuần của tháng này, chuyển giữa theo ngày và theo vùng (từ báo cáo Bán hàng). */
export function OverviewRevenueChart({ byDay, byZone, from, to }: Props) {
  const [tab, setTab] = useState<Tab>("day");
  const remote = tab === "day" ? byDay : byZone;
  const points = useMemo(() => {
    const report = remote.data;
    if (!report) return [];
    return tab === "day" ? dayPoints(report, from, to) : [...report.groups].sort((a, b) => b.netRevenue - a.netRevenue).map((group) => ({ label: group.label, values: [group.netRevenue] }));
  }, [remote.data, tab, from, to]);
  const hasRevenue = points.some((point) => point.values[0] !== 0);
  return (
    <OverviewCard title={`Doanh thu thuần tháng ${to.slice(5, 7)}/${to.slice(0, 4)}`} remote={remote}
      actions={<div className={styles.tabs} role="group" aria-label="Xem biểu đồ theo">{TABS.map(([key, text]) => <button key={key} type="button" className={styles.tab} aria-pressed={tab === key} onClick={() => setTab(key)}>{text}</button>)}</div>}>
      {() => hasRevenue
        ? <BarChart points={points} series={[{ name: "Doanh thu thuần" }]} valueFormat={vnd} axisFormat={formatMoneyShort} ariaLabel={`Doanh thu thuần ${tab === "day" ? "theo ngày" : "theo vùng nuôi"} trong tháng này`} />
        : <p className={styles.empty}>Tháng này chưa có doanh thu để vẽ biểu đồ.</p>}
    </OverviewCard>
  );
}
