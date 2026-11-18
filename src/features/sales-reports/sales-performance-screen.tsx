"use client";
import { Suspense, useState } from "react";
import { ListSkeleton } from "@/features/farming-management/detail-parts";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { salesGroupBy, type SalesGroupBy } from "./contracts";
import { EntityFilter, useCustomerOptions, useProductOptions } from "./report-entity-filters";
import { ReportChoice, ReportFilterRail, useReportZones } from "./report-filter-rail";
import { count, kg, vnd } from "./report-format";
import { ReportPage, type ReportView } from "./report-page";
import { SalesGroupsPanel } from "./sales-groups-panel";
import { GROUP_LABEL } from "./sales-report-columns";
import { useReportFilters } from "./use-report-filters";
import { useSalesReport } from "./use-sales-report";

const GROUP_OPTIONS = [["day", "Theo ngày"], ["week", "Theo tuần"], ["month", "Theo tháng"], ["zone", "Vùng nuôi"], ["product", "Sản phẩm"], ["customer", "Khách hàng"]] as const;
const DEFAULTS = { groupBy: "day" as SalesGroupBy, customerId: "", productId: "" };

/** Báo cáo Bán hàng (SCR-REPORT-01): doanh thu, giảm giá, hàng trả và doanh thu thuần theo kỳ, gộp theo thời gian, vùng, sản phẩm hoặc khách hàng. */
export function SalesPerformanceScreen() {
  return <Suspense fallback={<ListSkeleton />}><SalesWorkspace /></Suspense>;
}

function SalesWorkspace() {
  const filters = useReportFilters(DEFAULTS, { allowed: { groupBy: salesGroupBy }, guidKeys: ["customerId", "productId"] });
  const zones = useReportZones("sales-report"), customers = useCustomerOptions(), products = useProductOptions();
  const [view, setView] = useState<ReportView>("chart"), [search, setSearch] = useState("");
  const { applied, draft } = filters;
  const sales = useSalesReport("sales-report", { from: filters.query.from, to: filters.query.to, groupBy: applied.extra.groupBy, zoneIds: applied.zoneIds, customerId: applied.extra.customerId, productId: applied.extra.productId });
  const { report } = sales, data = report.data;
  const totals = data?.totals;
  return (
    <ReportPage storageKey="sales-report" icon="dashboard" title="Bán hàng" filterLabel="Bộ lọc báo cáo bán hàng" canView={sales.canView}
      filters={<ReportFilterRail time={draft.time} onTime={(time) => filters.change({ time })} zoneIds={draft.zoneIds} onZones={(zoneIds) => filters.change({ zoneIds })} zones={zones}
        problem={filters.problem} busy={report.loading} onApply={filters.apply} onReset={filters.reset}>
        <ReportChoice legend="Xem theo" value={draft.extra.groupBy} options={GROUP_OPTIONS} onChange={(groupBy) => filters.applyNow({ groupBy: groupBy as SalesGroupBy })} />
        <EntityFilter legend="Khách hàng" allLabel="Tất cả khách hàng" value={draft.extra.customerId} source={customers} onChange={(customerId) => filters.change({ extra: { customerId } })} />
        <EntityFilter legend="Sản phẩm" allLabel="Tất cả sản phẩm" value={draft.extra.productId} source={products} onChange={(productId) => filters.change({ extra: { productId } })} />
      </ReportFilterRail>}
      search={{ value: search, placeholder: "Tìm nhóm trong bảng", onChange: setSearch }}
      onExport={sales.canExport ? sales.exportFile : undefined} exporting={sales.exporting} exportError={sales.exportError}
      loading={report.loading} error={report.error} onRetry={report.reload} hasData={!!data} emptyMessage={data && !data.groups.length ? data.message ?? "Không có hóa đơn nào trong kỳ đã chọn." : undefined}>
      {data && totals && <SalesGroupsPanel area="sales-report" report={data} params={sales.params} groupBy={applied.extra.groupBy} view={view} onView={setView} search={search}
        chartTitle={`Doanh thu thuần theo ${GROUP_LABEL[applied.extra.groupBy].toLocaleLowerCase("vi")}`}
        periodText={`${formatVietnameseDate(data.from)} – ${formatVietnameseDate(data.to)} · không tính hóa đơn đã hủy`} tilesLabel="Tổng hợp toàn kỳ"
        tiles={[
          { label: "Số hóa đơn", value: count(totals.invoiceCount) },
          { label: "Doanh thu", value: vnd(totals.revenue) },
          { label: "Giảm giá và hàng trả", value: vnd(totals.priceCuts + totals.salesReturns), hint: `Giảm giá ${vnd(totals.priceCuts)} · trả ${vnd(totals.salesReturns)}` },
          { label: "Doanh thu thuần", value: vnd(totals.netRevenue) },
          { label: "Khối lượng đã bán", value: kg(totals.soldKg) },
        ]} />}
    </ReportPage>
  );
}
