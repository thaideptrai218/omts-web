"use client";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { SelectBox } from "@/components/ui/select-box";
import { HelpLink, ManagementLayout } from "@/components/ui/management-screen/management-layout";
import { ColumnPicker, ListStateMessage, ManagementPagination, ManagementScroller, type SortState } from "@/components/ui/management-screen/management-table";
import { allTime, type TimeRangeValue } from "@/components/ui/management-screen/time-range-model";
import { useStoredValue } from "@/components/ui/management-screen/use-stored-value";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { useScopedZones, useSelectedZones } from "@/features/api-workspace/selected-zones";
import { ListSkeleton } from "@/features/farming-management/detail-parts";
import { useStickyRemote } from "@/features/farming-management/use-sticky-remote";
import { useUnsavedGuard } from "@/features/farming-management/use-unsaved-guard";
import * as c from "./contracts";
import { useLinkedZone } from "@/features/farming-management/use-linked-zone";
import { loadInUseZones } from "@/features/zones-api/in-use-zones";
import { operationAllowed } from "./permissions";
import { businessTime, useMutation, useRemote } from "./ui";
import { WaterChartSection } from "./water-chart-section";
import { WaterFilterStrip } from "./water-filter-strip";
import { emptyWaterFilters, filterWater, noWaterHistory, raftsOf, readAllWaterHistory, sortWater, type WaterFilters, type WaterSortKey, type WaterZoneRef } from "./water-history-model";
import { WaterHistoryTable, waterColumns } from "./water-history-table";
import { NewMeasurement as NewMeasurementDialog } from "./water-new-measurement-dialog";
import { waterRepository as repository } from "./water-measurement-shared";
import { WaterThresholdCard } from "./water-threshold-card";
import local from "./water-screen.module.css";

// Re-exported so existing imports from "./water-screen" keep working (the inbox record dialog opens a measurement in a modal).
export { MeasurementEditor } from "./water-measurement-editor";
export { NewMeasurement } from "./water-new-measurement-dialog";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const loadZones = loadInUseZones;
const noLinkedRecord = { status: "success" as const, data: undefined as c.WaterMeasurement | undefined };

/**
 * Chất lượng nước of one zone: the trend chart, then the zone's measurements. The zone is the one in `?zoneId=` or the one a linked
 * measurement (`?recordId=`) belongs to, else the first In Use zone the account may see; the toolbar select changes it. A row opens its record in place.
 */
export function WaterScreen({ initialZoneId = "", helpHref }: { initialZoneId?: string; helpHref?: string } = {}) {
  return <Suspense fallback={<ListSkeleton />}><LinkedWaterWorkspace initialZoneId={initialZoneId} helpHref={helpHref} /></Suspense>;
}

function LinkedWaterWorkspace(props: { initialZoneId: string; helpHref?: string }) {
  const params = useSearchParams();
  return <WaterWorkspace key={`${props.initialZoneId}:${params?.get("zoneId") ?? ""}:${params?.get("recordId") ?? ""}`} {...props} />;
}

function WaterWorkspace({ initialZoneId, helpHref }: { initialZoneId: string; helpHref?: string }) {
  const { identity, permissions } = useApiWorkspace();
  const { notify } = useToast(), header = useSelectedZones();
  const functions = permissions.functionPermissions, params = useSearchParams();
  const linkedId = UUID.test(params?.get("recordId") ?? "") ? params?.get("recordId") ?? undefined : undefined, linkedZone = params?.get("zoneId") ?? "";
  const zones = useRemote(loadZones);
  // undefined = no explicit choice yet: a linked measurement then decides the zone, otherwise the first zone shows.
  const [choice, setChoice] = useState<string | undefined>(initialZoneId || (UUID.test(linkedZone) ? linkedZone : undefined));
  const linked = useRemote<c.WaterMeasurement | undefined>(useCallback((signal: AbortSignal) => linkedId ? repository.read("detail", { id: linkedId }, c.waterSchema, signal) : Promise.resolve(noLinkedRecord), [linkedId]));
  // A link or linked measurement of a discontinued zone opens that zone as one extra read-only option; manual choices stay In Use zones.
  const wantedZone = choice ?? linked.data?.zoneId ?? "";
  const linkedZoneRead = useLinkedZone(wantedZone, id => !zones.data || zones.data.some(row => row.id === id));
  const frozenId = linkedZoneRead.zone && operationAllowed("water", identity, functions, "View", linkedZoneRead.zone.id) ? linkedZoneRead.zone.id : undefined;
  const { zones: scopedOffered, zoneId: scopedZone } = useScopedZones(zones.data?.filter(row => operationAllowed("water", identity, functions, "View", row.id)) ?? [], wantedZone, initialZoneId || undefined);
  const offered = linkedZoneRead.zone && frozenId ? [...scopedOffered, linkedZoneRead.zone] : scopedOffered;
  // The zone is only decided once the zones, a linked measurement and a linked discontinued zone have all been read.
  const settled = !!zones.data && !linked.loading && linkedZoneRead.settled;
  const explicitZone = choice ?? linked.data?.zoneId ?? "";
  const zoneId = !settled ? "" : frozenId && explicitZone === frozenId ? frozenId : scopedZone || scopedOffered[0]?.id || "";
  const frozen = (id: string) => id === frozenId;

  const [time, setTime] = useState<TimeRangeValue>(allTime), [filters, setFilters] = useState<WaterFilters>(() => ({ ...emptyWaterFilters, status: linkedId ? "" : emptyWaterFilters.status }));
  const [datedLink, setDatedLink] = useState(false);
  if (linked.data && !datedLink) {
    const date = businessTime(linked.data.measuredAt).slice(0, 10);
    setDatedLink(true); setTime({ kind: "custom", from: date, to: date });
  }
  const [sort, setSort] = useState<SortState>({ key: "time", direction: "desc" }), [page, setPage] = useState(1), [pageSize, setPageSize] = useState(10);
  const [expanded, setExpanded] = useState(linkedId), [linkPlaced, setLinkPlaced] = useState(!linkedId);
  const [revision, setRevision] = useState(0);
  const [adding, setAdding] = useState(false);
  const guard = useUnsavedGuard(), exporting = useMutation();
  useEffect(() => { if (exporting.error) notify({ tone: "danger", title: "Chưa xuất được phép đo.", description: exporting.error }); }, [exporting.error, notify]);
  const [storedColumns, storeColumns] = useStoredValue("omts-columns-water", waterColumns.map(column => column.key).join(","));
  const visible = waterColumns.filter(column => storedColumns.split(",").includes(column.key)).map(column => column.key);

  const currentZone = offered.find(row => row.id === zoneId);
  const zone: WaterZoneRef = { id: zoneId, code: String(currentZone?.code ?? ""), name: String(currentZone?.name ?? "") };
  const history = useStickyRemote(useCallback((signal: AbortSignal) => zoneId
    ? readAllWaterHistory({ zoneId, from: time.from, to: time.to, status: filters.status }, signal, zone)
    : Promise.resolve({ status: "success" as const, data: noWaterHistory }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the zone ref is built from `zoneId` and the offered zones
    [zoneId, time.from, time.to, filters.status]));
  const loaded = history.data?.zoneId === zoneId ? history.data : undefined;
  const rows = useMemo(() => sortWater(filterWater(loaded?.items ?? [], filters), sort.key as WaterSortKey, sort.direction), [loaded, filters, sort]);
  if (!linkPlaced && loaded) { const index = rows.findIndex(row => row.id === linkedId); if (index >= 0) { setLinkPlaced(true); setPage(Math.floor(index / pageSize) + 1); } }

  useEffect(() => {
    if (!linkedId || !loaded) return;
    const timer = setTimeout(() => document.getElementById(`water-row-${linkedId}`)?.scrollIntoView?.({ block: "nearest" }), 0);
    return () => clearTimeout(timer);
  }, [linkedId, loaded]);

  const last = Math.max(1, Math.ceil(rows.length / pageSize)), current = Math.min(page, last), shown = rows.slice((current - 1) * pageSize, current * pageSize);
  const change = (apply: () => void) => void guard.leave(() => { apply(); setPage(1); setExpanded(undefined); });
  const setFilter = <K extends keyof WaterFilters>(key: K, value: WaterFilters[K]) => change(() => setFilters(previous => ({ ...previous, [key]: value })));
  const reset = () => change(() => { setFilters(emptyWaterFilters); setTime(allTime); });
  const hasFilter = !!(filters.search || filters.raftId || filters.exceeded);
  const canReset = hasFilter || filters.status !== emptyWaterFilters.status || time.kind !== "preset" || time.preset !== "all";
  const canExport = !!zoneId && operationAllowed("water", identity, functions, "Export", zoneId), canCreate = !!zoneId && !frozen(zoneId) && operationAllowed("water", identity, functions, "Create", zoneId);
  const changed = (message: string) => { history.reload(); setRevision(value => value + 1); notify({ tone: "success", title: message }); };

  const list = history.error && !loaded ? <ListStateMessage error={history.error} onRetry={history.reload} retryLabel="Tải lại" />
    : !loaded ? <ListSkeleton />
    : !shown.length ? <ListStateMessage>{hasFilter ? "Không có phép đo phù hợp bộ lọc." : "Chưa có phép đo trong khoảng thời gian này."}</ListStateMessage>
    : <WaterHistoryTable rows={shown} visible={visible} sort={sort} onSort={next => change(() => setSort(next))} expandedId={expanded} canEditIn={id => !frozen(id) && operationAllowed("water", identity, functions, "Edit", id)} guard={guard} onChanged={changed}
      onToggle={id => void guard.leave(() => setExpanded(open => open === id ? undefined : id))} />;
  const noZone = zones.error && !zones.data ? <ListStateMessage error={zones.error} onRetry={zones.reload} retryLabel="Tải lại danh sách vùng" />
    : settled && !offered.length ? <ListStateMessage>Chưa có vùng nào bạn được phép xem chất lượng nước.</ListStateMessage> : <ListSkeleton />;

  return <ManagementLayout storageKey="water" icon="waves" title="Theo dõi chất lượng nước"
    search={<input type="search" aria-label="Tìm phép đo" placeholder="Theo bè hoặc người ghi" maxLength={200} value={filters.search} disabled={!zoneId} onChange={event => setFilter("search", event.target.value)} />}
    actions={<>
      <SelectBox aria-label="Vùng nuôi" className={local.toolSelect} value={zoneId} disabled={!offered.length}
        onChange={event => change(() => { setChoice(event.target.value); header.selectOnly(event.target.value); setFilters(previous => ({ ...previous, raftId: "" })); })}>
        {offered.map(row => <option key={row.id} value={row.id}>{String(row.name)}{row.statusId === 102 ? " (ngừng sử dụng)" : ""}</option>)}
      </SelectBox>
      {canExport && <Button key="export" className="w-auto" variant="secondary" isPending={exporting.pending} onClick={() => void exporting.run(() => repository.download({ zoneId, from: time.from, to: time.to, status: filters.status || "All" }), true)}><InterfaceIcon name="download" className="mr-1 size-4" />Xuất file</Button>}
      {zoneId && <ColumnPicker columns={waterColumns} visible={visible} onChange={keys => storeColumns(keys.join(","))} />}<HelpLink helpHref={helpHref} />
    </>}
    footer={zoneId ? <ManagementPagination page={current} pageSize={pageSize} total={rows.length} unit="phép đo" disabled={history.loading && !loaded} onPage={next => void guard.leave(() => { setPage(next); setExpanded(undefined); })} onPageSize={size => change(() => setPageSize(size))} /> : undefined}>
    {guard.dialog}
    {adding && zoneId && <NewMeasurementDialog zoneId={zoneId} zoneName={zone.name} onClose={() => setAdding(false)}
      onSaved={() => { setAdding(false); history.reload(); setRevision(value => value + 1); }} />}
    <ManagementScroller busy={history.loading}>
      {!zoneId ? noZone : <div className={local.board}>
        <WaterChartSection key={`${zoneId}:${revision}`} zoneId={zoneId} />
        <div className={local.lower}>
          <section aria-label="Lịch sử đo" className={`${local.card} ${local.measurements}`}>
            <div className={local.cardHead}>
              <h2>Phép đo <span className={local.count}>{loaded ? `${rows.length} phép đo` : ""}</span></h2>
              {canCreate && <Button key="add" className="w-auto" onClick={() => setAdding(true)}><InterfaceIcon name="add" className="mr-1 size-4" />Thêm phép đo</Button>}
            </div>
            <WaterFilterStrip time={time} filters={filters} rafts={raftsOf(loaded?.items ?? [])} canReset={canReset}
              note={loaded?.truncated ? `Chỉ hiển thị ${loaded.items.length} phép đo mới nhất; hãy thu hẹp khoảng thời gian.` : undefined}
              onTime={next => change(() => setTime(next))} onFilter={setFilter} onReset={reset} />
            {list}
          </section>
          <WaterThresholdCard key={zoneId} zoneId={zoneId} canEdit={identity.subjectType === "CooperativeOwner"} />
        </div>
      </div>}
    </ManagementScroller>
  </ManagementLayout>;
}
