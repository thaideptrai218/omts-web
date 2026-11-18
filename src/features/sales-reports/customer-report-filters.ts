"use client";
import { useReportFilters } from "./use-report-filters";

export const CUSTOMER_TABS = ["sales", "debts"] as const;
export type CustomerTab = typeof CUSTOMER_TABS[number];
export const TAB_LABELS: readonly (readonly [CustomerTab, string])[] = [["sales", "Hàng bán theo khách"], ["debts", "Công nợ"]];

const DEFAULTS = { tab: "sales" as CustomerTab, customerId: "" };

/** Bộ lọc báo cáo Khách hàng: kỳ + vùng + khách (tab Hàng bán theo khách), tab đang xem được giữ trên URL. */
export function useCustomerReportFilters() {
  return useReportFilters(DEFAULTS, { allowed: { tab: CUSTOMER_TABS }, guidKeys: ["customerId"] });
}
export type CustomerReportFilters = ReturnType<typeof useCustomerReportFilters>;
