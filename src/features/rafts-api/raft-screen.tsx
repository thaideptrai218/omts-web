"use client";
import { useToast } from "@/components/ui/toast-provider";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { FilterPills, HelpLink, ManagementLayout } from "@/components/ui/management-screen/management-layout";
import { ColumnPicker, ListStateMessage, ManagementPagination, ManagementScroller, type SortState } from "@/components/ui/management-screen/management-table";
import { useStoredValue } from "@/components/ui/management-screen/use-stored-value";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { cycleAccessFor } from "@/features/cycles-api/cycle-access";
import { resourceAllowed } from "@/features/api-workspace/resources";
import { ListSkeleton, RailHead } from "@/features/farming-management/detail-parts";
import { useStickyRemote } from "@/features/farming-management/use-sticky-remote";
import { useZoneChoice } from "@/features/farming-management/use-zone-choice";
import { PinnedZoneField, useLinkedZoneSettled, usePinnedZone } from "@/features/farming-management/header-linked-zone";
import { useZoneFilter, ZoneFilterField, type ZoneFilter } from "@/features/api-workspace/zone-filter";
import { useUnsavedGuard } from "@/features/farming-management/use-unsaved-guard";
import { operationAllowed } from "@/features/operations/permissions";
import { DISCONTINUED, type ZoneRow } from "@/features/zones-api/zone-model";
import styles from "@/features/farming-management/farming-management.module.css";
import { createOperationsRepository } from "@/features/operations/repository";
import { raftSchema } from "@/features/farming-api/contracts";
import { RaftCreateDialog } from "./raft-create-dialog";
import type { RaftAccess } from "./raft-detail-panel";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { emptyRaftFilters, filterRafts, readRaftsOfZones, readZoneRafts, sortRafts, type RaftFilters, type RaftSortKey, type ZonedRaftRow } from "./raft-model";
import { RaftTable, raftColumns } from "./raft-table";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const zoneLabelOf = (zone?: ZoneRow) => zone ? `${zone.code} · ${zone.name}` : "";

/** Bè nuôi: the backend lists rafts per zone, so the rafts of every zone chosen in the header are read together (a link may narrow the header with `?zoneId=`). */
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
  // The header zone chip is the zone filter (two-way); the zone choice supplies the zone rows and the discontinued zone a link may name.
  const filter = useZoneFilter(), settled = useLinkedZoneSettled(filter, params.get("zoneId") || linkedZoneId);
  const { remote: zones, zones: offered, zoneId, setChoice, readOnly } = useZoneChoice();
  const { pinnedId, release } = usePinnedZone(filter, readOnly ? zoneId : undefined);
  // A link by raft id names the raft's zone: it narrows the header once the zones are read.
  const linkApplied = useRef(!linkedZoneId);
  useEffect(() => {
    if (linkApplied.current || !zones.data) return;
    linkApplied.current = true; setChoice(linkedZoneId!);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once, when the zones arrive; `setChoice` is a new function every render
  }, [zones.data]);
  // Until the raft's zone is the chosen one the list would open on the previous selection first.
  const placing = !!linkedZoneId && zoneId !== linkedZoneId && filter.zones.some(zone => zone.id === linkedZoneId);
  if (!resourceAllowed("rafts", identity, permissions.functionPermissions)) return <p role="alert" className="rounded-card border border-border bg-surface p-6">Bạn không có quyền xem chức năng này.</p>;
  if (zones.error && !zones.data) return <ListStateMessage error={zones.error} onRetry={zones.reload} retryLabel="Tải lại danh mục vùng" />;
  if (!zones.data || !settled || placing) return <ListSkeleton />;
  return <RaftWorkspace key={`${params.get("zoneId") ?? ""}:${params.get("recordId") ?? ""}:${params.get("search") ?? ""}:${params.get("tab") ?? ""}`} zones={offered} filter={filter} pinnedId={pinnedId} onRelease={release} helpHref={helpHref} />;
}

function RaftWorkspace({ zones: offered, filter, pinnedId, onRelease, helpHref }: { zones: readonly ZoneRow[]; filter: ZoneFilter; pinnedId?: string; onRelease(): void; helpHref?: string }) {
  const { identity, permissions } = useApiWorkspace();
  const functions = permissions.functionPermissions, owner = identity.subjectType === "CooperativeOwner";
  // A discontinued zone is shown only when a link opened it: its rafts are read-only and it never joins the header zones.
  const frozenZone = (id: string) => offered.find(zone => zone.id === id)?.statusId === DISCONTINUED;
  const pinned = pinnedId ? offered.find(zone => zone.id === pinnedId) : undefined;
  // The rafts of every zone the header chose (or of the discontinued zone a link opened); a row says its zone while more than one is listed.
  const zones = pinned ? [pinned] : offered.filter(zone => zone.statusId !== DISCONTINUED), showAll = zones.length > 1, zoneId = zones.length === 1 ? zones[0].id : "";
  const params = useSearchParams();
  const canCreate = !!zoneId && !frozenZone(zoneId) && resourceAllowed("rafts", identity, functions, "Create");
  const accessIn = (zone: string): RaftAccess => ({ edit: !frozenZone(zone) && resourceAllowed("rafts", identity, functions, "Edit"), photoEdit: owner && !frozenZone(zone),
    cycles: operationAllowed("cultivation-cycles", identity, functions, "View", zone), costs: operationAllowed("purchase-receipts", identity, functions, "View", zone),
    logs: operationAllowed("cultivation-cycles", identity, functions, "LogsView", zone), cycle: cycleAccessFor(identity, functions, zone, frozenZone(zone)),
    materialCreate: !frozenZone(zone) && operationAllowed("material-usages", identity, functions, "Create", zone) });
  const recordId =params.get("recordId") ?? "", linkedId = UUID.test(recordId) ? recordId : undefined;
  const [filters, setFilters] = useState<RaftFilters>({ ...emptyRaftFilters, search: params.get("search") ?? "" }), [sort, setSort] = useState<SortState>({ key: "code", direction: "asc" });
  // A link names its raft by id (`recordId`) or by code (`search`, opened when exactly one raft has that code); `tab` is the tab to open it on.
  const codeLink = !linkedId ? (params.get("search") ?? "").trim().toLowerCase() : "";
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(10), [expanded, setExpanded] = useState(linkedId), [linkPlaced, setLinkPlaced] = useState(!linkedId && !codeLink), [linkTarget, setLinkTarget] = useState(linkedId);
  const [creating, setCreating] = useState(params.get("create") === "1" && canCreate);
  const guard = useUnsavedGuard(), { notify } = useToast();
  const [storedColumns, storeColumns] = useStoredValue("omts-columns-rafts-v2", raftColumns.filter(column => column.key !== "latitude" && column.key !== "longitude").map(column => column.key).join(","));
  // The zone column exists only while rafts of several zones are listed together.
  const visible = raftColumns.filter(column => column.key === "zone" ? showAll : storedColumns.split(",").includes(column.key)).map(column => column.key);
  const zonesKey = zones.map(zone => zone.id).join(",");
  const list = useStickyRemote(useCallback(async (signal: AbortSignal): Promise<WorkspaceResult<ZonedRaftRow[]>> => {
    if (showAll) return readRaftsOfZones(zones, signal);
    if (!zoneId) return { status: "success", data: [] };
    const zone = zones[0], result = await readZoneRafts(zoneId, signal);
    return result.status === "success" ? { status: "success", data: result.data.map(row => ({ ...row, zoneId, zoneLabel: zoneLabelOf(zone) })) } : result;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `zones` is keyed by `zonesKey`
  }, [zonesKey]));
  const rows = useMemo(() => sortRafts(filterRafts(list.data ?? [], filters), sort.key as RaftSortKey, sort.direction), [list.data, filters, sort]);
  if (!linkPlaced && list.data) {
    setLinkPlaced(true);
    const sameCode = codeLink ? rows.filter(row => row.code.toLowerCase() === codeLink) : [], target = linkedId ?? (sameCode.length === 1 ? sameCode[0].id : undefined);
    const index = target ? rows.findIndex(row => row.id === target) : -1;
    if (target && index >= 0) { setPage(Math.floor(index / pageSize) + 1); setExpanded(target); setLinkTarget(target); }
  }
  useEffect(() => {
    if (!linkTarget || !list.data) return;
    const timer = setTimeout(() => document.getElementById(`raft-row-${linkTarget}`)?.scrollIntoView?.({ block: "nearest" }), 0);
    return () => clearTimeout(timer);
  }, [linkTarget, list.data]);

  const current = Math.min(page, Math.max(1, Math.ceil(rows.length / pageSize))), shown = rows.slice((current - 1) * pageSize, current * pageSize);
  // A header change (chip or rail) starts the list again from its first page.
  const [shownZones, setShownZones] = useState(zonesKey);
  if (shownZones !== zonesKey) { setShownZones(zonesKey); setPage(1); setExpanded(undefined); }
  const change = (apply: () => void) => void guard.leave(() => { apply(); setPage(1); setExpanded(undefined); });
  const setFilter = <K extends keyof RaftFilters>(key: K, value: RaftFilters[K]) => change(() => setFilters(previous => ({ ...previous, [key]: value })));
  const hasFilter = !!(filters.search || filters.statusId);
  const zoneLabel = zoneLabelOf(zones[0]);
  const rail = <>
    <RailHead canReset={hasFilter} onReset={() => change(() => setFilters(emptyRaftFilters))} />
    {pinned ? <PinnedZoneField zone={pinned} filter={filter} className={styles.railSelect} beforeChange={apply => void guard.leave(apply)} onRelease={onRelease} />
      : <ZoneFilterField filter={filter} className={styles.railSelect} beforeChange={apply => void guard.leave(apply)} />}
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
      {params.get("nurseryBatch") && <p role="status" className={styles.hint}>Mở bè cần thả giống, vào tab Chu kỳ nuôi và bấm Bắt đầu chu kỳ nuôi: đợt ươm đã chọn được điền sẵn.</p>}
      {!zones.length ? <ListStateMessage>Chưa có vùng nuôi nào để xem bè.</ListStateMessage>
        : list.error && !list.data ? <ListStateMessage error={list.error} onRetry={list.reload} retryLabel="Tải lại" />
        : !list.data ? <ListSkeleton />
        : !shown.length ? <ListStateMessage>{hasFilter ? "Không có bè phù hợp bộ lọc." : showAll ? "Các vùng này chưa có bè nuôi." : "Vùng này chưa có bè nuôi."}</ListStateMessage>
        : <RaftTable rows={shown} visible={visible} sort={sort} onSort={next => change(() => setSort(next))} expandedId={expanded} scopeOf={row => ({ zoneId: row.zoneId, zoneLabel: row.zoneLabel, access: accessIn(row.zoneId) })} guard={guard}
          initialTabOf={linkTarget} initialTab={params.get("tab") ?? undefined}
          onToggle={id => void guard.leave(() => setExpanded(open => open === id ? undefined : id))} onChanged={notice => { list.reload(); if (notice !== "") notify({ tone: "success", title: notice ?? "Đã cập nhật bè nuôi." }); }} />}
    </ManagementScroller>
    {creating && <RaftCreateDialog zoneId={zoneId} zoneLabel={zoneLabel} onClose={() => setCreating(false)} onCreated={() => { setCreating(false); notify({ tone: "success", title: "Đã thêm bè nuôi." }); list.reload(); }} />}
  </ManagementLayout>;
}
