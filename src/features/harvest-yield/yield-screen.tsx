"use client";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { HelpLink, ManagementLayout } from "@/components/ui/management-screen/management-layout";
import { ColumnPicker, ListStateMessage, ManagementPagination, ManagementScroller } from "@/components/ui/management-screen/management-table";
import { ListSkeleton } from "@/features/farming-management/detail-parts";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { foldVietnamese } from "@/shared/presentation/fold-text";
import { viewGroupingLabel } from "./contracts";
import { useVisibleColumns, yieldColumns } from "./yield-columns";
import { pageSize, pageSlice, widestYieldFrom } from "./yield-logic";
import { useYieldReport } from "./use-yield-report";
import { YieldFilterPanel } from "./yield-filter-panel";
import { YieldInsights } from "./yield-insights";
import { YieldKpiStrip } from "./yield-kpi-strip";
import { YieldTable } from "./yield-table";
import { YieldTrendSection } from "./yield-trend-section";
import s from "./yield-screen.module.css";

/** SCR-HARVEST-03 Sản lượng nuôi (HARVEST-04): chỉ số, xu hướng, gợi ý và bảng nhóm của các lô thu hoạch trong kỳ; kg là ước tính từ số lồng. */
export function HarvestYieldScreen({ helpHref }: { helpHref?: string }) {
  return <Suspense fallback={<ListSkeleton />}><LinkedYieldScreen helpHref={helpHref} /></Suspense>;
}

function LinkedYieldScreen({ helpHref }: { helpHref?: string }) {
  const params = useSearchParams();
  const linked = { zoneId: params.get("zoneId") ?? "", raftId: params.get("raftId") ?? "", cycleId: params.get("cycleId") ?? "", recordId: params.get("recordId") ?? "", search: params.get("search") ?? "", from: params.get("from") ?? "", to: params.get("to") ?? "" };
  return <YieldWorkspace key={JSON.stringify(linked)} helpHref={helpHref} linked={linked} />;
}

function YieldWorkspace({ helpHref, linked }: { helpHref?: string; linked: { zoneId: string; raftId: string; cycleId: string; recordId: string; search: string; from: string; to: string } }) {
  const y = useYieldReport(linked), columns = useVisibleColumns();
  const { report } = y;
  const [search, setSearch] = useState(linked.search);
  // Báo cáo đã có mọi nhóm của kỳ nên tìm theo tên nhóm/vùng/mã lô chạy trên tất cả.
  const term = foldVietnamese(search.trim());
  const matching = useMemo(() => term ? y.rows.filter((row) => foldVietnamese(`${row.label} ${row.zoneCode} ${row.lots.map(lot => lot.lotCode).join(" ")}`).includes(term)) : y.rows, [y.rows, term]);
  const data = report.data, busy = report.loading;
  const lastPage = Math.max(1, Math.ceil(matching.length / pageSize)), page = Math.min(y.page, lastPage);
  const period = data ? (data.from <= widestYieldFrom(data.to) ? "5 năm gần nhất" : `${formatVietnameseDate(data.from)} – ${formatVietnameseDate(data.to)}`) : "";

  if (!y.canView) return <p role="alert" className="rounded-card border border-border bg-surface p-6">Bạn chưa có quyền xem sản lượng nuôi. Hãy liên hệ Chủ hợp tác xã để được cấp quyền xem báo cáo này.</p>;
  return <ManagementLayout storageKey="harvest-yield" icon="waves" title="Sản lượng nuôi" filterLabel="Bộ lọc báo cáo sản lượng"
    filters={<YieldFilterPanel filters={y.draft} zones={y.zoneOptions} zonesLoading={y.zones.loading} zonesError={y.zones.error} problem={y.problem} busy={busy}
      scope={y.scope} rafts={y.raftOptions} onScope={y.changeScope}
      onChange={y.changeDraft} onApply={y.apply} onReset={y.reset} onReloadZones={y.zones.reload} />}
    search={<input type="search" aria-label="Tìm nhóm" placeholder="Theo tên nhóm, vùng hoặc mã lô" maxLength={200} value={search} onChange={(event) => { setSearch(event.target.value); y.setPage(1); }} />}
    actions={<>
      {y.canExport && <Button key="export" className="w-auto" variant="secondary" isPending={y.exporting} disabled={busy} onClick={y.exportFile}><InterfaceIcon name="download" className="mr-1 size-4" />Xuất file</Button>}
      <ColumnPicker columns={yieldColumns} visible={columns.visible} onChange={columns.change} />
      <HelpLink helpHref={helpHref} />
    </>}
    footer={<ManagementPagination page={page} pageSize={pageSize} pageSizes={[pageSize]} total={matching.length} unit="nhóm" disabled={busy} onPage={y.setPage} onPageSize={() => undefined} />}>
    <ManagementScroller busy={busy}>
      <div aria-live="polite">
        {busy && !data && <ListSkeleton />}
        {report.error && <ListStateMessage error={report.error} onRetry={report.reload} retryLabel="Thử lại" />}
        {data && <>
          <div className={s.overview}>
            <p className={s.period}>{period} · gộp theo {viewGroupingLabel[y.applied.groupBy].toLocaleLowerCase("vi")}</p>
            <YieldKpiStrip kpis={y.kpis} previous={y.previousKpis} />
            {y.filtered.length > 0 && <>
              <YieldTrendSection groups={y.filtered} />
              <details className={s.section} open>
                <summary><strong>Gợi ý nhanh</strong><span className={s.muted}> · tính từ số liệu của báo cáo</span></summary>
                <div className={s.sectionBody}><YieldInsights insights={y.insights} showNotHarvested={!y.scope.raftId} /></div>
              </details>
            </>}
          </div>
          {!data.groups.length ? <ListStateMessage>{`Không có lô thu hoạch trong kỳ. ${data.message ?? "Hãy mở rộng khoảng thời gian hoặc chọn thêm vùng nuôi."}`}</ListStateMessage>
            : !y.rows.length ? <ListStateMessage>Không có nhóm nào khớp bộ lọc bè và trạng thái. Hãy bỏ bớt bộ lọc ở cột bên trái.</ListStateMessage>
            : !matching.length ? <ListStateMessage>Không có nhóm phù hợp từ khóa tìm kiếm.</ListStateMessage>
            : <YieldTable groups={pageSlice(matching, page)} sort={y.sort} showZone={y.applied.groupBy !== "Zone"} linkedRecordId={linked.recordId} visible={columns.visible} totals={term ? undefined : y.kpis} onSort={y.changeSort} />}
        </>}
      </div>
    </ManagementScroller>
  </ManagementLayout>;
}
