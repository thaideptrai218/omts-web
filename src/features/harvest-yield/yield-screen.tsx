"use client";
import { Button } from "@/components/ui/button";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { ErrorNotice, OperationHeading, Paging, Skeleton } from "@/features/operations/ui";
import { useKgPerCage } from "@/features/harvest-settings-lookup/use-kg-per-cage";
import { pageSize, pageSlice } from "./yield-logic";
import { useYieldReport } from "./use-yield-report";
import { YieldFilterPanel } from "./yield-filter-panel";
import { YieldTable } from "./yield-table";
import { YieldTotalsStrip } from "./yield-totals-strip";
import s from "./yield-screen.module.css";

/** SCR-HARVEST-03 Sản lượng nuôi: tổng hợp ước tính, đã bán, hao hụt, chênh lệch của các lô thu hoạch trong kỳ (HARVEST-04). */
export function HarvestYieldScreen() {
  const y = useYieldReport();
  const { identity } = useApiWorkspace();
  const { report } = y;
  // Owner-only read; undefined for everyone else, so quantities fall back to kg alone.
  const { kgPerCage } = useKgPerCage(identity.subjectType === "CooperativeOwner" ? identity.accountId : undefined);
  const heading = <OperationHeading title="Sản lượng nuôi" description="Đối chiếu sản lượng ước tính với số đã bán và hao hụt của các lô thu hoạch theo bè, vùng nuôi hoặc chu kỳ." icon="raft" />;

  if (!y.canView) {
    return <section>{heading}<div className={s.state} role="alert"><h2>Bạn chưa có quyền xem sản lượng nuôi</h2><p>Hãy liên hệ Chủ hợp tác xã để được cấp quyền xem báo cáo này.</p></div></section>;
  }
  const data = report.data, busy = report.loading;
  return (
    <section>
      {heading}
      <YieldFilterPanel filters={y.draft} zones={y.zoneOptions} zonesLoading={y.zones.loading} zonesError={y.zones.error} problem={y.problem} busy={busy}
        canExport={y.canExport} exporting={y.exporting} onChange={y.changeDraft} onApply={y.apply} onReset={y.reset} onExport={y.exportFile} onReloadZones={y.zones.reload}>
        <div aria-live="polite" aria-busy={busy}>
          <ErrorNotice error={y.exportError} />
          {busy && !data && <Skeleton />}
          {report.error && (
            <div className={s.state} role="alert"><h2>Chưa tải được báo cáo</h2><p>{report.error}</p><Button className="w-auto" variant="secondary" onClick={report.reload}>Thử lại</Button></div>
          )}
          {data && (
            <>
              <YieldTotalsStrip report={data} kgPerCage={kgPerCage} />
              {!data.groups.length ? (
                <div className={s.state}><h2>Không có lô thu hoạch trong kỳ</h2><p>{data.message ?? "Hãy mở rộng khoảng thời gian hoặc chọn thêm vùng nuôi."}</p></div>
              ) : (
                <>
                  <YieldTable groups={pageSlice(y.groups, y.page)} sort={y.sort} showZone={data.groupBy !== "Zone"} kgPerCage={kgPerCage} onSort={y.changeSort} />
                  <Paging page={y.page} total={y.groups.length} pageSize={pageSize} onChange={y.setPage} />
                </>
              )}
            </>
          )}
        </div>
      </YieldFilterPanel>
    </section>
  );
}
