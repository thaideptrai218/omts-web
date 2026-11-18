"use client";
import { Suspense } from "react";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { customerDebtAllowed } from "@/features/customer-debts-api/access";
import { ListSkeleton } from "@/features/farming-management/detail-parts";
import { operationAllowed } from "@/features/operations/permissions";
import { CustomerDebtsTab } from "./customer-debts-tab";
import { TAB_LABELS, useCustomerReportFilters, type CustomerTab } from "./customer-report-filters";
import { CustomerSalesTab } from "./customer-sales-tab";
import { ReportChoice } from "./report-filter-rail";

/** Báo cáo Khách hàng kiểu KiotViet: "Hàng bán theo khách" và "Công nợ". Tab Công nợ chỉ hiện khi tài khoản có quyền xem công nợ khách hàng. */
export function CustomerReportScreen() {
  return <Suspense fallback={<ListSkeleton />}><CustomerWorkspace /></Suspense>;
}

function CustomerWorkspace() {
  const workspace = useApiWorkspace(), filters = useCustomerReportFilters();
  const functions = workspace.permissions.functionPermissions;
  const canSales = operationAllowed("customer-report", workspace.identity, functions), canDebts = customerDebtAllowed(workspace.identity, functions);
  const tab: CustomerTab = filters.applied.extra.tab === "debts" && canDebts || !canSales ? "debts" : "sales";
  const choices = TAB_LABELS.filter(([key]) => key === "sales" ? canSales : canDebts);
  // Chỉ hiện nút chuyển khi có từ hai tab; đổi tab áp dụng ngay và giữ trên URL.
  const tabChoice = choices.length > 1 ? <ReportChoice legend="Xem" value={tab} options={choices} onChange={(value) => filters.applyNow({ tab: value as CustomerTab })} /> : null;
  if (!canSales && !canDebts) return <p role="alert" className="rounded-card border border-border bg-surface p-6">Bạn chưa có quyền xem báo cáo này. Hãy liên hệ Chủ hợp tác xã để được cấp quyền.</p>;
  return tab === "debts" ? <CustomerDebtsTab filters={filters} tabChoice={tabChoice} /> : <CustomerSalesTab filters={filters} tabChoice={tabChoice} />;
}
