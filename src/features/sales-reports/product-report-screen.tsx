"use client";
import { Suspense } from "react";
import { ListSkeleton } from "@/features/farming-management/detail-parts";
import { useProductReportFilters } from "./product-report-filters";
import { ProductSalesTab } from "./product-sales-tab";
import { ProductStockTab } from "./product-stock-tab";
import { useProductCatalog } from "./use-product-catalog";

/** Báo cáo Hàng hóa kiểu KiotViet: mối quan tâm "Bán hàng" (doanh thu theo hàng hóa) hoặc "Xuất nhập tồn" (kg), có thể gộp theo nhóm hàng. Không có hạn sử dụng vì hàu bán sống. */
export function ProductReportScreen() {
  return <Suspense fallback={<ListSkeleton />}><ProductWorkspace /></Suspense>;
}

function ProductWorkspace() {
  const filters = useProductReportFilters(), catalog = useProductCatalog();
  return filters.applied.extra.concern === "stock" ? <ProductStockTab filters={filters} catalog={catalog} /> : <ProductSalesTab filters={filters} catalog={catalog} />;
}
