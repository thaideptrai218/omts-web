"use client";
import { useCallback, useMemo } from "react";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { operationAllowed } from "@/features/operations/permissions";
import { createOperationsRepository, type Query } from "@/features/operations/repository";
import { useMutation, useRemote } from "@/features/operations/ui";
import { salesInvoiceList, salesReport, type SalesGroupBy, type SalesInvoiceList } from "./contracts";

export type SalesReportArea = "sales-report" | "customer-report" | "product-report";

/** Điều kiện đọc báo cáo bán hàng. `zoneIds` rỗng = mọi vùng được phép; `customerId`/`productId` rỗng = tất cả. */
export type SalesReportQuery = Readonly<{ from: string; to: string; groupBy: SalesGroupBy; zoneIds: readonly string[]; customerId?: string; productId?: string }>;

/** Chuyển điều kiện thành query của BFF (danh sách id nối bằng dấu phẩy, giá trị rỗng bị bỏ). */
export function toSalesQuery(query: SalesReportQuery): Query {
  return {
    from: query.from || undefined, to: query.to || undefined, groupBy: query.groupBy,
    zoneIds: query.zoneIds.length ? query.zoneIds.join(",") : undefined,
    customerIds: query.customerId || undefined, productIds: query.productId || undefined,
  };
}

/**
 * Đọc báo cáo Hiệu quả bán hàng từ backend có sẵn (api/reports/sales-performance) cho màn Bán hàng và tab "Hàng bán theo khách".
 * Trả báo cáo (loading/error/data), quyền xem/xuất và hàm xuất Excel theo đúng điều kiện đang xem. Danh sách hóa đơn của nhóm: `useSalesInvoices`.
 */
export function useSalesReport(area: SalesReportArea, query: SalesReportQuery) {
  const workspace = useApiWorkspace(), exporter = useMutation();
  const repo = useMemo(() => createOperationsRepository(area), [area]);
  const key = JSON.stringify(query);
  const params = useMemo(() => toSalesQuery(JSON.parse(key) as SalesReportQuery), [key]);
  const report = useRemote(useCallback((signal: AbortSignal) => repo.read("report", params, salesReport, signal), [repo, params]));
  const allowed = (action: string) => operationAllowed(area, workspace.identity, workspace.permissions.functionPermissions, action);
  return {
    report, params, canView: allowed("View"), canExport: allowed("Export"), exporting: exporter.pending, exportError: exporter.error,
    exportFile: () => { void exporter.run(() => repo.download(params), true); },
  };
}

/** Hóa đơn của một nhóm (`groupKey` là `key` của nhóm trong báo cáo); chưa chọn nhóm thì không gọi API. */
export function useSalesInvoices(area: SalesReportArea, params: Query, groupKey: string | undefined) {
  const repo = useMemo(() => createOperationsRepository(area), [area]);
  return useRemote(useCallback(async (signal: AbortSignal): Promise<WorkspaceResult<SalesInvoiceList | null>> =>
    groupKey ? repo.read("invoices", { ...params, groupKey }, salesInvoiceList, signal) : { status: "success", data: null }, [repo, params, groupKey]));
}
