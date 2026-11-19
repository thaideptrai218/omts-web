"use client";
import { Suspense, useMemo, useState } from "react";
import { FilterGroup } from "@/components/ui/management-screen/management-layout";
import { boundedRange } from "@/components/ui/management-screen/time-range-limits";
import { fromQueryDate } from "@/components/ui/management-screen/time-range-model";
import { SelectBox } from "@/components/ui/select-box";
import { ListSkeleton } from "@/features/farming-management/detail-parts";
import { businessToday } from "@/features/operations/ui";
import { vnd } from "@/features/sales-reports/report-format";
import { ReportFilterRail, useReportZones } from "@/features/sales-reports/report-filter-rail";
import { ReportPage } from "@/features/sales-reports/report-page";
import { ReportTable, ReportTiles, RowLinkButton, type ReportColumn } from "@/features/sales-reports/report-parts";
import { useReportFilters } from "@/features/sales-reports/use-report-filters";
import { formatHours } from "@/features/payroll/payroll-model";
import { LaborCostRaftDetail } from "./labor-cost-raft-detail";
import type { RaftLaborCost } from "./labor-costs-contracts";
import styles from "./labor-costs.module.css";
import { useLaborCosts } from "./use-labor-costs";

const DEFAULTS = { zone: "", raft: "" };
const MAX_DAYS = 365;
const percent = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });
const rowKey = (row: RaftLaborCost) => `${row.zoneId}:${row.raftId ?? "zone"}`;
const spanDays = (from: string, to: string) => Math.round((fromQueryDate(to).getTime() - fromQueryDate(from).getTime()) / 86_400_000);

/** Chi phí nhân công theo bè trong khoảng ngày, kèm chi tiết theo chu kỳ khi bấm vào một bè. Chỉ xem (Chủ HTX và Kế toán). */
export function LaborCostsScreen() {
  return <Suspense fallback={<ListSkeleton />}><LaborCostsWorkspace /></Suspense>;
}

function LaborCostsWorkspace() {
  const filters = useReportFilters(DEFAULTS, { guidKeys: ["zone", "raft"] });
  const zones = useReportZones("labor-costs");
  const [openKey, setOpenKey] = useState<string>();
  const today = businessToday();
  // "Toàn thời gian" becomes the last 12 months: the backend answers at most one year.
  const range = useMemo(() => boundedRange(filters.applied.time, today, 1), [filters.applied.time, today]);
  const { costs, canView, canExport, exportFile, exporting, exportError } = useLaborCosts({ ...range, zoneId: filters.applied.extra.zone });
  const data = costs.data, raftId = filters.applied.extra.raft;
  const rows = useMemo(() => (data?.items ?? []).filter((row) => !raftId || row.raftId === raftId), [data, raftId]);
  const total = rows.reduce((sum, row) => sum + row.amount, 0), totalHours = rows.reduce((sum, row) => sum + (row.hours ?? 0), 0);
  const draftRange = boundedRange(filters.draft.time, today, 1);
  const problem = filters.problem ?? (spanDays(draftRange.from, draftRange.to) > MAX_DAYS ? "Chọn khoảng thời gian tối đa 1 năm." : null);
  const raftOptions = (data?.items ?? []).filter((row) => row.raftId);

  const columns: ReportColumn<RaftLaborCost>[] = [
    { key: "raft", header: "Bè", cell: (row) => <RowLinkButton pressed={openKey === rowKey(row)} onClick={() => setOpenKey(openKey === rowKey(row) ? undefined : rowKey(row))}>{row.raftCode ?? "Công ươm cấp vùng"}</RowLinkButton>, total: "Tổng" },
    { key: "zone", header: "Vùng nuôi", cell: (row) => row.zoneName },
    { key: "hours", header: "Giờ công", numeric: true, cell: (row) => formatHours(row.hours ?? 0), total: formatHours(totalHours) },
    { key: "amount", header: "Chi phí nhân công", numeric: true, cell: (row) => vnd(row.amount), total: vnd(total) },
    { key: "share", header: "Tỷ trọng", numeric: true, cell: (row) => total ? `${percent.format(row.amount / total * 100)}%` : "—", total: total ? "100%" : "—" },
  ];
  const open = rows.find((row) => rowKey(row) === openKey);
  const empty = !!data && !rows.length ? "Chưa có chi phí nhân công trong khoảng đã chọn. Hãy chọn khoảng ngày hoặc bộ lọc khác." : undefined;

  return (
    <ReportPage storageKey="labor-costs" icon="raft" title="Chi phí nhân công" filterLabel="Bộ lọc chi phí nhân công" canView={canView}
      onExportFormat={canExport ? exportFile : undefined} exporting={exporting} exportError={exportError}
      filters={<ReportFilterRail time={filters.draft.time} onTime={(time) => filters.change({ time })} zoneIds={[]} onZones={() => undefined} zones={zones} showZones={false}
        problem={problem} busy={costs.loading} onApply={() => { setOpenKey(undefined); filters.apply(); }} onReset={() => { setOpenKey(undefined); filters.reset(); }}>
        <FilterGroup legend="Vùng nuôi">
          <SelectBox aria-label="Vùng nuôi" className="omts-control" value={filters.draft.extra.zone} disabled={zones.loading} onChange={(event) => filters.change({ extra: { zone: event.target.value, raft: "" } })}>
            <option value="">Tất cả vùng</option>
            {zones.options.map((zone) => <option key={zone.id} value={zone.id}>{zone.label}</option>)}
          </SelectBox>
        </FilterGroup>
        <FilterGroup legend="Bè">
          <SelectBox aria-label="Bè" className="omts-control" value={filters.draft.extra.raft} disabled={!raftOptions.length} onChange={(event) => filters.change({ extra: { raft: event.target.value } })}>
            <option value="">Tất cả bè</option>
            {raftOptions.map((row) => <option key={rowKey(row)} value={row.raftId ?? ""}>{row.raftCode}</option>)}
          </SelectBox>
        </FilterGroup>
      </ReportFilterRail>}
      loading={costs.loading} error={costs.error} onRetry={costs.reload} hasData={!!data} emptyMessage={empty}>
      {data && <div className={styles.stack}>
        <ReportTiles label="Tổng hợp chi phí nhân công" tiles={[
          { label: "Tổng chi phí nhân công", value: vnd(total), hint: `${rows.length} dòng` },
          { label: "Giờ công trả lương", value: formatHours(totalHours) },
          { label: "Bè có chi phí", value: String(rows.filter((row) => row.raftId).length) },
        ]} />
        <ReportTable caption="Chi phí nhân công theo bè" columns={columns} rows={rows} rowKey={rowKey} selectedKey={openKey} />
        {open && <LaborCostRaftDetail key={rowKey(open)} row={open} from={data.from} to={data.to} />}
        <p className={styles.footnote}>Công ươm cấp vùng không tính vào chu kỳ nuôi của bè. Chi phí là công của người lao động thời vụ, tính từ chấm công và đơn giá theo loại công việc.</p>
      </div>}
    </ReportPage>
  );
}
