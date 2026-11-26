"use client";
import { useToast } from "@/components/ui/toast-provider";
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
import { createOperationsRepository } from "@/features/operations/repository";
import { raftSchema } from "@/features/farming-api/contracts";
import { RaftCreateDialog } from "./raft-create-dialog";
import type { RaftAccess } from "./raft-detail-panel";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { emptyRaftFilters, filterRafts, readRaftsOfZones, readZoneRafts, sortRafts, type RaftFilters, type RaftSortKey, type ZonedRaftRow } from "./raft-model";
import { RaftTable, raftColumns } from "./raft-table";
import { useRaftListLive } from "./use-raft-list-live";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALL_ZONES = "__all";
const zoneLabelOf = (zone?: ZoneRow) => zone ? `${zone.code} · ${zone.name}` : "";

/** Bè nuôi: the backend lists rafts per zone, so the zone is chosen first (a link may preselect it with `?zoneId=`). */
export function RaftScreen({ helpHref }: { helpHref?: string }) {
  const params = useSearchParams(), id = params.get("recordId") ?? "";
  return !params.get("zoneId") && UUID.test(id) ? <LinkedRaftDirectory key={id} id={id} helpHref={helpHref} /> : <RaftDirectory helpHref={helpHref} />;
}
const linkedRepository = createOperationsRepository("raft-details");
function LinkedRaftDirectory({ id, helpHref }: { id: string; helpHref?: string }) {
  const linked = useStickyRemote(useCallback((signal: AbortSignal) => linkedRepository.read("detail", { id }, raftSchema, signal), [id]));
  if (!linked.data) return linked.error ? <ListStateMessage error={linked.error} onRetry={linked.reload} retryLabel="Tải lại hồ sơ bè" /> : <ListSkeleton />;
  return <RaftDirectory linkedZoneId={linked.data.zone.id} helpHref={helpHref} />;
}
function RaftDirectory({ helpHref, linkedZoneId }: { helpHref?: string; linkedZoneId?: string }) {
  const params = useSearchParams();
  const { identity, permissions } = useApiWorkspace();
  const { remote: zones, zones: offered, zoneId, setChoice } = useZoneChoice();
  // "All chosen zones" lives here, not in the workspace: the workspace is keyed by zone and starts over when a zone is picked.
  const [pickedAll, setPickedAll] = useState<boolean>();
  const all = pickedAll ?? (offered.length > 1 && !params.get("zoneId") && !linkedZoneId);
  const [linkPlaced, setLinkPlaced] = useState(!linkedZoneId);
  if (!linkPlaced && zones.data) { setLinkPlaced(true); setChoice(linkedZoneId!); }
  if (!resourceAllowed("rafts", identity, permissions.functionPermissions)) return <p role="alert" className="rounded-card border border-border bg-surface p-6">Bạn không có quyền xem chức năng này.</p>;
  if (zones.error && !zones.data) return <ListStateMessage error={zones.error} onRetry={zones.reload} retryLabel="Tải lại danh mục vùng" />;
  if (!zones.data) return <ListSkeleton />;
  return <RaftWorkspace key={`${zoneId}:${params.get("recordId") ?? ""}:${params.get("search") ?? ""}`} zones={offered} zoneId={zoneId} onZone={setChoice} all={all} onAll={setPickedAll} helpHref={helpHref} />;
}

function RaftWorkspace({ zones, zoneId, onZone, all, onAll, helpHref }: { zones: readonly ZoneRow[]; zoneId: string; onZone(id: string): void; all: boolean; onAll(all: boolean): void; helpHref?: string }) {
  const { identity, permissions } = useApiWorkspace();
  const functions = permissions.functionPermissions, owner = identity.subjectType === "CooperativeOwner";
  // With two or more zones offered the list opens on all of them; picking one zone in the filter narrows it to that zone.
  const params = useSearchParams();
  const showAll = all && zones.length > 1;
  const canCreate = !showAll && !!zoneId && resourceAllowed("rafts", identity, functions, "Create");
  const accessIn = (zone: string): RaftAccess => ({ edit: resourceAllowed("rafts", identity, functions, "Edit"), photoEdit: owner,
    cycles: operationAllowed("cultivation-cycles", identity, functions, "View", zone), costs: operationAllowed("purchase-receipts", identity, functions, "View", zone),
    logs: operationAllowed("cultivation-cycles", identity, functions, "LogsView", zone), water: operationAllowed("water", identity, functions, "View", zone) });
  const access = accessIn(zoneId);
  const recordId =params.get("recordId") ?? "", linkedId = UUID.test(recordId) ? recordId : undefined;
  const [filters, setFilters] = useState<RaftFilters>({ ...emptyRaftFilters, search: params.get("search") ?? "" }), [sort, setSort] = useState<SortState>({ key: "code", direction: "asc" });
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(10), [expanded, setExpanded] = useState(linkedId), [linkPlaced, setLinkPlaced] = useState(!linkedId);
  const [creating, setCreating] = useState(params.get("create") === "1" && canCreate);
  const guard = useUnsavedGuard(), { notify } = useToast();
  const [storedColumns, storeColumns] = useStoredValue("omts-columns-rafts-v2", raftColumns.filter(column => column.key !== "latitude" && column.key !== "longitude").map(column => column.key).join(","));
  // The zone column exists only while rafts of several zones are listed together.
  const visible = raftColumns.filter(column => column.key === "zone" ? showAll : storedColumns.split(",").includes(column.key)).map(column => column.key);
  const zonesKey = zones.map(zone => zone.id).join(",");
  const list = useStickyRemote(useCallback(async (signal: AbortSignal): Promise<WorkspaceResult<ZonedRaftRow[]>> => {
    if (showAll) return readRaftsOfZones(zones, signal);
    if (!zoneId) return { status: "success", data: [] };
    const zone = zones.find(item => item.id === zoneId), result = await readZoneRafts(zoneId, signal);
    return result.status === "success" ? { status: "success", data: result.data.map(row => ({ ...row, zoneId, zoneLabel: zoneLabelOf(zone) })) } : result;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `zones` is keyed by `zonesKey`
  }, [showAll, zonesKey, zoneId]));
  const rows = useMemo(() => sortRafts(filterRafts(list.data ?? [], filters), sort.key as RaftSortKey, sort.direction), [list.data, filters, sort]);
  if (!linkPlaced && list.data) { setLinkPlaced(true); const index = rows.findIndex(row => row.id === linkedId); if (index >= 0) setPage(Math.floor(index / pageSize) + 1); }
  useEffect(() => {
    if (!linkedId || !list.data) return;
    const timer = setTimeout(() => document.getElementById(`raft-row-${linkedId}`)?.scrollIntoView({ block: "nearest" }), 0);
    return () => clearTimeout(timer);
  }, [linkedId, list.data]);

  const current = Math.min(page, Math.max(1, Math.ceil(rows.length / pageSize))), shown = rows.slice((current - 1) * pageSize, current * pageSize);
  const liveEnabled = (showAll ? zones.some(zone => accessIn(zone.id).cycles) : access.cycles) && visible.some(key => key === "live" || key === "cycle");
  const live = useRaftListLive(shown.map(row => row.id), liveEnabled, list.data);
  const change = (apply: () => void) => void guard.leave(() => { apply(); setPage(1); setExpanded(undefined); });
  const setFilter = <K extends keyof RaftFilters>(key: K, value: RaftFilters[K]) => change(() => setFilters(previous => ({ ...previous, [key]: value })));
  const hasFilter = !!(filters.search || filters.statusId);
  const zoneLabel = zoneLabelOf(zones.find(zone => zone.id === zoneId));
  const rail = <>
    <RailHead canReset={hasFilter || (zones.length > 1 && !showAll)} onReset={() => change(() => { setFilters(emptyRaftFilters); if (zones.length > 1) onAll(true); })} />
    <FilterGroup legend="Vùng nuôi"><SelectBox aria-label="Vùng nuôi" className={styles.railSelect} value={showAll ? ALL_ZONES : zoneId} onChange={event => void guard.leave(() => { const value = event.target.value; onAll(value === ALL_ZONES); setPage(1); setExpanded(undefined); if (value !== ALL_ZONES) onZone(value); })}>
      {zones.length > 1 && <option value={ALL_ZONES}>Tất cả vùng đã chọn</option>}
      {zones.map(zone => <option key={zone.id} value={zone.id}>{zoneLabelOf(zone)}{zone.statusId === 102 ? " (ngừng sử dụng)" : ""}</option>)}</SelectBox></FilterGroup>
    <FilterPills legend="Trạng thái" name="raft-status" value={filters.statusId} options={[["101", "Đang sử dụng"], ["102", "Ngừng sử dụng"]]} onChange={value => setFilter("statusId", value)} />
  </>;
  return <ManagementLayout storageKey="rafts" icon="raft" title="Bè nuôi" filters={rail} filterLabel="Bộ lọc bè nuôi"
    search={<input type="search" aria-label="Tìm bè nuôi" placeholder="Theo mã bè" maxLength={200} value={filters.search} onChange={event => setFilter("search", event.target.value)} />}
    actions={<>
      {canCreate && <Button key="create" type="button" className="w-auto" onClick={() => void guard.leave(() => setCreating(true))}><InterfaceIcon name="add" className="mr-1 size-4" />Thêm bè nuôi</Button>}
      <ColumnPicker columns={raftColumns.filter(column => column.key !== "zone")} visible={visible} onChange={keys => storeColumns(keys.join(","))} /><HelpLink helpHref={helpHref} />
    </>}
    footer={<ManagementPagination page={current} pageSize={pageSize} total={rows.length} unit="bè" disabled={list.loading && !list.data} onPage={next => void guard.leave(() => { setPage(next); setExpanded(undefined); })} onPageSize={size => change(() => setPageSize(size))} />}>
    {guard.dialog}
    <ManagementScroller busy={list.loading}>
      {!zoneId ? <ListStateMessage>Chưa có vùng nuôi nào để xem bè.</ListStateMessage>
        : list.error && !list.data ? <ListStateMessage error={list.error} onRetry={list.reload} retryLabel="Tải lại" />
        : !list.data ? <ListSkeleton />
        : !shown.length ? <ListStateMessage>{hasFilter ? "Không có bè phù hợp bộ lọc." : "Vùng này chưa có bè nuôi."}</ListStateMessage>
        : <RaftTable rows={shown} live={live} visible={visible} sort={sort} onSort={next => change(() => setSort(next))} expandedId={expanded} scopeOf={row => ({ zoneId: row.zoneId, zoneLabel: row.zoneLabel, access: accessIn(row.zoneId) })} liveEnabled={liveEnabled} guard={guard}
          onToggle={id => void guard.leave(() => setExpanded(open => open === id ? undefined : id))} onChanged={() => { list.reload(); notify({ tone: "success", title: "Đã cập nhật bè nuôi." }); }} />}
    </ManagementScroller>
    {creating && <RaftCreateDialog zoneId={zoneId} zoneLabel={zoneLabel} onClose={() => setCreating(false)} onCreated={() => { setCreating(false); notify({ tone: "success", title: "Đã thêm bè nuôi." }); list.reload(); }} />}
  </ManagementLayout>;
}
