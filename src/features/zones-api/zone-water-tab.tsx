"use client";
import Link from "next/link";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import { useCallback, type ReactNode } from "react";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { StatusPill } from "@/components/ui/management-page";
import { TabFooter } from "@/features/farming-management/detail-parts";
import { displayTime, Skeleton, useRemote } from "@/features/operations/ui";
import styles from "@/features/farming-management/farming-management.module.css";
import kpi from "./zone-kpi.module.css";
import { indicatorLabel, rangeText } from "./zone-summary-model";
import { readZoneWater } from "./zone-summary-reads";

const Lines = ({ items }: { items: readonly (readonly [string, ReactNode])[] }) =>
  <dl className={kpi.lines}>{items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ?? "—"}</dd></div>)}</dl>;

/** "Quan trắc nước": left column = newest measurement and thresholds in force; right = the five newest measurements. Full history lives on the water screen. */
export function ZoneWaterTab({ zoneId }: { zoneId: string }) {
  const remote = useRemote(useCallback((signal: AbortSignal) => readZoneWater(zoneId, signal), [zoneId]));
  if (remote.loading) return <Skeleton />;
  if (remote.error || !remote.data) return <ListStateMessage error={remote.error ?? "Không tải được dữ liệu chất lượng nước."} onRetry={remote.reload} retryLabel="Tải lại" />;
  const { thresholds, latest } = remote.data;
  // A voided measurement is excluded from the data in use, so "latest" is the newest ACTIVE row.
  const last = latest.find(row => row.statusCode !== "VOIDED" && row.alertState !== "Voided");
  const outside = last?.valuesOutside.map(item => indicatorLabel(item.indicator)).join(", ");
  return <>
    <div className={kpi.twoCol}>
      <div>
        <h4>Lần đo gần nhất</h4>
        {last ? <Lines items={[["Thời điểm", <Link key="measurement" className={styles.link} href={farmingReferenceHref("water", { zoneId, recordId: last.id })}>{displayTime(last.measuredAt)}</Link>], ["Bè", last.raftId ? <Link key="raft" className={styles.link} href={farmingReferenceHref("raft", { zoneId, recordId: last.raftId, search: last.raftCode })}>{last.raftCode}</Link> : last.raftCode], ["pH", last.ph], ["Độ mặn (‰)", last.salinity], ["Nhiệt độ (°C)", last.temperature],
          ["Cảnh báo", outside ? <span className={kpi.danger}>Vượt ngưỡng: {outside}</span> : "Không"]]} /> : <p className={styles.hint}>Chưa có phép đo nước.</p>}
        <h4>Ngưỡng đang áp dụng</h4>
        <Lines items={[["pH", rangeText(thresholds.phMin, thresholds.phMax)], ["Độ mặn (‰)", rangeText(thresholds.salinityMin, thresholds.salinityMax)], ["Nhiệt độ (°C)", rangeText(thresholds.temperatureMin, thresholds.temperatureMax)]]} />
      </div>
      <div>
        <h4>5 lần đo gần nhất</h4>
        {latest.length === 0 ? <p className={styles.hint}>Vùng chưa có phép đo nước.</p>
          : <table className={styles.subTable}><thead><tr><th scope="col">Thời điểm</th><th scope="col">Bè</th><th scope="col">pH</th><th scope="col">Độ mặn</th><th scope="col">Nhiệt độ</th><th scope="col">Cảnh báo</th></tr></thead>
            <tbody>{latest.map(row => <tr key={row.id}><td><Link className={styles.link} href={farmingReferenceHref("water", { zoneId, recordId: row.id })}>{displayTime(row.measuredAt)}</Link></td><td>{row.raftId ? <Link className={styles.link} href={farmingReferenceHref("raft", { zoneId, recordId: row.raftId, search: row.raftCode })}>{row.raftCode}</Link> : row.raftCode}</td><td>{row.ph}</td><td>{row.salinity}</td><td>{row.temperature}</td>
              <td>{row.alertState === "Voided" ? <StatusPill tone="neutral">Đã hủy</StatusPill> : row.valuesOutside.length ? <StatusPill tone="danger">{row.valuesOutside.map(item => indicatorLabel(item.indicator)).join(", ")}</StatusPill> : "Không"}</td></tr>)}</tbody></table>}
      </div>
    </div>
    <TabFooter right={<Link className={styles.footerLink} href={farmingReferenceHref("water", { zoneId })}>Mở theo dõi chất lượng nước</Link>} />
  </>;
}
