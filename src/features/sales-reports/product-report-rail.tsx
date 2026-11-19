"use client";
import { FilterGroup } from "@/components/ui/management-screen/management-layout";
import { CONCERN_LABELS, type ProductConcern, type ProductReportFilters } from "./product-report-filters";
import { EntityFilter } from "./report-entity-filters";
import { ReportChoice, ReportFilterRail, type useReportZones } from "./report-filter-rail";
import type { ProductCatalog } from "./use-product-catalog";

type Props = Readonly<{ filters: ProductReportFilters; catalog: ProductCatalog; zones: ReturnType<typeof useReportZones>; busy: boolean }>;

/**
 * Cột lọc báo cáo Hàng hóa: kỳ, vùng nuôi (chỉ phần Bán hàng, vì tồn kho không chia theo vùng), mối quan tâm, "Gộp theo nhóm hàng" và sản phẩm.
 * Đổi mối quan tâm hoặc công tắc gộp nhóm áp dụng ngay; các ô còn lại chờ "Xem báo cáo".
 */
export function ProductReportRail({ filters, catalog, zones, busy }: Props) {
  const { draft, applied } = filters;
  return (
    <ReportFilterRail time={draft.time} onTime={(time) => filters.change({ time })} zoneIds={draft.zoneIds} onZones={(zoneIds) => filters.change({ zoneIds })} zones={zones}
      showZones={applied.extra.concern === "sales"} problem={filters.problem} busy={busy} onApply={filters.apply} onReset={filters.reset}>
      <ReportChoice legend="Mối quan tâm" value={applied.extra.concern} options={CONCERN_LABELS} onChange={(concern) => filters.applyNow({ concern: concern as ProductConcern })} />
      <FilterGroup legend="Nhóm hàng">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" role="switch" checked={applied.extra.merge === "1"} onChange={(event) => filters.applyNow({ merge: event.target.checked ? "1" : "" })} />
          Gộp theo nhóm hàng
        </label>
      </FilterGroup>
      <EntityFilter legend="Sản phẩm" allLabel="Tất cả sản phẩm" value={draft.extra.productId} source={catalog} onChange={(productId) => filters.change({ extra: { productId } })} />
    </ReportFilterRail>
  );
}
