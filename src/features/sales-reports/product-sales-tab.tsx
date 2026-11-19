"use client";
import { useMemo, useState } from "react";
import { ProductSalesPanel } from "./product-sales-panel";
import type { ProductReportFilters } from "./product-report-filters";
import { ProductReportRail } from "./product-report-rail";
import { buildProductSalesRows } from "./product-sales-rows";
import { useReportZones } from "./report-filter-rail";
import { ReportPage, type ReportView } from "./report-page";
import type { ProductCatalog } from "./use-product-catalog";
import { useSalesReport } from "./use-sales-report";

type Props = Readonly<{ filters: ProductReportFilters; catalog: ProductCatalog }>;

/** Mối quan tâm "Bán hàng" của báo cáo Hàng hóa: dùng báo cáo bán hàng gộp theo sản phẩm; tuỳ chọn gộp theo nhóm hàng làm ở web từ danh mục sản phẩm. */
export function ProductSalesTab({ filters, catalog }: Props) {
  const zones = useReportZones("product-report");
  const [view, setView] = useState<ReportView>("chart"), [search, setSearch] = useState("");
  const { applied } = filters, merge = applied.extra.merge === "1";
  const sales = useSalesReport("product-report", { from: filters.query.from, to: filters.query.to, groupBy: "product", zoneIds: applied.zoneIds, productId: applied.extra.productId });
  const { report } = sales, data = report.data;
  const rows = useMemo(() => data ? buildProductSalesRows(data.groups, catalog.products, merge) : [], [data, catalog.products, merge]);
  return (
    <ReportPage storageKey="product-report" icon="product" title="Hàng hóa" filterLabel="Bộ lọc báo cáo hàng hóa" canView={sales.canView}
      filters={<ProductReportRail filters={filters} catalog={catalog} zones={zones} busy={report.loading} />}
      search={{ value: search, placeholder: "Tìm tên hoặc mã hàng trong bảng", onChange: setSearch }}
      onExport={sales.canExport ? sales.exportFile : undefined} exporting={sales.exporting} exportError={sales.exportError}
      loading={report.loading} error={report.error} onRetry={report.reload} hasData={!!data}
      emptyMessage={data && !rows.length ? data.message ?? "Không có hóa đơn nào trong kỳ đã chọn." : undefined}>
      {data && <>
        {merge && catalog.error && <p role="status" className="text-sm text-text-muted">Chưa đọc được danh mục sản phẩm nên chưa chia được theo nhóm hàng.</p>}
        <ProductSalesPanel report={data} rows={rows} merge={merge} view={view} onView={setView} search={search} />
      </>}
    </ReportPage>
  );
}
