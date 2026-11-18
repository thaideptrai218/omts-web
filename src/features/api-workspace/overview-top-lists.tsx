"use client";
import Link from "next/link";
import { useState } from "react";
import type { SalesGroup, SalesReport } from "@/features/sales-reports/contracts";
import { kg, vnd } from "@/features/sales-reports/report-format";
import { OverviewCard, type RemoteView } from "./overview-card";
import styles from "./owner-overview.module.css";

const TOP_N = 10;
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Item = Readonly<{ key: string; label: string; value: number }>;

/** Chỉ lấy nhóm là sản phẩm/khách hàng thật (bỏ các dòng điều chỉnh như chiết khấu, phụ phí do backend thêm), sắp giảm dần và lấy 10 đầu. */
function top(report: SalesReport, pick: (group: SalesGroup) => number): Item[] {
  return report.groups.filter((group) => GUID.test(group.key)).map((group) => ({ key: group.key, label: group.label, value: pick(group) }))
    .filter((item) => item.value > 0).sort((a, b) => b.value - a.value).slice(0, TOP_N);
}

function Ranking({ items, format }: Readonly<{ items: readonly Item[]; format(value: number): string }>) {
  if (!items.length) return <p className={styles.empty}>Tháng này chưa có số liệu.</p>;
  const max = items[0].value;
  return (
    <ol className={styles.ranking}>
      {items.map((item, index) => (
        <li key={item.key}>
          <span className={styles.rank}>{index + 1}</span><span className={styles.rankName} title={item.label}>{item.label}</span><span className={styles.rankValue}>{format(item.value)}</span>
          <span className={styles.bar} aria-hidden="true"><span style={{ width: `${Math.max(2, item.value / max * 100)}%` }} /></span>
        </li>
      ))}
    </ol>
  );
}

type Props = Readonly<{ byProduct: RemoteView<SalesReport>; byCustomer: RemoteView<SalesReport>; reportHref?: string; customerHref?: string }>;

/** Top 10 sản phẩm bán chạy (đổi giữa doanh thu và khối lượng) và top 10 khách mua nhiều theo doanh thu thuần, trong tháng này. */
export function OverviewTopLists({ byProduct, byCustomer, reportHref, customerHref }: Props) {
  const [byKg, setByKg] = useState(false);
  return (
    <>
      <OverviewCard title="Top 10 hàng bán chạy tháng này" remote={byProduct}
        actions={<div className={styles.tabs} role="group" aria-label="Xếp hạng theo">{([[false, "Doanh thu"], [true, "Khối lượng"]] as const).map(([kgMode, text]) => <button key={text} type="button" className={styles.tab} aria-pressed={byKg === kgMode} onClick={() => setByKg(kgMode)}>{text}</button>)}</div>}>
        {(report) => <>
          <Ranking items={top(report, (group) => byKg ? group.soldKg : group.netRevenue)} format={byKg ? kg : vnd} />
          {reportHref && <Link href={reportHref} className={styles.more}>Xem báo cáo bán hàng</Link>}
        </>}
      </OverviewCard>
      <OverviewCard title="Top 10 khách mua nhiều tháng này" remote={byCustomer}>
        {(report) => <>
          <Ranking items={top(report, (group) => group.netRevenue)} format={vnd} />
          {customerHref && <Link href={customerHref} className={styles.more}>Xem báo cáo khách hàng</Link>}
        </>}
      </OverviewCard>
    </>
  );
}
