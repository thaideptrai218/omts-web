"use client";
import { useCallback, useMemo } from "react";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { operationAllowed } from "@/features/operations/permissions";
import { createOperationsRepository, type Query } from "@/features/operations/repository";
import { useMutation, useRemote } from "@/features/operations/ui";
import { endOfDayReport, type EndOfDayMethod } from "./end-of-day-contracts";
import type { ExportFormat } from "./export-menu";

/** Điều kiện báo cáo Cuối ngày. `zoneIds` rỗng = mọi vùng được phép; `method` và `createdBy` rỗng = tất cả. */
export type EndOfDayFilters = Readonly<{ date: string; zoneIds: readonly string[]; method: "" | EndOfDayMethod; createdBy: string }>;

const AREA = "end-of-day-report";

/** Chuyển điều kiện thành query của BFF (danh sách vùng nối bằng dấu phẩy, giá trị rỗng bị bỏ). */
function toQuery(filters: EndOfDayFilters): Query {
  return { date: filters.date || undefined, zoneIds: filters.zoneIds.length ? filters.zoneIds.join(",") : undefined, method: filters.method || undefined, createdBy: filters.createdBy || undefined };
}

/** Đọc báo cáo Cuối ngày (api/reports/end-of-day) của một ngày; trả báo cáo (loading/error/data), quyền xem/xuất và hàm xuất Excel theo đúng điều kiện đang xem. */
export function useEndOfDayReport(filters: EndOfDayFilters) {
  const workspace = useApiWorkspace(), exporter = useMutation();
  const repo = useMemo(() => createOperationsRepository(AREA), []);
  const key = JSON.stringify(filters);
  const params = useMemo(() => toQuery(JSON.parse(key) as EndOfDayFilters), [key]);
  const report = useRemote(useCallback((signal: AbortSignal) => repo.read("report", params, endOfDayReport, signal), [repo, params]));
  const allowed = (action: string) => operationAllowed(AREA, workspace.identity, workspace.permissions.functionPermissions, action);
  return {
    report, canView: allowed("View"), canExport: allowed("Export"), exporting: exporter.pending, exportError: exporter.error,
    exportFile: (format: ExportFormat) => { void exporter.run(() => repo.download({ ...params, format }), true); },
  };
}
