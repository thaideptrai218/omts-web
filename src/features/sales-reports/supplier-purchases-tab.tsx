"use client";
import { useState, type ReactNode } from "react";
import { EntityFilter } from "./report-entity-filters";
import { ReportChoice, ReportFilterRail, useReportZones } from "./report-filter-rail";
import { ReportPage, type ReportView } from "./report-page";
import { GROUP_OPTIONS, KIND_OPTIONS, type SupplierReportFilters } from "./supplier-report-filters";
import { SupplierPurchasesPanel } from "./supplier-purchases-panel";
import type { PurchaseGroupBy } from "./supplier-report-contracts";
import { usePurchaseReport, useSupplierOptions } from "./use-purchase-report";

/** Tab "Hàng nhập theo NCC": giá trị nhập, trả và nhập thuần theo nhà cung cấp hoặc mặt hàng, lọc theo loại (Giống/Vật tư) và nhà cung cấp; mở dòng để xem phiếu. */
export function SupplierPurchasesTab({ filters, tabChoice }: Readonly<{ filters: SupplierReportFilters; tabChoice: ReactNode }>) {
  const zones = useReportZones("supplier-report"), suppliers = useSupplierOptions();
  const [view, setView] = useState<ReportView>("chart"), [search, setSearch] = useState("");
  const { applied, draft } = filters;
  const purchases = usePurchaseReport({ from: filters.query.from, to: filters.query.to, groupBy: applied.extra.groupBy, kind: applied.extra.kind, supplierId: applied.extra.supplierId });
  const { report } = purchases, data = report.data;
  return (
    <ReportPage storageKey="supplier-report" icon="supplier" title="Nhà cung cấp" filterLabel="Bộ lọc báo cáo nhà cung cấp" canView={purchases.canView}
      filters={<ReportFilterRail time={draft.time} onTime={(time) => filters.change({ time })} zoneIds={draft.zoneIds} onZones={(zoneIds) => filters.change({ zoneIds })} zones={zones}
        showZones={false} problem={filters.problem} busy={report.loading} onApply={filters.apply} onReset={filters.reset}>
        {tabChoice}
        <ReportChoice legend="Xem theo" value={draft.extra.groupBy} options={GROUP_OPTIONS} onChange={(groupBy) => filters.applyNow({ groupBy })} />
        <ReportChoice legend="Loại hàng nhập" value={draft.extra.kind} options={KIND_OPTIONS} onChange={(kind) => filters.applyNow({ kind })} />
        <EntityFilter legend="Nhà cung cấp" allLabel="Tất cả nhà cung cấp" value={draft.extra.supplierId} source={suppliers} onChange={(supplierId) => filters.change({ extra: { supplierId } })} />
      </ReportFilterRail>}
      search={{ value: search, placeholder: "Tìm trong bảng", onChange: setSearch }}
      onExport={purchases.canExport ? purchases.exportFile : undefined} exporting={purchases.exporting} exportError={purchases.exportError}
      loading={report.loading} error={report.error} onRetry={report.reload} hasData={!!data}
      emptyMessage={data && !data.groups.length ? data.message ?? "Không có phiếu nhập nào trong kỳ đã chọn." : undefined}>
      {data && <SupplierPurchasesPanel key={`${data.groupBy}:${data.from}:${data.to}`} report={data} params={purchases.params} groupBy={applied.extra.groupBy as PurchaseGroupBy} view={view} onView={setView} search={search} />}
    </ReportPage>
  );
}
