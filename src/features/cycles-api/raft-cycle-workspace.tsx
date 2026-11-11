"use client";
import { SelectBox } from "@/components/ui/select-box";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { FilterGroup, FilterPills, HelpLink, ManagementLayout } from "@/components/ui/management-screen/management-layout";
import type { InterfaceIconName } from "@/components/ui/interface-icon";
import { ColumnPicker, ListStateMessage, ManagementPagination, ManagementScroller, type SortState } from "@/components/ui/management-screen/management-table";
import { useStoredValue } from "@/components/ui/management-screen/use-stored-value";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { ListSkeleton, RailHead } from "@/features/farming-management/detail-parts";
import { useStickyRemote } from "@/features/farming-management/use-sticky-remote";
import { useUnsavedGuard, type UnsavedGuard } from "@/features/farming-management/use-unsaved-guard";
import { useZoneChoice } from "@/features/farming-management/use-zone-choice";
import { operationAllowed, type OperationArea } from "@/features/operations/permissions";
import type { ZoneRow } from "@/features/zones-api/zone-model";
import styles from "@/features/farming-management/farming-management.module.css";
import { emptyCycleFilters, filterCycleRows, sortCycleRows, type CycleFilters, type CycleRow, type CycleSortKey } from "./cycle-model";
import { CycleTable, cycleColumns } from "./cycle-table";
import { zoneCycles } from "./contracts";
import { readCycles } from "./repository";

export type RaftRowContext = { row: CycleRow; zoneId: string; guard: UnsavedGuard; refresh(notice: string): void };
type Props = { storageKey: string; icon: InterfaceIconName; title: string; area: OperationArea; helpHref?: string; renderDetail(context: RaftRowContext): ReactNode;
  /** Reads the rafts of a zone with their latest cycle; must be a stable function. Defaults to the cycle API read. */
  loadRows?(zoneId: string, signal: AbortSignal): Promise<WorkspaceResult<CycleRow[]>> };
const readZoneRows = (zoneId: string, signal: AbortSignal) => readCycles({ action: "zone", zoneId }, zoneCycles, signal);
const zoneLabelOf = (zone: ZoneRow) => `${zone.code} · ${zone.name}`;

/**
 * Management frame shared by the screens that work per raft of one zone (cycles, seeding, material use, harvest): the zone is
 * chosen in the filter column (`?zoneId=` preselects it, `?raftId=` opens a raft), every raft is a row, and the row opens its record in place.
 */
export function RaftCycleWorkspace(props: Props) {
  const { identity, permissions } = useApiWorkspace();
  const { remote: zones, zones: offered, zoneId, setChoice } = useZoneChoice(zone => operationAllowed(props.area, identity, permissions.functionPermissions, "View", zone.id));
  if (zones.error && !zones.data) return <ListStateMessage error={zones.error} onRetry={zones.reload} retryLabel="Tải lại danh mục vùng" />;
  if (!zones.data) return <ListSkeleton />;
  return <ZoneRaftList key={zoneId} {...props} zones={offered} zoneId={zoneId} onZone={setChoice} />;
}

function ZoneRaftList({ storageKey, icon, title, helpHref, renderDetail, loadRows = readZoneRows, zones, zoneId, onZone }: Props & { zones: readonly ZoneRow[]; zoneId: string; onZone(id: string): void }) {
  const params = useSearchParams(), raftId = params?.get("raftId") ?? undefined;
  const [filters, setFilters] = useState<CycleFilters>(emptyCycleFilters), [sort, setSort] = useState<SortState>({ key: "raft", direction: "asc" });
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(15), [expanded, setExpanded] = useState(raftId), [linkPlaced, setLinkPlaced] = useState(!raftId);
  const [notice, setNotice] = useState<string>();
  const guard = useUnsavedGuard();
  const [storedColumns, storeColumns] = useStoredValue(`omts-columns-${storageKey}`, cycleColumns.map(column => column.key).join(","));
  const visible = cycleColumns.filter(column => storedColumns.split(",").includes(column.key)).map(column => column.key);
  const list = useStickyRemote(useCallback((signal: AbortSignal) => zoneId ? loadRows(zoneId, signal) : Promise.resolve({ status: "success" as const, data: [] }), [zoneId, loadRows]));
  const rows = useMemo(() => sortCycleRows(filterCycleRows(list.data ?? [], filters), sort.key as CycleSortKey, sort.direction), [list.data, filters, sort]);
  // A link from another screen opens its raft on whichever page it sits on, once the list is known.
  if (!linkPlaced && list.data) { setLinkPlaced(true); const index = rows.findIndex(row => row.raftId === raftId); if (index >= 0) setPage(Math.floor(index / pageSize) + 1); }
  useEffect(() => {
    if (!raftId || !list.data) return;
    const timer = setTimeout(() => document.getElementById(`cycle-row-${raftId}`)?.scrollIntoView({ block: "nearest" }), 0);
    return () => clearTimeout(timer);
  }, [raftId, list.data]);

  const current = Math.min(page, Math.max(1, Math.ceil(rows.length / pageSize))), shown = rows.slice((current - 1) * pageSize, current * pageSize);
  const change = (apply: () => void) => void guard.leave(() => { apply(); setPage(1); setExpanded(undefined); });
  const setFilter = <K extends keyof CycleFilters>(key: K, value: CycleFilters[K]) => change(() => setFilters(previous => ({ ...previous, [key]: value })));
  const hasFilter = !!(filters.search || filters.state || filters.raftStatus);
  const refresh = (message: string) => { list.reload(); setNotice(message); };
  const rail = <>
    <RailHead canReset={hasFilter} onReset={() => change(() => setFilters(emptyCycleFilters))} />
    <FilterGroup legend="Vùng nuôi"><SelectBox aria-label="Vùng nuôi" className={styles.railSelect} value={zoneId} onChange={event => void guard.leave(() => onZone(event.target.value))}>
      {zones.map(zone => <option key={zone.id} value={zone.id}>{zoneLabelOf(zone)}</option>)}</SelectBox></FilterGroup>
    <FilterPills legend="Chu kỳ gần nhất" name={`${storageKey}-cycle-state`} value={filters.state} options={[["open", "Đang mở"], ["closed", "Đã đóng"], ["none", "Chưa có chu kỳ"]]} onChange={value => setFilter("state", value)} />
    <FilterPills legend="Trạng thái bè" name={`${storageKey}-raft-status`} value={filters.raftStatus} options={[["101", "Đang sử dụng"], ["102", "Ngừng sử dụng"]]} onChange={value => setFilter("raftStatus", value)} />
  </>;
  return <ManagementLayout storageKey={storageKey} icon={icon} title={title} filters={rail} filterLabel={`Bộ lọc ${title.toLocaleLowerCase("vi")}`}
    search={<input type="search" aria-label="Tìm bè nuôi" placeholder="Theo mã bè" maxLength={200} value={filters.search} onChange={event => setFilter("search", event.target.value)} />}
    actions={<><ColumnPicker columns={cycleColumns} visible={visible} onChange={keys => storeColumns(keys.join(","))} /><HelpLink helpHref={helpHref} /></>}
    footer={<ManagementPagination page={current} pageSize={pageSize} total={rows.length} unit="bè" disabled={list.loading && !list.data} onPage={next => void guard.leave(() => { setPage(next); setExpanded(undefined); })} onPageSize={size => change(() => setPageSize(size))} />}>
    {guard.dialog}
    {notice && <div className={styles.feedback}><p role="status">{notice}</p></div>}
    <ManagementScroller busy={list.loading}>
      {!zoneId ? <ListStateMessage>Chưa có vùng nuôi nào được phép xem.</ListStateMessage>
        : list.error && !list.data ? <ListStateMessage error={list.error} onRetry={list.reload} retryLabel="Tải lại" />
        : !list.data ? <ListSkeleton />
        : !shown.length ? <ListStateMessage>{hasFilter ? "Không có bè phù hợp bộ lọc." : "Vùng này chưa có bè nuôi."}</ListStateMessage>
        : <CycleTable rows={shown} visible={visible} sort={sort} onSort={next => change(() => setSort(next))} expandedId={expanded} onToggle={id => void guard.leave(() => setExpanded(open => open === id ? undefined : id))}
          renderDetail={row => renderDetail({ row, zoneId, guard, refresh })} />}
    </ManagementScroller>
  </ManagementLayout>;
}
