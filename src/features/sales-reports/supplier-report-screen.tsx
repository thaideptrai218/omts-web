"use client";
import { Suspense } from "react";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { DebtsScreen } from "@/features/debts-api/debts-screen";
import { ListSkeleton } from "@/features/farming-management/detail-parts";
import { operationAllowed } from "@/features/operations/permissions";
import { ReportChoice } from "./report-filter-rail";
import { SUPPLIER_TAB_LABELS, useSupplierReportFilters, type SupplierTab } from "./supplier-report-filters";
import { SupplierPurchasesTab } from "./supplier-purchases-tab";

/** Báo cáo Nhà cung cấp kiểu KiotViet: "Hàng nhập theo NCC" và "Công nợ" (màn công nợ nhà cung cấp có sẵn). Mỗi tab chỉ hiện khi tài khoản có quyền tương ứng; không có thuế VAT. */
export function SupplierReportScreen() {
  return <Suspense fallback={<ListSkeleton />}><SupplierWorkspace /></Suspense>;
}

function SupplierWorkspace() {
  const workspace = useApiWorkspace(), filters = useSupplierReportFilters();
  const functions = workspace.permissions.functionPermissions;
  const canPurchases = operationAllowed("supplier-report", workspace.identity, functions), canDebts = operationAllowed("supplier-payments", workspace.identity, functions);
  const tab: SupplierTab = filters.applied.extra.tab === "debts" && canDebts || !canPurchases ? "debts" : "purchases";
  const choices = SUPPLIER_TAB_LABELS.filter(([key]) => key === "purchases" ? canPurchases : canDebts);
  // Chỉ hiện nút chuyển khi có từ hai tab; đổi tab áp dụng ngay và giữ trên URL.
  const tabChoice = choices.length > 1 ? <ReportChoice legend="Xem" value={tab} options={choices} onChange={(value) => filters.applyNow({ tab: value as SupplierTab })} /> : null;
  if (!canPurchases && !canDebts) return <p role="alert" className="rounded-card border border-border bg-surface p-6">Bạn chưa có quyền xem báo cáo này. Hãy liên hệ Chủ hợp tác xã để được cấp quyền.</p>;
  if (tab === "purchases") return <SupplierPurchasesTab filters={filters} tabChoice={tabChoice} />;
  return <>{tabChoice && <div className="mb-3">{tabChoice}</div>}<DebtsScreen /></>;
}
