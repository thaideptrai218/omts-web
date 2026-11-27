"use client";
import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SelectBox } from "@/components/ui/select-box";
import { FilterGroup, FilterPills, HelpLink, ManagementLayout } from "@/components/ui/management-screen/management-layout";
import { ColumnPicker, ListStateMessage, ManagementPagination, ManagementScroller, type SortState } from "@/components/ui/management-screen/management-table";
import { TimeRangeFilter } from "@/components/ui/management-screen/time-range-filter";
import type { TimeRangeValue } from "@/components/ui/management-screen/time-range-model";
import { useStoredValue } from "@/components/ui/management-screen/use-stored-value";
import { useToast } from "@/components/ui/toast-provider";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { ReadOnlyZonesProvider } from "@/features/farming-management/read-only-zones";
import { useZoneChoice, zoneOptionLabel } from "@/features/farming-management/use-zone-choice";
import { useUnsavedGuard } from "@/features/farming-management/use-unsaved-guard";
import { ListSkeleton } from "@/features/farming-management/detail-parts";
import { operationAllowed } from "@/features/operations/permissions";
import { useRemote } from "@/features/operations/ui";
import { DISCONTINUED, type ZoneRow } from "@/features/zones-api/zone-model";
import { nurseryService } from "./service";
import { NurseryTable, defaultNurseryColumns, nurseryColumns } from "./nursery-table";
import { NurseryStartDialog } from "./nursery-start-dialog";
import { NurseryCompleteDialog, type CompletionMode } from "./nursery-complete-dialog";
import { NurseryDetailPanel } from "./nursery-detail-panel";
import type { NurseryDetail } from "./contracts";

export function NurseryScreen() {
  const { identity, permissions } = useApiWorkspace(), params = useSearchParams();
  const allowed = (zone: ZoneRow) => operationAllowed("cultivation-cycles", identity, permissions.functionPermissions, "View", zone.id);
  const zones = useZoneChoice(allowed);
  // A discontinued zone is here only because a link opened it: read-only.
  const readOnlyZones = useMemo(() => new Set(zones.zones.filter(zone => zone.statusId === DISCONTINUED).map(zone => zone.id)), [zones.zones]);
  if (!operationAllowed("cultivation-cycles", identity, permissions.functionPermissions)) return <p role="alert">Bạn không có quyền xem ươm giống.</p>;
  if (!zones.remote.data) return zones.remote.error ? <ListStateMessage error={zones.remote.error} onRetry={zones.remote.reload} /> : <ListSkeleton />;
  // `lot` (from the Lô giống screen) opens the start dialog with that seed lot chosen.
  return <ReadOnlyZonesProvider value={readOnlyZones}><NurseryDirectory key={`${params.get("code") ?? ""}:${params.get("zoneId") ?? ""}:${params.get("lot") ?? ""}:${zones.zones.map(zone => zone.id).join(",")}`} zones={zones.zones} initialZone={params.get("zoneId") ?? ""} initialLot={params.get("lot") ?? ""} /></ReadOnlyZonesProvider>;
}
function NurseryDirectory({ zones, initialZone, initialLot }: { zones: readonly ZoneRow[]; initialZone: string; initialLot: string }) {
  const params = useSearchParams(), code = params.get("code") ?? "";
  const { identity, permissions } = useApiWorkspace(), { notify } = useToast();
  const guard = useUnsavedGuard();
  const [zoneId, setZoneId] = useState(zones.some(zone => zone.id === initialZone) ? initialZone : zones[0]?.id ?? "");
  const [search, setSearch] = useState(code), [status, setStatus] = useState("");
  const [time, setTime] = useState<TimeRangeValue>({ kind: "preset", preset: "all", from: "", to: "" });
  const [sort, setSort] = useState<SortState>({ key: "code", direction: "desc" }), [page, setPage] = useState(1), [pageSize, setPageSize] = useState(10);
  const [expanded, setExpanded] = useState<string>(), [linkPlaced, setLinkPlaced] = useState(!code), [detailVersion, setDetailVersion] = useState(0);
  const [creating, setCreating] = useState(!!initialLot), [completing, setCompleting] = useState<{ batch: NurseryDetail; mode: CompletionMode }>();
  const [stored, store] = useStoredValue("omts-columns-nursery-v3", defaultNurseryColumns.join(",")), visible = nurseryColumns.filter(column => stored.split(",").includes(column.key)).map(column => column.key);
  const list = useRemote(useCallback((signal: AbortSignal) => zoneId ? nurseryService.list({ zoneId, search, status: status || "all", ...(time.from ? { from: time.from } : {}), ...(time.to ? { to: time.to } : {}), page: String(page), pageSize: String(pageSize), sortBy: sort.key, sortDir: sort.direction }, signal)
    : Promise.resolve({ status: "success" as const, data: { items: [], page: 1, pageSize, total: 0 } }), [zoneId, search, status, time.from, time.to, page, pageSize, sort.key, sort.direction]));
  const rows = list.data?.items ?? [];
  if (!linkPlaced && list.data) { setLinkPlaced(true); setExpanded(rows.find(row => row.code === code)?.id); }
  const change = (action: () => void) => void guard.leave(() => { action(); setPage(1); setExpanded(undefined); });
  /**
   * After a save the rows refresh quietly (no skeleton, so the open row stays open); the open detail is rebuilt (and read again) only when a dialog of this screen saved it. A save made inside the detail already put the
   * answered batch in place, so reading it again would only cost another round of detail queries.
   */
  function saved(batch: NurseryDetail, action = batch.statusId === 4003 ? "Đã hủy đợt ươm" : batch.statusId === 4004 ? "Đã đóng đợt ươm" : "Đã cập nhật đợt ươm", reloadDetail = true) {
    setCreating(false); setCompleting(undefined); if (reloadDetail) setDetailVersion(value => value + 1); list.refresh(); notify({ tone: "success", title: `${action} ${batch.code}.` });
  }
  const createZones = zones.filter(zone => zone.statusId === 101 && operationAllowed("cultivation-cycles", identity, permissions.functionPermissions, "Create", zone.id));
  const filters = <>
    <FilterGroup legend="Vùng ươm"><SelectBox aria-label="Vùng ươm" className="omts-control" value={zoneId} onChange={event => change(() => setZoneId(event.target.value))}>{!zones.length && <option value="">Không có vùng được xem</option>}{zones.map(zone => <option key={zone.id} value={zone.id}>{zoneOptionLabel(zone)}</option>)}</SelectBox></FilterGroup>
    <FilterPills legend="Trạng thái" name="nursery-status" value={status} onChange={value => change(() => setStatus(value))} options={[["nursing", "Đang ươm"], ["completed", "Chờ thả"], ["closed", "Đã đóng"], ["cancelled", "Đã hủy"]]} />
    <TimeRangeFilter legend="Ngày bắt đầu ươm" value={time} onChange={value => change(() => setTime(value))} />
  </>;
  return <ManagementLayout storageKey="nursery" icon="product" title="Ươm giống" filters={filters} search={<input type="search" aria-label="Tìm đợt ươm" placeholder="Theo mã, lô giống, nhà cung cấp" maxLength={200} value={search} onChange={event => change(() => setSearch(event.target.value))} />}
    actions={<>{!!createZones.length && zones.find(zone => zone.id === zoneId)?.statusId !== DISCONTINUED && <Button key="start-nursery" type="button" className="w-auto" onClick={() => void guard.leave(() => { setExpanded(undefined); setCreating(true); })}>+ Bắt đầu ươm</Button>}<ColumnPicker columns={nurseryColumns} visible={visible} onChange={keys => store(keys.join(","))} /><HelpLink /></>}
    footer={<ManagementPagination page={page} pageSize={pageSize} total={list.data?.total ?? 0} unit="đợt ươm" disabled={list.loading} onPage={next => void guard.leave(() => { setPage(next); setExpanded(undefined); })} onPageSize={size => change(() => setPageSize(size))} />}>
    {guard.dialog}
    <ManagementScroller busy={list.loading}>
      {list.loading ? <ListSkeleton /> : list.error ? <ListStateMessage error={list.error} onRetry={list.reload} retryLabel="Tải lại đợt ươm" /> : !rows.length ? <ListStateMessage>{search || status || time.from ? "Không có đợt ươm phù hợp bộ lọc." : "Chưa có đợt ươm giống nào."}</ListStateMessage>
        : <NurseryTable rows={rows} visible={visible} sort={sort} onSort={next => change(() => setSort(next))} expanded={expanded} onToggle={id => void guard.leave(() => setExpanded(value => value === id ? undefined : id))} detail={row => <NurseryDetailPanel key={`${row.id}:${detailVersion}`} id={row.id} zoneId={row.zoneId} guard={guard} onChanged={batch => saved(batch, undefined, false)} onComplete={batch => setCompleting({ batch, mode: "complete" })} onCorrect={batch => setCompleting({ batch, mode: "survivors" })} />} />}
    </ManagementScroller>
    {creating && createZones.length > 0 && zones.find(zone => zone.id === zoneId)?.statusId !== DISCONTINUED && <NurseryStartDialog zones={createZones} initialZone={zoneId} initialLotId={initialLot} onClose={() => setCreating(false)} onSaved={batch => saved(batch, "Đã bắt đầu ươm giống, đợt")} />}
    {completing && <NurseryCompleteDialog batch={completing.batch} mode={completing.mode} onClose={() => setCompleting(undefined)} onSaved={batch => saved(batch, completing.mode === "complete" ? "Đã hoàn tất ươm, đợt" : "Đã sửa số sống sót (ước tính), đợt")} />}
  </ManagementLayout>;
}
