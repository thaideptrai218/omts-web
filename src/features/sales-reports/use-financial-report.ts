"use client";
import { useCallback, useMemo } from "react";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { operationAllowed } from "@/features/operations/permissions";
import { createOperationsRepository, type Query } from "@/features/operations/repository";
import { useMutation, useRemote } from "@/features/operations/ui";
import { financialReport, type FinancialUnit } from "./financial-report-contracts";
import { useReportFilters } from "./use-report-filters";

export const UNIT_OPTIONS = [["month", "Theo tháng"], ["quarter", "Theo quý"], ["year", "Theo năm"]] as const;

/** Bộ lọc báo cáo Tài chính: kỳ (mặc định Năm nay) và đơn vị cột. Dữ liệu thu chi không chia theo vùng nên không có vùng. */
export function useFinancialFilters() {
  return useReportFilters({ unit: "month" as string }, { allowed: { unit: UNIT_OPTIONS.map(([key]) => key) }, defaultPreset: "thisYear" });
}
export type FinancialFilters = ReturnType<typeof useFinancialFilters>;

/** Đọc báo cáo kết quả kinh doanh (api/reports/financial), kèm quyền xem/xuất và xuất Excel theo đúng điều kiện đang xem. */
export function useFinancialReport(query: Readonly<{ from: string; to: string; unit: FinancialUnit }>) {
  const workspace = useApiWorkspace(), exporter = useMutation();
  const repo = useMemo(() => createOperationsRepository("financial-report"), []);
  const key = JSON.stringify(query);
  const params = useMemo<Query>(() => { const value = JSON.parse(key) as typeof query; return { from: value.from || undefined, to: value.to || undefined, unit: value.unit }; }, [key]);
  const report = useRemote(useCallback((signal: AbortSignal) => repo.read("report", params, financialReport, signal), [repo, params]));
  const allowed = (action: string) => operationAllowed("financial-report", workspace.identity, workspace.permissions.functionPermissions, action);
  return {
    report, canView: allowed("View"), canExport: allowed("Export"), exporting: exporter.pending, exportError: exporter.error,
    exportFile: () => { void exporter.run(() => repo.download(params), true); },
  };
}
