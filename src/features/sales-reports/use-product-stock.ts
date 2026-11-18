"use client";
import { useCallback, useMemo } from "react";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { operationAllowed } from "@/features/operations/permissions";
import { createOperationsRepository, type Query } from "@/features/operations/repository";
import { useMutation, useRemote } from "@/features/operations/ui";
import { productStockReport, type ProductStockGroupBy } from "./product-stock-contracts";

export type ProductStockQuery = Readonly<{ from: string; to: string; groupBy: ProductStockGroupBy; productId?: string }>;

/**
 * Đọc báo cáo Xuất nhập tồn (api/reports/product-stock) cho phần "Xuất nhập tồn" của báo cáo Hàng hóa, kèm quyền xem/xuất và xuất Excel theo đúng điều kiện đang xem.
 * Dữ liệu tồn không chia theo vùng nên không có điều kiện vùng.
 */
export function useProductStock(query: ProductStockQuery) {
  const workspace = useApiWorkspace(), exporter = useMutation();
  const repo = useMemo(() => createOperationsRepository("product-report"), []);
  const key = JSON.stringify(query);
  const params = useMemo<Query>(() => {
    const value = JSON.parse(key) as ProductStockQuery;
    return { concern: "stock", from: value.from || undefined, to: value.to || undefined, groupBy: value.groupBy, productIds: value.productId || undefined };
  }, [key]);
  const report = useRemote(useCallback((signal: AbortSignal) => repo.read("report", params, productStockReport, signal), [repo, params]));
  const allowed = (action: string) => operationAllowed("product-report", workspace.identity, workspace.permissions.functionPermissions, action);
  return {
    report, canView: allowed("View"), canExport: allowed("Export"), exporting: exporter.pending, exportError: exporter.error,
    exportFile: () => { void exporter.run(() => repo.download(params), true); },
  };
}
