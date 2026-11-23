"use client";
import { Suspense, useMemo, useState } from "react";
import { ListSkeleton } from "@/features/farming-management/detail-parts";
import { buildDocument, isReportEmpty } from "./end-of-day-build";
import { EndOfDayFilterRail } from "./end-of-day-filters";
import type { EndOfDayFilters } from "./end-of-day-filters-model";
import { buildPaperHead } from "./end-of-day-head";
import { allOpen, flipOpen, setAllOpen, type OpenState } from "./end-of-day-model";
import { PaperViewer } from "./end-of-day-paper/paper-viewer";
import { canGoBack, canGoForward, currentState, moveHistory, recordState, startHistory } from "./end-of-day-paper/viewer-history";
import { EndOfDayTableView } from "./end-of-day-table-view";
import { useReportZones } from "./report-filter-rail";
import { ReportPage } from "./report-page";
import { useEndOfDayFilters } from "./use-end-of-day-filters";
import { useEndOfDayReport } from "./use-end-of-day-report";

const EMPTY_MESSAGE = "Không có giao dịch nào trong khoảng thời gian và bộ lọc đã chọn. Hãy chọn khoảng thời gian hoặc bộ lọc khác.";
type Snapshot = Readonly<{ filters: EndOfDayFilters; open: OpenState }>;

/** Báo cáo Cuối ngày: bốn mối quan tâm (bán hàng, thu chi, hàng hóa, tổng hợp) theo một ngày (có giờ) hoặc khoảng ngày; xem Dạng bảng hoặc Dạng Báo cáo (trang giấy), tải PDF/Excel. */
export function EndOfDayReportScreen() {
  return <Suspense fallback={<ListSkeleton />}><EndOfDayWorkspace /></Suspense>;
}

function EndOfDayWorkspace() {
  const filters = useEndOfDayFilters(), { applied } = filters;
  const zones = useReportZones("end-of-day-report");
  const eod = useEndOfDayReport(applied), { report } = eod, data = report.data;
  const [open, setOpen] = useState<OpenState>({});
  // Lịch sử Quay lại / Tới: mỗi lần điều kiện đã áp dụng hoặc trạng thái ⊞/⊟ đổi thì ghi một bản chụp (trạng thái trùng bản hiện tại thì bỏ qua).
  const snapshot: Snapshot = { filters: applied, open };
  const [history, setHistory] = useState(() => startHistory(snapshot));
  const recorded = recordState(history, snapshot);
  if (recorded !== history) setHistory(recorded);
  const travel = (delta: -1 | 1) => {
    const target = moveHistory(history, delta), state = currentState(target);
    setHistory(target); setOpen(state.open); filters.restore(state.filters);
  };

  const doc = useMemo(() => data ? buildDocument(data) : undefined, [data]);
  const head = useMemo(() => data ? buildPaperHead(data, applied) : undefined, [data, applied]);
  const empty = !!data && isReportEmpty(data);
  const expanded = !!doc && applied.concern === "goods" && allOpen(doc, open);
  const toggle = (key: string) => doc && setOpen((state) => flipOpen(doc, state, key));

  return (
    <ReportPage storageKey="end-of-day-report" icon="document" title="Cuối ngày" filterLabel="Bộ lọc báo cáo cuối ngày" canView={eod.canView}
      filters={<EndOfDayFilterRail draft={filters.draft} today={filters.today} zones={zones} problem={filters.problem} busy={report.loading} onChange={filters.change} onApplyNow={filters.applyNow} onApply={filters.apply} onReset={filters.reset} />}
      onExportFormat={eod.canExport && applied.layout === "table" ? (format) => eod.exportFile(format, expanded) : undefined} exporting={eod.exporting} exportError={eod.exportError}
      loading={report.loading} error={report.error} onRetry={report.reload} hasData={!!data} emptyMessage={empty ? EMPTY_MESSAGE : undefined}>
      {doc && head && (applied.layout === "table"
        ? <EndOfDayTableView doc={doc} state={open} onToggle={toggle} />
        : <PaperViewer doc={doc} head={head} orientation={applied.orientation} state={open} onToggle={toggle} onToggleAll={(next) => setOpen(setAllOpen(doc, next))}
          history={{ canBack: canGoBack(history), canForward: canGoForward(history), back: () => travel(-1), forward: () => travel(1) }}
          onRefresh={report.refresh} canDownload={eod.canExport} downloading={eod.exporting} onDownload={(format) => eod.exportFile(format, expanded)} />)}
    </ReportPage>
  );
}
