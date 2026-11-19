"use client";
import { purchaseGroupBy, purchaseKinds } from "./supplier-report-contracts";
import { useReportFilters } from "./use-report-filters";

export const SUPPLIER_TABS = ["purchases", "debts"] as const;
export type SupplierTab = typeof SUPPLIER_TABS[number];
export const SUPPLIER_TAB_LABELS: readonly (readonly [SupplierTab, string])[] = [["purchases", "Hàng nhập theo NCC"], ["debts", "Công nợ"]];
export const GROUP_OPTIONS = [["supplier", "Nhà cung cấp"], ["item", "Mặt hàng"]] as const;
export const KIND_OPTIONS = [["all", "Tất cả"], ["Seed", "Giống"], ["Supply", "Vật tư"]] as const;

const DEFAULTS = { tab: "purchases" as SupplierTab, groupBy: "supplier" as string, kind: "all" as string, supplierId: "" };

/** Bộ lọc báo cáo Nhà cung cấp: kỳ + cách xem + loại hàng + nhà cung cấp; tab đang xem được giữ trên URL. Nhập hàng không chia theo vùng nên không dùng vùng. */
export function useSupplierReportFilters() {
  return useReportFilters(DEFAULTS, { allowed: { tab: SUPPLIER_TABS, groupBy: purchaseGroupBy, kind: purchaseKinds }, guidKeys: ["supplierId"] });
}
export type SupplierReportFilters = ReturnType<typeof useSupplierReportFilters>;
