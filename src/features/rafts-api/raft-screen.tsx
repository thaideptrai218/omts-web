"use client";
import { SelectBox } from "@/components/ui/select-box";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { FilterGroup, FilterPills, HelpLink, ManagementLayout } from "@/components/ui/management-screen/management-layout";
import { ColumnPicker, ListStateMessage, ManagementPagination, ManagementScroller, type SortState } from "@/components/ui/management-screen/management-table";
import { useStoredValue } from "@/components/ui/management-screen/use-stored-value";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { resourceAllowed } from "@/features/api-workspace/resources";
import { ListSkeleton, RailHead } from "@/features/farming-management/detail-parts";
import { useStickyRemote } from "@/features/farming-management/use-sticky-remote";
import { useZoneChoice } from "@/features/farming-management/use-zone-choice";
import { useUnsavedGuard } from "@/features/farming-management/use-unsaved-guard";
import { operationAllowed } from "@/features/operations/permissions";
import type { ZoneRow } from "@/features/zones-api/zone-model";
import styles from "@/features/farming-management/farming-management.module.css";
import { RaftCreateDialog } from "./raft-create-dialog";
import type { RaftAccess } from "./raft-detail-panel";
import { emptyRaftFilters, filterRafts, readZoneRafts, sortRafts, type RaftFilters, type RaftSortKey } from "./raft-model";
import { RaftTable, raftColumns } from "./raft-table";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const zoneLabelOf = (zone?: ZoneRow) => zone ? `${zone.code} · ${zone.name}` : "";

/** Bè nuôi: the backend lists rafts per zone, so the zone is chosen first (a link may preselect it with `?zoneId=`). */
export function RaftScreen({ helpHref }: { helpHref?: string }) {
  const { identity, permissions } = useApiWorkspace();
  const { remote: zones, zones: offered, zoneId, setChoice } = useZoneChoice();
  if (!resourceAllowed("rafts", identity, permissions.functionPermissions)) return <p role="alert" className="rounded-card border border-border bg-surface p-6">Bạn không có quyền xem chức năng này.</p>;
  if (zones.error && !zones.data) return <ListStateMessage error={zones.error} onRetry={zones.reload} retryLabel="Tải lại danh mục vùng" />;
  if (!zones.data) return <ListSkeleton />;
  return <RaftWorkspace key={zoneId} zones={offered} zoneId={zoneId} onZone={setChoice} helpHref={helpHref} />;
}

function RaftWorkspace({ zones, zoneId, onZone, helpHref }: { zones: readonly ZoneRow[]; zoneId: string; onZone(id: string): void; helpHref?: string }) {
  const { identity, permissions } = useApiWorkspace();
  const functions = permissions.functionPermissions, owner = identity.subjectType === "CooperativeOwner";
  const canCreate = !!zoneId && resourceAllowed("rafts", identity, functions, "Create");
  const access: RaftAccess = { edit: resourceAllowed("rafts", identity, functions, "Edit"), photoEdit: owner,
    cycles: operationAllowed("cultivation-cycles", identity, functions, "View", zoneId), costs: operationAllowed("purchase-receipts", identity, functions, "View", zoneId) };
  const params = useSearchParams(), recordId = params.get("recordId") ?? "", linkedId = UUID.test(recordId) ? recordId : undefined;
  const [filters, setFilters] = useState<RaftFilters>(emptyRaftFilters), [sort, setSort] = useState<SortState>({ key: "code", direction: "asc" });
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(15), [expanded, setExpanded] = useState(linkedId), [linkPlaced, setLinkPlaced] = useState(!linkedId);
  const [creating, setCreating] = useState(false), [notice, setNotice] = useState<string>();
  const guard = useUnsavedGuard();
  const [storedColumns, storeColumns] = useStoredValue("omts-columns-rafts", raftColumns.map(column => column.key).join(","));
  const visible = raftColumns.filter(column => storedColumns.split(",").includes(column.key)).map(column => column.key);
  const list = useStickyRemote(useCallback((signal: AbortSignal) => zoneId ? readZoneRafts(zoneId, signal) : Promise.resolve({ status: "success" as const, data: [] }), [zoneId]));
  const rows = useMemo(() => sortRafts(filterRafts(list.data ?? [], filters), sort.key as RaftSortKey, sort.direction), [list.data, filters, sort]);
  if (!linkPlaced && list.data) { setLinkPlaced(true); const index = rows.findIndex(row => row.id === linkedId); if (index >= 0) setPage(Math.floor(index / pageSize) + 1); }
  useEffect(() => {
    if (!linkedId || !list.data) return;
    const timer = setTimeout(() => document.getElementById(`raft-row-${linkedId}`)?.scrollIntoView({ block: "nearest" }), 0);
    return () => clearTimeout(timer);
  }, [linkedId, list.data]);

  const current = Math.min(page, Math.max(1, Math.ceil(rows.length / pageSize))), shown = rows.slice((current - 1) * pageSize, current * pageSize);
  const change = (apply: () => void) => void guard.leave(() => { apply(); setPage(1); setExpanded(undefined); });
  const setFilter = <K extends keyof RaftFilters>(key: K, value: RaftFilters[K]) => change(() => setFilters(previous => ({ ...previous, [key]: value })));
  const hasFilter = !!(filters.search || filters.statusId);
  const zoneLabel = zoneLabelOf(zones.find(zone => zone.id === zoneId));
  const rail = <>
    <RailHead canReset={hasFilter} onReset={() => change(() => setFilters(emptyRaftFilters))} />
    <FilterGroup legend="Vùng nuôi"><SelectBox aria-label="Vùng nuôi" className={styles.railSelect} value={zoneId} onChange={event => void guard.leave(() => onZone(event.target.value))}>
      {zones.map(zone => <option key={zone.id} value={zone.id}>{zoneLabelOf(zone)}{zone.statusId === 102 ? " (ngừng sử dụng)" : ""}</option>)}</SelectBox></FilterGroup>
    <FilterPills legend="Trạng thái" name="raft-status" value={filters.statusId} options={[["101", "Đang sử dụng"], ["102", "Ngừng sử dụng"]]} onChange={value => setFilter("statusId", value)} />
  </>;
  return <ManagementLayout storageKey="rafts" icon="raft" title="Bè nuôi" filters={rail} filterLabel="Bộ lọc bè nuôi"
    search={<input type="search" aria-label="Tìm bè nuôi" placeholder="Theo mã bè" maxLength={200} value={filters.search} onChange={event => setFilter("search", event.target.value)} />}
    actions={<>
      {canCreate && <Button key="create" className="w-auto" onClick={() => void guard.leave(() => setCreating(true))}><InterfaceIcon name="add" className="mr-1 size-4" />Thêm bè nuôi</Button>}
      <ColumnPicker columns={raftColumns} visible={visible} onChange={keys => storeColumns(keys.join(","))} /><HelpLink helpHref={helpHref} />
    </>}
    footer={<ManagementPagination page={current} pageSize={pageSize} total={rows.length} unit="bè" disabled={list.loading && !list.data} onPage={next => void guard.leave(() => { setPage(next); setExpanded(undefined); })} onPageSize={size => change(() => setPageSize(size))} />}>
    {guard.dialog}
    {notice && <div className={styles.feedback}><p role="status">{notice}</p></div>}
    <ManagementScroller busy={list.loading}>
      {!zoneId ? <ListStateMessage>Chưa có vùng nuôi nào để xem bè.</ListStateMessage>
        : list.error && !list.data ? <ListStateMessage error={list.error} onRetry={list.reload} retryLabel="Tải lại" />
        : !list.data ? <ListSkeleton />
        : !shown.length ? <ListStateMessage>{hasFilter ? "Không có bè phù hợp bộ lọc." : "Vùng này chưa có bè nuôi."}</ListStateMessage>
        : <RaftTable rows={shown} visible={visible} sort={sort} onSort={next => change(() => setSort(next))} expandedId={expanded} zoneId={zoneId} zoneLabel={zoneLabel} access={access} guard={guard}
          onToggle={id => void guard.leave(() => setExpanded(open => open === id ? undefined : id))} onChanged={() => { list.reload(); setNotice("Đã cập nhật bè nuôi."); }} />}
    </ManagementScroller>
    {creating && <RaftCreateDialog zoneId={zoneId} zoneLabel={zoneLabel} onClose={() => setCreating(false)} onCreated={() => { setCreating(false); setNotice("Đã thêm bè nuôi."); list.reload(); }} />}
  </ManagementLayout>;
}
