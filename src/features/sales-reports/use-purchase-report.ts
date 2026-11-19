"use client";
import { useCallback, useMemo } from "react";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { loadOptions } from "@/features/operations/lookups";
import { operationAllowed } from "@/features/operations/permissions";
import { createOperationsRepository, type Query } from "@/features/operations/repository";
import { useMutation, useRemote } from "@/features/operations/ui";
import { purchaseLines, purchaseReport, type PurchaseLines } from "./supplier-report-contracts";
import type { EntityOption } from "./report-entity-filters";

export type PurchaseReportQuery = Readonly<{ from: string; to: string; groupBy: string; kind: string; supplierId?: string }>;

/**
 * Đọc báo cáo hàng nhập theo nhà cung cấp (api/reports/purchases): báo cáo, quyền xem/xuất và xuất Excel theo đúng điều kiện đang xem.
 * `params` dùng lại để đọc chứng từ của một nhóm bằng `usePurchaseLines`.
 */
export function usePurchaseReport(query: PurchaseReportQuery) {
  const workspace = useApiWorkspace(), exporter = useMutation();
  const repo = useMemo(() => createOperationsRepository("supplier-report"), []);
  const key = JSON.stringify(query);
  const params = useMemo<Query>(() => {
    const value = JSON.parse(key) as PurchaseReportQuery;
    return { from: value.from || undefined, to: value.to || undefined, groupBy: value.groupBy, kind: value.kind, supplierIds: value.supplierId || undefined };
  }, [key]);
  const report = useRemote(useCallback((signal: AbortSignal) => repo.read("report", params, purchaseReport, signal), [repo, params]));
  const allowed = (action: string) => operationAllowed("supplier-report", workspace.identity, workspace.permissions.functionPermissions, action);
  return {
    report, params, canView: allowed("View"), canExport: allowed("Export"), exporting: exporter.pending, exportError: exporter.error,
    exportFile: () => { void exporter.run(() => repo.download(params), true); },
  };
}

/** Phiếu nhập và phiếu trả của một nhóm (`groupKey` là `key` của nhóm trong báo cáo); chưa chọn nhóm thì không gọi API. */
export function usePurchaseLines(params: Query, groupKey: string | undefined) {
  const repo = useMemo(() => createOperationsRepository("supplier-report"), []);
  return useRemote(useCallback(async (signal: AbortSignal): Promise<WorkspaceResult<PurchaseLines | null>> =>
    groupKey ? repo.read("lines", { ...params, groupKey }, purchaseLines, signal) : { status: "success", data: null }, [repo, params, groupKey]));
}

/** Nhà cung cấp để chọn trong bộ lọc; người không đọc được danh sách nhà cung cấp thấy thông báo nhỏ và vẫn xem được báo cáo. */
export function useSupplierOptions() {
  const remote = useRemote(useCallback((signal: AbortSignal) => loadOptions("suppliers", signal), []));
  const options = useMemo<EntityOption[]>(() => (remote.data ?? []).map((row) => ({ id: row.id, label: String(row.name ?? row.code ?? row.id) }))
    .sort((a, b) => a.label.localeCompare(b.label, "vi", { numeric: true })), [remote.data]);
  return { options, loading: remote.loading, error: remote.error, reload: remote.reload };
}
