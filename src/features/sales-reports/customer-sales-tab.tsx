"use client";
import { useState, type ReactNode } from "react";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { CustomerProductsCard } from "./customer-products-card";
import type { CustomerReportFilters } from "./customer-report-filters";
import { EntityFilter, useCustomerOptions } from "./report-entity-filters";
import { ReportFilterRail, useReportZones } from "./report-filter-rail";
import { count, vnd } from "./report-format";
import { ReportPage, type ReportView } from "./report-page";
import { SalesGroupsPanel } from "./sales-groups-panel";
import { useSalesReport } from "./use-sales-report";

const isWalkIn = (key: string) => key === "walk-in" || key === "unassigned";

/** Tab "Hàng bán theo khách": bảng khách · số hóa đơn · kg · doanh thu thuần · đã thu · còn nợ, biểu đồ top 10 khách, mở dòng để xem sản phẩm và hóa đơn. */
export function CustomerSalesTab({ filters, tabChoice }: Readonly<{ filters: CustomerReportFilters; tabChoice: ReactNode }>) {
  const zones = useReportZones("customer-report"), customers = useCustomerOptions();
  const [view, setView] = useState<ReportView>("chart"), [search, setSearch] = useState("");
  const { applied, draft } = filters;
  const base = { from: filters.query.from, to: filters.query.to, zoneIds: applied.zoneIds };
  const sales = useSalesReport("customer-report", { ...base, groupBy: "customer", customerId: applied.extra.customerId });
  const { report } = sales, data = report.data, totals = data?.totals;
  return (
    <ReportPage storageKey="customer-report" icon="users" title="Khách hàng" filterLabel="Bộ lọc báo cáo khách hàng" canView={sales.canView}
      filters={<ReportFilterRail time={draft.time} onTime={(time) => filters.change({ time })} zoneIds={draft.zoneIds} onZones={(zoneIds) => filters.change({ zoneIds })} zones={zones}
        problem={filters.problem} busy={report.loading} onApply={filters.apply} onReset={filters.reset}>
        {tabChoice}
        <EntityFilter legend="Khách hàng" allLabel="Tất cả khách hàng" value={draft.extra.customerId} source={customers} onChange={(customerId) => filters.change({ extra: { customerId } })} />
      </ReportFilterRail>}
      search={{ value: search, placeholder: "Tìm khách hàng trong bảng", onChange: setSearch }}
      onExport={sales.canExport ? sales.exportFile : undefined} exporting={sales.exporting} exportError={sales.exportError}
      loading={report.loading} error={report.error} onRetry={report.reload} hasData={!!data} emptyMessage={data && !data.groups.length ? data.message ?? "Không có hóa đơn nào trong kỳ đã chọn." : undefined}>
      {data && totals && <SalesGroupsPanel area="customer-report" report={data} params={sales.params} groupBy="customer" withDebt firstHeader="Khách hàng" view={view} onView={setView} search={search}
        chartTitle="Top 10 khách hàng theo doanh thu thuần" tilesLabel="Tổng hợp toàn kỳ"
        periodText={`${formatVietnameseDate(data.from)} – ${formatVietnameseDate(data.to)} · khách lẻ gộp một dòng · công nợ không chia theo vùng`}
        tiles={[
          { label: "Số khách có mua", value: count(data.groups.filter((group) => !isWalkIn(group.key) && group.invoiceCount > 0).length) },
          { label: "Số hóa đơn", value: count(totals.invoiceCount) },
          { label: "Doanh thu thuần", value: vnd(totals.netRevenue) },
          { label: "Đã thu ròng", value: vnd(totals.netMoneyReceived) },
          { label: "Còn nợ", value: vnd(totals.receivable), hint: totals.owedBack ? `Hợp tác xã nợ khách ${vnd(totals.owedBack)}` : undefined },
        ]}
        detail={(open) => <CustomerProductsCard customerKey={open.key} label={open.label} base={base} />} />}
    </ReportPage>
  );
}
