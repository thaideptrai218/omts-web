"use client";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { HelpLink, ManagementLayout } from "@/components/ui/management-screen/management-layout";
import { ColumnPicker, ListStateMessage, ManagementPagination, ManagementScroller, type SortState } from "@/components/ui/management-screen/management-table";
import { allTime, type TimeRangeValue } from "@/components/ui/management-screen/time-range-model";
import { useStoredValue } from "@/components/ui/management-screen/use-stored-value";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { useScopedZones } from "@/features/api-workspace/selected-zones";
import { ListSkeleton } from "@/features/farming-management/detail-parts";
import { useStickyRemote } from "@/features/farming-management/use-sticky-remote";
import { useUnsavedGuard } from "@/features/farming-management/use-unsaved-guard";
import styles from "@/features/farming-management/farming-management.module.css";
import { WaterZoneOverview } from "@/features/water-overview/water-zone-overview";
import * as c from "./contracts";
import { loadOptions } from "./lookups";
import { operationAllowed } from "./permissions";
import { ErrorNotice, useMutation, useRemote } from "./ui";
import { WaterChartSection } from "./water-chart-section";
import { emptyWaterFilters, filterWater, noWaterHistory, raftsOf, readAllWaterHistory, sortWater, type WaterFilters, type WaterSortKey, type WaterZoneRef } from "./water-history-model";
import { WaterHistoryTable, waterColumns } from "./water-history-table";
import { waterRepository as repository } from "./water-measurement-shared";
import { WaterPanelStrip } from "./water-panel-strip";
import { WaterThresholdPanel } from "./water-threshold-panel";
import { WaterZoneFilters } from "./water-zone-filters";
import local from "./water-screen.module.css";

// Re-exported so existing imports from "./water-screen" keep working (the inbox record dialog opens a measurement in a modal).
export { MeasurementEditor } from "./water-measurement-editor";
export { NewMeasurement } from "./water-new-measurement-dialog";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const loadZones = (signal: AbortSignal) => loadOptions("zones", signal);
const noLinkedRecord = { status: "success" as const, data: undefined as c.WaterMeasurement | undefined };

/** Theo dõi chất lượng nước: measurements of one zone (`?zoneId=`), a row (`?recordId=`) opens its record in place; no zone shows the zone overview. */
export function WaterScreen({ initialZoneId = "", helpHref }: { initialZoneId?: string; helpHref?: string } = {}) {
  return <Suspense fallback={<ListSkeleton />}><WaterWorkspace initialZoneId={initialZoneId} helpHref={helpHref} /></Suspense>;
}

function WaterWorkspace({ initialZoneId, helpHref }: { initialZoneId: string; helpHref?: string }) {
  const { identity, permissions } = useApiWorkspace();
  const functions = permissions.functionPermissions, params = useSearchParams();
  const linkedId = UUID.test(params?.get("recordId") ?? "") ? params?.get("recordId") ?? undefined : undefined, linkedZone = params?.get("zoneId") ?? "";
  const zones = useRemote(loadZones);
  // undefined = no explicit choice yet: a linked measurement then decides the zone, otherwise the overview shows.
  const [choice, setChoice] = useState<string | undefined>(initialZoneId || (UUID.test(linkedZone) ? linkedZone : undefined));
  const linked = useRemote<c.WaterMeasurement | undefined>(useCallback((signal: AbortSignal) => linkedId && choice === undefined ? repository.read("detail", { id: linkedId }, c.waterSchema, signal) : Promise.resolve(noLinkedRecord), [linkedId, choice]));
  const { zones: offered, zoneId } = useScopedZones(zones.data?.filter(row => operationAllowed("water", identity, functions, "View", row.id)) ?? [], choice ?? linked.data?.zoneId ?? "", initialZoneId || undefined);

  const [time, setTime] = useState<TimeRangeValue>(allTime), [filters, setFilters] = useState<WaterFilters>(() => ({ ...emptyWaterFilters, status: linkedId ? "" : emptyWaterFilters.status }));
  const [sort, setSort] = useState<SortState>({ key: "time", direction: "desc" }), [page, setPage] = useState(1), [pageSize, setPageSize] = useState(15);
  const [expanded, setExpanded] = useState(linkedId), [linkPlaced, setLinkPlaced] = useState(!linkedId);
  const [chartOpen, setChartOpen] = useState(false), [thresholdsOpen, setThresholdsOpen] = useState(false), [revision, setRevision] = useState(0), [notice, setNotice] = useState<string>();
  const guard = useUnsavedGuard(), exporting = useMutation();
  const [storedColumns, storeColumns] = useStoredValue("omts-columns-water", waterColumns.map(column => column.key).join(","));
  const visible = waterColumns.filter(column => storedColumns.split(",").includes(column.key)).map(column => column.key);

  const history = useStickyRemote(useCallback((signal: AbortSignal) => zoneId
    ? readAllWaterHistory({ zoneId, from: time.from, to: time.to, status: filters.status }, signal)
    : Promise.resolve({ status: "success" as const, data: noWaterHistory }), [zoneId, time.from, time.to, filters.status]));
  const loaded = history.data?.zoneId === zoneId ? history.data : undefined;
  const rows = useMemo(() => sortWater(filterWater(loaded?.items ?? [], filters), sort.key as WaterSortKey, sort.direction), [loaded, filters, sort]);
  if (!linkPlaced && loaded) { setLinkPlaced(true); const index = rows.findIndex(row => row.id === linkedId); if (index >= 0) setPage(Math.floor(index / pageSize) + 1); }

  useEffect(() => {
    if (!linkedId || !loaded) return;
    const timer = setTimeout(() => document.getElementById(`water-row-${linkedId}`)?.scrollIntoView({ block: "nearest" }), 0);
    return () => clearTimeout(timer);
  }, [linkedId, loaded]);

  const last = Math.max(1, Math.ceil(rows.length / pageSize)), current = Math.min(page, last), shown = rows.slice((current - 1) * pageSize, current * pageSize);
  const change = (apply: () => void) => void guard.leave(() => { apply(); setPage(1); setExpanded(undefined); });
  const setFilter = <K extends keyof WaterFilters>(key: K, value: WaterFilters[K]) => change(() => setFilters(previous => ({ ...previous, [key]: value })));
  const reset = () => change(() => { setFilters(emptyWaterFilters); setTime(allTime); });
  const hasFilter = !!(filters.search || filters.raftId || filters.exceeded);
  const canReset = hasFilter || filters.status !== emptyWaterFilters.status || time.kind !== "preset" || time.preset !== "all";
  const currentZone = offered.find(row => row.id === zoneId);
  const zone: WaterZoneRef = { id: zoneId, code: String(currentZone?.code ?? ""), name: String(currentZone?.name ?? "") };
  const canExport = !!zoneId && operationAllowed("water", identity, functions, "Export", zoneId), canEdit = !!zoneId && operationAllowed("water", identity, functions, "Edit", zoneId);
  const changed = (message: string) => { history.reload(); setRevision(value => value + 1); setNotice(message); };

  const list = !zoneId ? null : history.error && !loaded ? <ListStateMessage error={history.error} onRetry={history.reload} retryLabel="Tải lại" />
    : !loaded ? <ListSkeleton />
    : !shown.length ? <ListStateMessage>{hasFilter ? "Không có phép đo phù hợp bộ lọc." : "Chưa có phép đo trong khoảng thời gian này."}</ListStateMessage>
    : <WaterHistoryTable rows={shown} visible={visible} sort={sort} onSort={next => change(() => setSort(next))} expandedId={expanded} zone={zone} canEdit={canEdit} guard={guard} onChanged={changed}
      onToggle={id => void guard.leave(() => { setThresholdsOpen(false); setExpanded(open => open === id ? undefined : id); })} />;
  const overview = zones.error && !zones.data ? <ListStateMessage error={zones.error} onRetry={zones.reload} retryLabel="Tải lại danh sách vùng" />
    : !zones.data || linked.loading ? <ListSkeleton /> : <div className={local.overview}><WaterZoneOverview onSelectZone={id => change(() => setChoice(id))} /></div>;

  return <ManagementLayout storageKey="water" icon="waves" title="Theo dõi chất lượng nước" filterLabel="Bộ lọc theo dõi chất lượng nước"
    filters={<WaterZoneFilters zones={offered} zoneId={zoneId} time={time} filters={filters} rafts={raftsOf(loaded?.items ?? [])} canReset={canReset}
      onZone={id => change(() => { setChoice(id); setFilters(previous => ({ ...previous, raftId: "" })); })} onTime={next => change(() => setTime(next))} onFilter={setFilter} onReset={reset} />}
    search={<input type="search" aria-label="Tìm phép đo" placeholder="Theo bè hoặc người ghi" maxLength={200} value={filters.search} disabled={!zoneId} onChange={event => setFilter("search", event.target.value)} />}
    actions={<>
      {canExport && <Button key="export" className="w-auto" variant="secondary" isPending={exporting.pending} onClick={() => void exporting.run(() => repository.download({ zoneId, from: time.from, to: time.to, status: filters.status || "All" }), true)}><InterfaceIcon name="download" className="mr-1 size-4" />Xuất file</Button>}
      {zoneId && <ColumnPicker columns={waterColumns} visible={visible} onChange={keys => storeColumns(keys.join(","))} />}<HelpLink helpHref={helpHref} />
    </>}
    footer={zoneId ? <ManagementPagination page={current} pageSize={pageSize} total={rows.length} unit="phép đo" disabled={history.loading && !loaded} onPage={next => void guard.leave(() => { setPage(next); setExpanded(undefined); })} onPageSize={size => change(() => setPageSize(size))} /> : undefined}>
    {guard.dialog}
    <ErrorNotice error={exporting.error} />
    {notice && <div className={styles.feedback}><p role="status">{notice}</p></div>}
    <ManagementScroller busy={history.loading}>
      {!zoneId ? overview : <>
        <WaterPanelStrip chartOpen={chartOpen} thresholdsOpen={thresholdsOpen} note={loaded?.truncated ? `Chỉ hiển thị ${loaded.items.length} phép đo mới nhất; hãy thu hẹp khoảng thời gian.` : undefined}
          onChart={() => setChartOpen(open => !open)} onThresholds={() => void guard.leave(() => { setExpanded(undefined); setThresholdsOpen(open => !open); })} />
        {chartOpen && <WaterChartSection key={`${zoneId}:${revision}`} zoneId={zoneId} from={time.from} to={time.to} />}
        {thresholdsOpen && <section className={local.panel} aria-label="Ngưỡng cảnh báo"><WaterThresholdPanel key={zoneId} zoneId={zoneId} owner={identity.subjectType === "CooperativeOwner"} dirtyRef={guard.dirty} onSaved={message => { setRevision(value => value + 1); setNotice(message); }} /></section>}
        {list}
      </>}
    </ManagementScroller>
  </ManagementLayout>;
}
