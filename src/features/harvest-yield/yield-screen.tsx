"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { HelpLink, ManagementLayout } from "@/components/ui/management-screen/management-layout";
import { ListStateMessage, ManagementPagination, ManagementScroller } from "@/components/ui/management-screen/management-table";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { ListSkeleton } from "@/features/farming-management/detail-parts";
import { ErrorNotice } from "@/features/operations/ui";
import { useKgPerCage } from "@/features/harvest-settings-lookup/use-kg-per-cage";
import { foldVietnamese } from "@/shared/presentation/fold-text";
import { pageSize, pageSlice } from "./yield-logic";
import { useYieldReport } from "./use-yield-report";
import { YieldFilterPanel } from "./yield-filter-panel";
import { YieldTable } from "./yield-table";
import { YieldTotalsStrip } from "./yield-totals-strip";
import s from "./yield-screen.module.css";

/** SCR-HARVEST-03 Sản lượng nuôi: tổng hợp ước tính, đã bán, hao hụt, chênh lệch của các lô thu hoạch trong kỳ (HARVEST-04). */
export function HarvestYieldScreen({ helpHref }: { helpHref?: string }) {
  const y = useYieldReport();
  const { identity } = useApiWorkspace();
  const { report } = y;
  const [search, setSearch] = useState("");
  // Owner-only read; undefined for everyone else, so quantities fall back to kg alone.
  const { kgPerCage } = useKgPerCage(identity.subjectType === "CooperativeOwner" ? identity.accountId : undefined);
  // The report already holds every group of the period, so searching the group name runs over all of them.
  const term = foldVietnamese(search.trim());
  const matching = useMemo(() => y.groups.filter((group) => !term || foldVietnamese(`${group.label} ${group.zoneCode}`).includes(term)), [y.groups, term]);
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
        <ErrorNotice error={y.exportError} />
        {busy && !data && <ListSkeleton />}
        {report.error && <ListStateMessage error={report.error} onRetry={report.reload} retryLabel="Thử lại" />}
        {data && <>
          <div className={s.tableTotals}><YieldTotalsStrip report={data} kgPerCage={kgPerCage} /></div>
          {!data.groups.length ? <ListStateMessage>{`Không có lô thu hoạch trong kỳ. ${data.message ?? "Hãy mở rộng khoảng thời gian hoặc chọn thêm vùng nuôi."}`}</ListStateMessage>
            : !matching.length ? <ListStateMessage>Không có nhóm phù hợp từ khóa tìm kiếm.</ListStateMessage>
            : <YieldTable groups={pageSlice(matching, page)} sort={y.sort} showZone={data.groupBy !== "Zone"} kgPerCage={kgPerCage} onSort={y.changeSort} />}
        </>}
      </div>
    </ManagementScroller>
  </ManagementLayout>;
}
