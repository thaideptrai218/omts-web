"use client";
import Link from "next/link";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import { operationAllowed } from "@/features/operations/permissions";
import { violationSentence, violationsFromOutside } from "@/features/operations/water-violation-text";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { ReportCard } from "@/features/sales-reports/report-parts";
import type { ZoneOverviewItem } from "./contracts";
import { useWaterZoneOverview } from "./use-water-zone-overview";
import { absoluteTimeText, isMeasurementStale, relativeTimeText, summaryLine } from "./water-overview-logic";
import s from "./dashboard-water-overview.module.css";

/** "Chất lượng nước" on the Tổng quan: the In Use zones the account may see (alerts first), each opening the water screen of that zone. Nothing shows without the water permission. */
export function DashboardWaterOverview() {
  const { identity, permissions } = useApiWorkspace();
  if (!operationAllowed("water", identity, permissions.functionPermissions)) return null;
  return <WaterOverviewCard />;
}

function WaterOverviewCard() {
  const { items, error, loading, now, reload, summary } = useWaterZoneOverview();
  return <ReportCard title="Chất lượng nước">
    {error && !items ? <ListStateMessage error={error} onRetry={reload} retryLabel="Tải lại" />
      : !items ? <div className={s.skeleton} role="status" aria-label="Đang tải chất lượng nước" />
      : !items.length ? <p className={s.empty}>Chưa có vùng nào bạn được phép xem chất lượng nước.</p>
      : <>
        <p className={`${s.summary} ${summary?.alerting ? s.summaryAlert : ""}`} aria-busy={loading}>{summary && summaryLine(summary)}</p>
        <ul className={s.list}>{items.map(item => <ZoneRow key={item.zoneId} item={item} now={now} />)}</ul>
      </>}
  </ReportCard>;
}

function ZoneRow({ item, now }: { item: ZoneOverviewItem; now: number }) {
  const stale = isMeasurementStale(item.latestMeasuredAt, now), violation = violationSentence(violationsFromOutside(item.valuesOutside));
  return <li>
    <Link className={`${s.row} ${item.hasWaterAlert ? s.alert : ""}`} href={farmingReferenceHref("water", { zoneId: item.zoneId })} aria-label={`Xem chất lượng nước vùng ${item.zoneCode} ${item.zoneName}`}>
      <span className={s.name}><strong>{item.zoneCode}</strong> · {item.zoneName}</span>
      <span className={stale ? s.stale : s.time}>
        {item.latestMeasuredAt ? `${relativeTimeText(item.latestMeasuredAt, now)} · ${absoluteTimeText(item.latestMeasuredAt)}` : "Chưa có lần đo"}
      </span>
      {violation && <span className={s.violation}>{violation}</span>}
    </Link>
  </li>;
}
