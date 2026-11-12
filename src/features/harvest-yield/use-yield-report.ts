"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/toast-provider";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { loadOptions } from "@/features/operations/lookups";
import { operationAllowed } from "@/features/operations/permissions";
import { createOperationsRepository } from "@/features/operations/repository";
import { businessToday, useMutation, useRemote } from "@/features/operations/ui";
import { harvestYieldReport, type HarvestYieldReport } from "./contracts";
import { defaultFilters, defaultSort, filterProblem, linkedYieldFilters, nextSort, toQuery, type Filters, type SortKey } from "./yield-logic";
import { filterCycleGroups, matchesLinked, regroup, sortRows, type LinkedScope, type StatusKey } from "./yield-rows";
import { insightsOf, kpisOf, previousRange } from "./yield-summary-model";

const repo = createOperationsRepository("harvest-yield");
const loadZones = (signal: AbortSignal) => loadOptions("zones", signal);
const IN_USE_RAFT = "101";
export type ZoneOption = { id: string; label: string };
type Scope = { raftId: string; statuses: StatusKey[] };
const noScope: Scope = { raftId: "", statuses: [] };

/**
 * Trạng thái màn Sản lượng nuôi. Bộ lọc kỳ/vùng nhập ở `draft`, chỉ khi bấm "Xem báo cáo" mới thành `applied` và gọi API.
 * Báo cáo luôn đọc ở mức chu kỳ (nhỏ nhất); cách gộp, bè và trạng thái đổi ngay ở trình duyệt, không gọi lại API.
 * Xuất file luôn dùng bộ lọc đã áp dụng (đúng với bảng đang xem).
 */
export function useYieldReport(linked: LinkedScope & Parameters<typeof linkedYieldFilters>[1] = {}) {
  const workspace = useApiWorkspace(), exporter = useMutation();
  const { notify } = useToast();
  useEffect(() => { if (exporter.error) notify({ tone: "danger", title: "Chưa xuất được báo cáo sản lượng nuôi.", description: exporter.error }); }, [exporter.error, notify]);
  const [draft, setDraft] = useState<Filters>(() => linkedYieldFilters(businessToday(), linked));
  const [applied, setApplied] = useState<Filters>(draft);
  const [sort, setSort] = useState(defaultSort), [page, setPage] = useState(1), [scope, setScope] = useState<Scope>(noScope);

  const zones = useRemote(loadZones);
  const allowed = (action: string) => operationAllowed("harvest-yield", workspace.identity, workspace.permissions.functionPermissions, action);
  const zoneOptions = useMemo<ZoneOption[]>(() => (zones.data ?? [])
    .filter((zone) => operationAllowed("harvest-yield", workspace.identity, workspace.permissions.functionPermissions, "View", zone.id))
    .map((zone) => ({ id: zone.id, label: String(zone.name ?? zone.code ?? zone.id) })), [zones.data, workspace.identity, workspace.permissions.functionPermissions]);

  const zoneKey = applied.zoneIds.join(","), zoneIds = useMemo(() => zoneKey ? zoneKey.split(",") : [], [zoneKey]);
  const exportQuery = useMemo(() => toQuery(applied, zoneOptions.length), [applied, zoneOptions.length]);
  // Cách gộp không nằm trong truy vấn đọc: đổi cách gộp không làm tải lại.
  const readQuery = useMemo(() => toQuery({ from: applied.from, to: applied.to, groupBy: "Cycle", zoneIds }, zoneOptions.length), [applied.from, applied.to, zoneIds, zoneOptions.length]);
  const report = useRemote(useCallback((signal: AbortSignal) => repo.read("list", readQuery, harvestYieldReport, signal), [readQuery]));

  const range = useMemo(() => previousRange(readQuery.from ?? "", readQuery.to ?? ""), [readQuery]);
  const previous = useRemote(useCallback(async (signal: AbortSignal): Promise<WorkspaceResult<HarvestYieldReport | null>> =>
    range ? repo.read("list", { ...readQuery, ...range }, harvestYieldReport, signal) : { status: "success", data: null }, [range, readQuery]));

  const linkedGroups = useMemo(() => (report.data?.groups ?? []).filter((group) => matchesLinked(group, linked)), [report.data, linked]);
  const filtered = useMemo(() => filterCycleGroups(linkedGroups, scope), [linkedGroups, scope]);
  const rows = useMemo(() => sortRows(regroup(filtered, applied.groupBy), sort.key, sort.dir), [filtered, applied.groupBy, sort]);
  const previousGroups = useMemo(() => previous.data ? filterCycleGroups(previous.data.groups.filter((group) => matchesLinked(group, linked)), scope) : undefined, [previous.data, linked, scope]);
  const raftOptions = useMemo(() => [...new Map(linkedGroups.filter((group) => group.raftId).map((group) => [group.raftId!, group.raftCode ?? group.label])).entries()]
    .map(([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label, "vi", { numeric: true })), [linkedGroups]);

  // Danh sách bè đang dùng chỉ để tìm bè chưa thu hoạch trong kỳ; lỗi tải thì thẻ đó báo chưa có số liệu thay vì chặn báo cáo.
  const raftZoneIds = useMemo(() => (zoneIds.length ? zoneIds : zoneOptions.map((zone) => zone.id)), [zoneIds, zoneOptions]);
  const rafts = useRemote(useCallback(async (signal: AbortSignal): Promise<WorkspaceResult<{ id: string; code: string }[]>> => {
    const lists = [];
    for (const zoneId of raftZoneIds) {
      const result = await loadOptions("rafts", signal, { zoneId, statusId: IN_USE_RAFT });
      if (result.status !== "success") return result;
      lists.push(...result.data.map((raft) => ({ id: raft.id, code: String(raft.code ?? raft.id) })));
    }
    return { status: "success", data: lists };
  }, [raftZoneIds]));
  const allRafts = zones.loading || rafts.loading || rafts.error ? undefined : rafts.data;
  const insights = useMemo(() => insightsOf(filtered, scope.raftId ? undefined : allRafts), [filtered, allRafts, scope.raftId]);

  return {
    draft, applied, problem: filterProblem(draft), zones, zoneOptions, report, rows, filtered, sort, page, scope, raftOptions, insights,
    kpis: useMemo(() => kpisOf(filtered), [filtered]),
    previousKpis: previous.loading ? undefined : previousGroups ? kpisOf(previousGroups) : null,
    canView: allowed("View"), canExport: allowed("Export"), exporting: exporter.pending, exportError: exporter.error,
    changeDraft: (patch: Partial<Filters>) => {
      setDraft((current) => ({ ...current, ...patch }));
      // Chỉ đổi cách gộp thì không cần gọi API: áp dụng ngay.
      if (Object.keys(patch).length === 1 && patch.groupBy) { setApplied((current) => ({ ...current, groupBy: patch.groupBy! })); setPage(1); }
    },
    changeScope: (patch: Partial<Scope>) => { setScope((current) => ({ ...current, ...patch })); setPage(1); },
    apply: () => { if (filterProblem(draft)) return; setPage(1); setApplied(draft); },
    reset: () => { const fresh = defaultFilters(businessToday()); setDraft(fresh); setApplied(fresh); setScope(noScope); setPage(1); },
    changeSort: (key: SortKey) => { setSort((current) => nextSort(current, key)); setPage(1); },
    setPage,
    exportFile: () => { void exporter.run(() => repo.download(exportQuery), true); },
  };
}
