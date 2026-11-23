"use client";
import { useCallback, useMemo } from "react";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { operationAllowed } from "@/features/operations/permissions";
import { createOperationsRepository } from "@/features/operations/repository";
import { useMutation, useRemote } from "@/features/operations/ui";
import { endOfDayReport } from "./end-of-day-contracts";
import { toQuery, type EndOfDayFilters } from "./end-of-day-filters-model";
import type { ExportFormat } from "./export-menu";

const AREA = "end-of-day-report";

/**
 * Đọc báo cáo Cuối ngày (api/reports/end-of-day) theo điều kiện đã áp dụng; trả báo cáo (loading/error/data), quyền xem/xuất và hàm tải PDF/Excel
 * theo đúng điều kiện đang xem. `expanded` = xuất kèm dòng chi tiết dưới mỗi sản phẩm (báo cáo Hàng hóa); hướng giấy lấy từ bộ lọc.
 * Đổi kiểu hiển thị hoặc hướng giấy không gọi lại API (không nằm trong query).
 */
export function useEndOfDayReport(filters: EndOfDayFilters) {
  const workspace = useApiWorkspace(), exporter = useMutation();
  const repo = useMemo(() => createOperationsRepository(AREA), []);
  const key = JSON.stringify(toQuery(filters));
  const params = useMemo(() => JSON.parse(key) as ReturnType<typeof toQuery>, [key]);
  const report = useRemote(useCallback((signal: AbortSignal) => repo.read("report", params, endOfDayReport, signal), [repo, params]));
  const allowed = (action: string) => operationAllowed(AREA, workspace.identity, workspace.permissions.functionPermissions, action);
  return {
    report, canView: allowed("View"), canExport: allowed("Export"), exporting: exporter.pending, exportError: exporter.error,
    exportFile: (format: ExportFormat, expanded: boolean) => { void exporter.run(() => repo.download({ ...params, format, orientation: filters.orientation, expanded: expanded ? "true" : "false" }), true); },
  };
}
