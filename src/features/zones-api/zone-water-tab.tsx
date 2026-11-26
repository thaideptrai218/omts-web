"use client";
import Link from "next/link";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { ListStateMessage, ManagementPagination, managementStyles } from "@/components/ui/management-screen/management-table";
import { StatusPill } from "@/components/ui/management-page";
import { TabFooter } from "@/features/farming-management/detail-parts";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import { waterHistorySchema, zoneThresholdsSchema } from "@/features/operations/contracts";
import { createOperationsRepository } from "@/features/operations/repository";
import { DataTable, Skeleton, useRemote } from "@/features/operations/ui";
import { NewMeasurement } from "@/features/operations/water-new-measurement-dialog";
import { formatVietnameseDateTime } from "@/shared/format/date-time";
import { indicatorLabel } from "./zone-summary-model";
import { FooterLink } from "./zone-tab-parts";
import { outsideIndicators, thresholdsLine } from "./zone-water-model";
import local from "./zone-tabs.module.css";

const water = createOperationsRepository("water");

/**
 * "Quan trắc nước": thresholds in force on one line, then the measurements of the zone newest first, paged by the server.
 * Values outside their thresholds are highlighted. "Đo nhanh" records a measurement for this zone and reloads the list.
 */
export function ZoneWaterTab({ zoneId, zoneName, canCreate }: { zoneId: string; zoneName: string; canCreate: boolean }) {
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(10), [adding, setAdding] = useState(false);
  const limits = useRemote(useCallback((signal: AbortSignal) => water.read("thresholds", { zoneId }, zoneThresholdsSchema, signal), [zoneId]));
  const remote = useRemote(useCallback((signal: AbortSignal) => water.read("list", { zoneId, page: String(page), pageSize: String(pageSize) }, waterHistorySchema, signal), [zoneId, page, pageSize]));
  const saved = () => { setAdding(false); setPage(1); remote.reload(); };
  return <div className={local.tabBody}>
    {limits.data ? <p className={local.thresholds}><strong>Ngưỡng đang áp dụng:</strong> {thresholdsLine(limits.data.thresholds)}</p>
      : limits.error ? <p className={local.thresholds}>Không tải được ngưỡng đang áp dụng. <button type="button" className={managementStyles.linkButton} onClick={limits.reload}>Tải lại</button></p> : null}
    {remote.loading ? <Skeleton /> : remote.error || !remote.data ? <ListStateMessage error={remote.error ?? "Không tải được dữ liệu chất lượng nước."} onRetry={remote.reload} retryLabel="Tải lại" />
      : <>
        <DataTable responsive headings={["Thời điểm", "Bè", "pH", "Độ mặn (‰)", "Nhiệt độ (°C)", "Cảnh báo"]} empty={!remote.data.items.length}>{remote.data.items.map(row => {
          const voided = row.alertState === "Voided", outside = voided ? { ph: false, salinity: false, temperature: false } : outsideIndicators(row.valuesOutside);
          return <tr key={row.id}>
            <td data-label="Thời điểm" className={local.nowrap}>{formatVietnameseDateTime(row.measuredAt)}</td>
            <td data-label="Bè" className={local.nowrap}><Link className={managementStyles.linkButton} href={farmingReferenceHref("raft", { zoneId, search: row.raftCode })}>{row.raftCode}</Link></td>
            <td data-label="pH" className={`${local.number} ${outside.ph ? local.outside : ""}`}>{row.ph}</td>
            <td data-label="Độ mặn (‰)" className={`${local.number} ${outside.salinity ? local.outside : ""}`}>{row.salinity}</td>
            <td data-label="Nhiệt độ (°C)" className={`${local.number} ${outside.temperature ? local.outside : ""}`}>{row.temperature}</td>
            <td data-label="Cảnh báo">{voided ? <StatusPill tone="neutral">Đã hủy</StatusPill> : row.valuesOutside.length ? <StatusPill tone="danger">{row.valuesOutside.map(item => indicatorLabel(item.indicator)).join(", ")}</StatusPill> : "Không"}</td>
          </tr>;
        })}</DataTable>
        <ManagementPagination page={remote.data.page} pageSize={remote.data.pageSize} total={remote.data.total} unit="phép đo" onPage={setPage} onPageSize={size => { setPageSize(size); setPage(1); }} /></>}
    <TabFooter left={<FooterLink href={farmingReferenceHref("water", { zoneId })} icon="water">Mở theo dõi chất lượng nước</FooterLink>}
      right={canCreate ? <Button key="quick" type="button" className="w-auto" onClick={() => setAdding(true)}><InterfaceIcon name="add" className="size-4" />Đo nhanh</Button> : undefined} />
    {adding && <NewMeasurement zoneId={zoneId} zoneName={zoneName} onClose={() => setAdding(false)} onSaved={saved} />}
  </div>;
}
