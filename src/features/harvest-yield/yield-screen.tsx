"use client";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { HelpLink, ManagementLayout } from "@/components/ui/management-screen/management-layout";
import { ListStateMessage, ManagementPagination, ManagementScroller } from "@/components/ui/management-screen/management-table";
import { ListSkeleton } from "@/features/farming-management/detail-parts";
import { foldVietnamese } from "@/shared/presentation/fold-text";
import { pageSize, pageSlice } from "./yield-logic";
import { useYieldReport } from "./use-yield-report";
import { YieldFilterPanel } from "./yield-filter-panel";
import { YieldTable } from "./yield-table";
import { YieldTotalsStrip } from "./yield-totals-strip";
import s from "./yield-screen.module.css";

/** SCR-HARVEST-03 Sản lượng nuôi: tổng hợp số lồng, kg ước tính, đã bán, kg ước tính, đã bán, còn để bán của các lô thu hoạch trong kỳ (HARVEST-04). */
export function HarvestYieldScreen({ helpHref }: { helpHref?: string }) {
  return <Suspense fallback={<ListSkeleton />}><LinkedYieldScreen helpHref={helpHref} /></Suspense>;
}

function LinkedYieldScreen({ helpHref }: { helpHref?: string }) {
  const params = useSearchParams();
  const linked = { zoneId: params.get("zoneId") ?? "", raftId: params.get("raftId") ?? "", cycleId: params.get("cycleId") ?? "", recordId: params.get("recordId") ?? "", search: params.get("search") ?? "", from: params.get("from") ?? "", to: params.get("to") ?? "" };
  return <YieldWorkspace key={JSON.stringify(linked)} helpHref={helpHref} linked={linked} />;
}

function YieldWorkspace({ helpHref, linked }: { helpHref?: string; linked: { zoneId: string; raftId: string; cycleId: string; recordId: string; search: string; from: string; to: string } }) {
  const y = useYieldReport(linked);
  const { report } = y;
  const [search, setSearch] = useState(linked.search);
  // The report already holds every group of the period, so searching the group name runs over all of them.
  const term = foldVietnamese(search.trim());
  const matching = useMemo(() => y.groups.filter((group) => (!linked.raftId || group.raftId === linked.raftId || group.lots.some(lot => lot.raftId === linked.raftId)) && (!linked.cycleId || group.cycleId === linked.cycleId || group.lots.some(lot => lot.cycleId === linked.cycleId)) && (!linked.recordId || group.key === linked.recordId || group.lots.some(lot => lot.id === linked.recordId)) && (!term || foldVietnamese(`${group.label} ${group.zoneCode} ${group.lots.map(lot => lot.lotCode).join(" ")}`).includes(term))), [y.groups, term, linked]);
  const data = report.data, busy = report.loading;
  const lastPage = Math.max(1, Math.ceil(matching.length / pageSize)), page = Math.min(y.page, lastPage);

  if (!y.canView) return <p role="alert" className="rounded-card border border-border bg-surface p-6">Bạn chưa có quyền xem sản lượng nuôi. Hãy liên hệ Chủ hợp tác xã để được cấp quyền xem báo cáo này.</p>;
  return <ManagementLayout storageKey="harvest-yield" icon="waves" title="Sản lượng nuôi" filterLabel="Bộ lọc báo cáo sản lượng"
    filters={<YieldFilterPanel filters={y.draft} zones={y.zoneOptions} zonesLoading={y.zones.loading} zonesError={y.zones.error} problem={y.problem} busy={busy}
      onChange={y.changeDraft} onApply={y.apply} onReset={y.reset} onReloadZones={y.zones.reload} />}
    search={<input type="search" aria-label="Tìm nhóm" placeholder="Theo tên nhóm hoặc vùng" maxLength={200} value={search} onChange={(event) => { setSearch(event.target.value); y.setPage(1); }} />}
    actions={<>
      {y.canExport && <Button key="export" className="w-auto" variant="secondary" isPending={y.exporting} disabled={busy} onClick={y.exportFile}><InterfaceIcon name="download" className="mr-1 size-4" />Xuất file</Button>}
      <HelpLink helpHref={helpHref} />
    </>}
    footer={<ManagementPagination page={page} pageSize={pageSize} pageSizes={[pageSize]} total={matching.length} unit="nhóm" disabled={busy} onPage={y.setPage} onPageSize={() => undefined} />}>
    <ManagementScroller busy={busy}>
      <div aria-live="polite">
        {busy && !data && <ListSkeleton />}
        {report.error && <ListStateMessage error={report.error} onRetry={report.reload} retryLabel="Thử lại" />}
        {data && <>
          <div className={s.tableTotals}><YieldTotalsStrip report={data} /></div>
          {!data.groups.length ? <ListStateMessage>{`Không có lô thu hoạch trong kỳ. ${data.message ?? "Hãy mở rộng khoảng thời gian hoặc chọn thêm vùng nuôi."}`}</ListStateMessage>
            : !matching.length ? <ListStateMessage>Không có nhóm phù hợp từ khóa tìm kiếm.</ListStateMessage>
            : <YieldTable groups={pageSlice(matching, page)} sort={y.sort} showZone={data.groupBy !== "Zone"} linkedRecordId={linked.recordId} onSort={y.changeSort} />}
        </>}
      </div>
    </ManagementScroller>
  </ManagementLayout>;
}
