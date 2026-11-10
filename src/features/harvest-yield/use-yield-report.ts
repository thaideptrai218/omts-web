"use client";
import { useCallback, useMemo, useState } from "react";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { loadOptions } from "@/features/operations/lookups";
import { operationAllowed } from "@/features/operations/permissions";
import { createOperationsRepository } from "@/features/operations/repository";
import { businessToday, useMutation, useRemote } from "@/features/operations/ui";
import { harvestYieldReport } from "./contracts";
import { defaultFilters, defaultSort, filterProblem, nextSort, sortGroups, toQuery, type Filters, type SortKey } from "./yield-logic";

const repo = createOperationsRepository("harvest-yield");
const loadZones = (signal: AbortSignal) => loadOptions("zones", signal);
export type ZoneOption = { id: string; label: string };

/**
 * Trạng thái màn Sản lượng nuôi. Bộ lọc nhập ở `draft`, chỉ khi bấm "Xem báo cáo" mới thành `applied` và gọi API,
 * nên ngày đang gõ dở không bắn yêu cầu. Xuất Excel luôn dùng bộ lọc đã áp dụng (đúng với bảng đang xem).
 */
export function useYieldReport() {
  const workspace = useApiWorkspace(), exporter = useMutation();
  const [draft, setDraft] = useState<Filters>(() => defaultFilters(businessToday()));
  const [applied, setApplied] = useState<Filters>(draft);
  const [sort, setSort] = useState(defaultSort), [page, setPage] = useState(1);

  const zones = useRemote(loadZones);
  const allowed = (action: string) => operationAllowed("harvest-yield", workspace.identity, workspace.permissions.functionPermissions, action);
  const zoneOptions = useMemo<ZoneOption[]>(() => (zones.data ?? [])
    .filter((zone) => operationAllowed("harvest-yield", workspace.identity, workspace.permissions.functionPermissions, "View", zone.id))
    .map((zone) => ({ id: zone.id, label: String(zone.name ?? zone.code ?? zone.id) })), [zones.data, workspace.identity, workspace.permissions.functionPermissions]);

  const query = useMemo(() => toQuery(applied, zoneOptions.length), [applied, zoneOptions.length]);
  const report = useRemote(useCallback((signal: AbortSignal) => repo.read("list", query, harvestYieldReport, signal), [query]));
  const groups = useMemo(() => sortGroups(report.data?.groups ?? [], sort), [report.data, sort]);

  return {
    draft, applied, problem: filterProblem(draft), zones, zoneOptions, report, groups, sort, page,
    canView: allowed("View"), canExport: allowed("Export"), exporting: exporter.pending, exportError: exporter.error,
    changeDraft: (patch: Partial<Filters>) => setDraft((current) => ({ ...current, ...patch })),
    apply: () => { if (filterProblem(draft)) return; setPage(1); setApplied(draft); },
    reset: () => { const fresh = defaultFilters(businessToday()); setDraft(fresh); setApplied(fresh); setPage(1); },
    changeSort: (key: SortKey) => { setSort((current) => nextSort(current, key)); setPage(1); },
    setPage,
    exportFile: () => { void exporter.run(() => repo.download(query), true); },
  };
}
