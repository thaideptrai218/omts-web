"use client";
import { useToast } from "@/components/ui/toast-provider";
import { SelectBox } from "@/components/ui/select-box";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { FilterGroup, FilterPills, HelpLink, ManagementLayout } from "@/components/ui/management-screen/management-layout";
import { ColumnPicker, ListStateMessage, ManagementPagination, ManagementScroller, type SortState } from "@/components/ui/management-screen/management-table";
import { useStoredValue } from "@/components/ui/management-screen/use-stored-value";
import { resourceAllowed } from "@/features/api-workspace/resources";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { GlobalZoneMap } from "@/features/farming-api/global-zone-map";
import { ListSkeleton, RailHead } from "@/features/farming-management/detail-parts";
import { useStickyRemote } from "@/features/farming-management/use-sticky-remote";
import { useUnsavedGuard } from "@/features/farming-management/use-unsaved-guard";
import { operationAllowed } from "@/features/operations/permissions";
import styles from "@/features/farming-management/farming-management.module.css";
import type { ZoneAccess } from "./zone-detail-panel";
import { ZoneCreateDialog } from "./zone-create-dialog";
import { useZoneLicenseFlags } from "./zone-license-flags";
import { emptyZoneFilters, filterZones, licenseFilterOptions, readAllZones, sortZones, type ZoneFilters, type ZoneSortKey } from "./zone-model";
import { useZoneLatestWater } from "./zone-latest-water";
import { ZoneTable, zoneColumns } from "./zone-table";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Vùng nuôi: management frame; a row opens its record in place with tabs that reference rafts, cycles, staff and water. */
export function ZoneScreen({ helpHref }: { helpHref?: string }) {
  const params = useSearchParams();
  return <ZoneDirectory key={`${params.get("recordId") ?? ""}:${params.get("search") ?? ""}`} helpHref={helpHref} />;
}
function ZoneDirectory({ helpHref }: { helpHref?: string }) {
  const { identity, permissions } = useApiWorkspace();
  const functions = permissions.functionPermissions, owner = identity.subjectType === "CooperativeOwner";
  const canView = resourceAllowed("zones", identity, functions), canCreate = resourceAllowed("zones", identity, functions, "Create");
  const accessFor = (zoneId: string): ZoneAccess => ({ edit: resourceAllowed("zones", identity, functions, "Edit"), rafts: resourceAllowed("rafts", identity, functions),
    licenses: owner, staff: owner, cycles: operationAllowed("cultivation-cycles", identity, functions, "View", zoneId), water: operationAllowed("water", identity, functions, "View", zoneId), yield: operationAllowed("harvest-yield", identity, functions, "View", zoneId),
    raft: { edit: resourceAllowed("rafts", identity, functions, "Edit"), photoEdit: owner, cycles: operationAllowed("cultivation-cycles", identity, functions, "View", zoneId), costs: operationAllowed("purchase-receipts", identity, functions, "View", zoneId) } });
  const params = useSearchParams(), recordId = params.get("recordId") ?? "", linkedId = UUID.test(recordId) ? recordId : undefined;
  const [filters, setFilters] = useState<ZoneFilters>({ ...emptyZoneFilters, search: params.get("search") ?? "" });
  const [sort, setSort] = useState<SortState>({ key: "code", direction: "asc" });
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(15), [expanded, setExpanded] = useState(linkedId), [linkPlaced, setLinkPlaced] = useState(!linkedId);
  const [creating, setCreating] = useState(false), [mapOpen, setMapOpen] = useState(false);
  const guard = useUnsavedGuard(), { notify } = useToast();
  const canWater = operationAllowed("water", identity, functions, "View");
  const offered = zoneColumns.filter(column => (!column.licenseOnly || owner) && (!column.waterOnly || canWater));
  // Extra columns start hidden; the chooser remembers what the user turns on.
  const [storedColumns, storeColumns] = useStoredValue("omts-columns-zones", offered.filter(column => !column.waterOnly).map(column => column.key).join(","));
  const visible = offered.filter(column => storedColumns.split(",").includes(column.key)).map(column => column.key);
  const list = useStickyRemote(readAllZones);
  const latestWater = useZoneLatestWater(canWater && visible.includes("water"));
  const latestTimes = useMemo(() => latestWater.byZone && new Map([...latestWater.byZone].map(([id, item]) => [id, item.latestMeasuredAt] as const)), [latestWater.byZone]);
  // The list has no "missing" flag (only an expiry badge): compute it from each zone's licence overview while the column, sort or filter needs it.
  const needLicense = owner && (visible.includes("license") || !!filters.license || sort.key === "license");
  const licenseFlags = useZoneLicenseFlags(useMemo(() => (list.data ?? []).map(zone => zone.id), [list.data]), needLicense);
  const rows = useMemo(() => sortZones(filterZones(list.data ?? [], filters, licenseFlags.flags), sort.key as ZoneSortKey, sort.direction, latestTimes, licenseFlags.flags), [list.data, filters, sort, latestTimes, licenseFlags.flags]);
  // A link from another screen opens its zone on whichever page it sits on, once the list is known.
  if (!linkPlaced && list.data) { setLinkPlaced(true); const index = rows.findIndex(row => row.id === linkedId); if (index >= 0) setPage(Math.floor(index / pageSize) + 1); }
  useEffect(() => {
    if (!linkedId || !list.data) return;
    const timer = setTimeout(() => document.getElementById(`zone-row-${linkedId}`)?.scrollIntoView({ block: "nearest" }), 0);
    return () => clearTimeout(timer);
  }, [linkedId, list.data]);

  const lastPage = Math.max(1, Math.ceil(rows.length / pageSize)), current = Math.min(page, lastPage);
  const shown = rows.slice((current - 1) * pageSize, current * pageSize);
  const change = (apply: () => void) => void guard.leave(() => { apply(); setPage(1); setExpanded(undefined); });
  const setFilter = <K extends keyof ZoneFilters>(key: K, value: ZoneFilters[K]) => change(() => setFilters(previous => ({ ...previous, [key]: value })));
  const hasFilter = !!(filters.search || filters.statusId || filters.license);
  const changed = () => { list.reload(); notify({ tone: "success", title: "Đã cập nhật vùng nuôi." }); };

  if (!canView) return <p role="alert" className="rounded-card border border-border bg-surface p-6">Bạn không có quyền xem chức năng này.</p>;
  const rail = <>
    <RailHead canReset={hasFilter} onReset={() => change(() => setFilters(emptyZoneFilters))} />
    <FilterPills legend="Trạng thái" name="zone-status" value={filters.statusId} options={[["101", "Đang sử dụng"], ["102", "Ngừng sử dụng"]]} onChange={value => setFilter("statusId", value)} />
    {owner && <FilterGroup legend="Hồ sơ giấy phép"><SelectBox aria-label="Hồ sơ giấy phép" className={styles.railSelect} value={filters.license} onChange={event => setFilter("license", event.target.value)}>
      <option value="">Tất cả</option>{licenseFilterOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</SelectBox></FilterGroup>}
  </>;
  return <ManagementLayout storageKey="zones" icon="zone" title="Vùng nuôi" filters={rail} filterLabel="Bộ lọc vùng nuôi"
    search={<input type="search" aria-label="Tìm vùng nuôi" placeholder="Theo mã, tên hoặc vị trí" maxLength={200} value={filters.search} onChange={event => setFilter("search", event.target.value)} />}
    actions={<>
      {canCreate && <Button key="create" type="button" className="w-auto" onClick={() => void guard.leave(() => setCreating(true))}><InterfaceIcon name="add" className="mr-1 size-4" />Thêm vùng nuôi</Button>}
      <Button key={mapOpen ? "show-list" : "show-map"} type="button" className="w-auto" variant="secondary" aria-pressed={mapOpen} onClick={() => void guard.leave(() => { setMapOpen(open => !open); setExpanded(undefined); })}><InterfaceIcon name={mapOpen ? "list" : "zone"} className="mr-1 size-4" />{mapOpen ? "Danh sách" : "Bản đồ"}</Button>
      <ColumnPicker columns={offered} visible={visible} onChange={keys => storeColumns(keys.join(","))} /><HelpLink helpHref={helpHref} />
    </>}
    footer={<ManagementPagination page={current} pageSize={pageSize} total={rows.length} unit="vùng nuôi" disabled={list.loading && !list.data} onPage={next => void guard.leave(() => { setPage(next); setExpanded(undefined); })} onPageSize={size => change(() => setPageSize(size))} />}>
    {guard.dialog}
    <ManagementScroller busy={list.loading}>
      {mapOpen ? <div className="p-3"><GlobalZoneMap /></div>
        : list.error && !list.data ? <ListStateMessage error={list.error} onRetry={list.reload} retryLabel="Tải lại" />
        : !list.data ? <ListSkeleton />
        : !shown.length ? <ListStateMessage>{hasFilter ? "Không có vùng nuôi phù hợp bộ lọc." : "Chưa có vùng nuôi."}</ListStateMessage>
        : <ZoneTable rows={shown} visible={visible} sort={sort} onSort={next => change(() => setSort(next))} expandedId={expanded} canLicense={owner} canWater={canWater} water={latestWater.byZone} licenses={licenseFlags.flags} accessFor={accessFor} guard={guard} zones={list.data}
          onToggle={id => void guard.leave(() => setExpanded(open => open === id ? undefined : id))} onChanged={changed} />}
    </ManagementScroller>
    {creating && <ZoneCreateDialog onClose={() => setCreating(false)} onCreated={() => { setCreating(false); notify({ tone: "success", title: "Đã thêm vùng nuôi." }); list.reload(); }} />}
  </ManagementLayout>;
}
