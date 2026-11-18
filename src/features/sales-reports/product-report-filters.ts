"use client";
import { useReportFilters } from "./use-report-filters";

export const PRODUCT_CONCERNS = ["sales", "stock"] as const;
export type ProductConcern = typeof PRODUCT_CONCERNS[number];
export const CONCERN_LABELS: readonly (readonly [ProductConcern, string])[] = [["sales", "Bán hàng"], ["stock", "Xuất nhập tồn"]];

/** `merge` = "1" là bật "Gộp theo nhóm hàng". */
const DEFAULTS = { concern: "sales" as ProductConcern, merge: "", productId: "" };

/** Bộ lọc báo cáo Hàng hóa: kỳ + vùng (chỉ phần Bán hàng) + mối quan tâm + gộp nhóm hàng + sản phẩm, giữ trên URL. */
export function useProductReportFilters() {
  return useReportFilters(DEFAULTS, { allowed: { concern: PRODUCT_CONCERNS, merge: ["", "1"] }, guidKeys: ["productId"] });
}
export type ProductReportFilters = ReturnType<typeof useProductReportFilters>;
