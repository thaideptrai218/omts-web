"use client";
import { useCallback, useMemo } from "react";
import { auditRepository } from "@/features/audit-api/repository";
import { longestAuditFrom } from "@/features/audit-api/presentation";
import { createOperationsRepository } from "@/features/operations/repository";
import { businessToday, useRemote } from "@/features/operations/ui";
import { useSalesReport } from "@/features/sales-reports/use-sales-report";
import { dashboardSchema } from "./overview-contracts";
import { useSelectedZones } from "./selected-zones";

// Nhật ký chỉ nhận cỡ trang 15/20/30/50; màn lấy 15 dòng mới nhất và chỉ hiện 10 dòng đầu.
const AUDIT_PAGE_SIZE = "15";

/** Dữ liệu màn Tổng quan: số hôm nay/hôm qua (api/dashboard), bốn cách gộp của báo cáo Bán hàng trong tháng này, và hoạt động gần đây. */
export function useOverviewData(showActivity: boolean) {
  const selection = useSelectedZones();
  // Vùng đang chọn ở thanh trên; chưa chọn hoặc chọn hết nghĩa là toàn hợp tác xã.
  const zoneIds = useMemo(() => selection.status === "ready" && !selection.allSelected ? selection.selectedIds : [], [selection.status, selection.allSelected, selection.selectedIds]);
  const today = businessToday(), from = `${today.slice(0, 8)}01`;
  const month = { from, to: today, zoneIds };
  // api/dashboard chỉ lọc được một vùng; chọn nhiều vùng thì số hôm nay tính toàn hợp tác xã (màn có ghi chú).
  const zoneId = zoneIds.length === 1 ? zoneIds[0] : undefined;
  const repo = useMemo(() => createOperationsRepository("sales-report"), []);
  const dashboard = useRemote(useCallback((signal: AbortSignal) => repo.read("dashboard", { zoneId }, dashboardSchema, signal), [repo, zoneId]));
  const byDay = useSalesReport("sales-report", { ...month, groupBy: "day" });
  const byZone = useSalesReport("sales-report", { ...month, groupBy: "zone" });
  const byProduct = useSalesReport("sales-report", { ...month, groupBy: "product" });
  const byCustomer = useSalesReport("sales-report", { ...month, groupBy: "customer" });
  const activity = useRemote(useCallback((signal: AbortSignal) => showActivity
    ? auditRepository.list({ from: longestAuditFrom(), page: "1", pageSize: AUDIT_PAGE_SIZE }, signal)
    : Promise.resolve({ status: "success" as const, data: null }), [showActivity]));
  return { dashboard, byDay, byZone, byProduct, byCustomer, activity, today, from, multiZone: zoneIds.length > 1, zoneLabel: zoneIds.length ? selection.label : "Toàn hợp tác xã" };
}
