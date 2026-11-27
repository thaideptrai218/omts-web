"use client";
import { useCallback, useMemo } from "react";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import type { ExportFormat } from "@/components/ui/export-menu";
import { operationAllowed } from "@/features/operations/permissions";
import { createOperationsRepository } from "@/features/operations/repository";
import { useMutation, useRemote } from "@/features/operations/ui";
import { laborCostByRaft, raftCycleCosts } from "./labor-costs-contracts";

const AREA = "labor-costs";

/** Điều kiện xem: khoảng ngày (tối đa 1 năm) và các vùng đang chọn ở thanh trên (id cách nhau bằng dấu phẩy); `zoneIds` rỗng = mọi vùng. */
export type LaborCostRange = Readonly<{ from: string; to: string; zoneIds: string }>;

/**
 * Đọc chi phí nhân công theo bè trong khoảng ngày (`GET /api/labor-costs/rafts`); trả dữ liệu, trạng thái tải/lỗi, quyền xem/xuất
 * và `exportFile(format)` tải PDF hoặc Excel đúng khoảng ngày và các vùng đang xem.
 */
export function useLaborCosts(range: LaborCostRange) {
  const workspace = useApiWorkspace(), exporter = useMutation();
  const repo = useMemo(() => createOperationsRepository(AREA), []);
  const { from, to, zoneIds } = range;
  const costs = useRemote(useCallback((signal: AbortSignal) => repo.read("rafts", { from, to, zoneIds: zoneIds || undefined }, laborCostByRaft, signal), [repo, from, to, zoneIds]));
  const allowed = (action: string) => operationAllowed(AREA, workspace.identity, workspace.permissions.functionPermissions, action);
  return {
    costs, canView: allowed("View"), canExport: allowed("Export"), exporting: exporter.pending, exportError: exporter.error,
    exportFile: (format: ExportFormat) => { void exporter.run(() => repo.download({ from, to, zoneIds: zoneIds || undefined, format }), true); },
  };
}

/** Các chu kỳ của một bè kèm chi phí, giờ công, theo loại việc và theo nhân viên (`GET /api/labor-costs/rafts/{id}/cycles`, chỉ cần quyền xem chi phí nhân công). */
export function readRaftCycleCosts(raftId: string, signal: AbortSignal) {
  return createOperationsRepository(AREA).read("raft-cycles", { id: raftId }, raftCycleCosts, signal);
}