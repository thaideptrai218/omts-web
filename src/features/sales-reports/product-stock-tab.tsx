"use client";
import { useState } from "react";
import { ProductReportRail } from "./product-report-rail";
import type { ProductReportFilters } from "./product-report-filters";
import { ProductStockPanel } from "./product-stock-panel";
import { useReportZones } from "./report-filter-rail";
import { ReportPage, type ReportView } from "./report-page";
import type { ProductCatalog } from "./use-product-catalog";
import { useProductStock } from "./use-product-stock";

type Props = Readonly<{ filters: ProductReportFilters; catalog: ProductCatalog }>;

/** Mối quan tâm "Xuất nhập tồn" của báo cáo Hàng hóa (kg): tồn đầu, nhập, xuất bán, hủy, điều chỉnh, tồn cuối. Gộp theo nhóm hàng do backend tính. Không lọc theo vùng. */
export function ProductStockTab({ filters, catalog }: Props) {
  const zones = useReportZones("product-report");
  const [view, setView] = useState<ReportView>("chart"), [search, setSearch] = useState("");
  const { applied } = filters, byCategory = applied.extra.merge === "1";
  const stock = useProductStock({ from: filters.query.from, to: filters.query.to, groupBy: byCategory ? "category" : "product", productId: applied.extra.productId });
  const { report } = stock, data = report.data;
  return (
    <ReportPage storageKey="product-report" icon="product" title="Hàng hóa" filterLabel="Bộ lọc báo cáo hàng hóa" canView={stock.canView}
      filters={<ProductReportRail filters={filters} catalog={catalog} zones={zones} busy={report.loading} />}
      search={{ value: search, placeholder: "Tìm tên hoặc mã hàng trong bảng", onChange: setSearch }}
      onExport={stock.canExport ? stock.exportFile : undefined} exporting={stock.exporting} exportError={stock.exportError}
      loading={report.loading} error={report.error} onRetry={report.reload} hasData={!!data}
      emptyMessage={data && !data.groups.length ? data.message ?? "Không có biến động kho nào trong kỳ đã chọn." : undefined}>
      {data && <ProductStockPanel report={data} byCategory={byCategory} view={view} onView={setView} search={search} />}
    </ReportPage>
  );
}
