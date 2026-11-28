"use client";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { FilterGroup, HelpLink, ManagementLayout } from "@/components/ui/management-screen/management-layout";
import { ColumnPicker, ListStateMessage, ManagementPagination, ManagementScroller, managementStyles, type SortState } from "@/components/ui/management-screen/management-table";
import { TimeRangeFilter } from "@/components/ui/management-screen/time-range-filter";
import { allTime, type TimeRangeValue } from "@/components/ui/management-screen/time-range-model";
import { SelectBox } from "@/components/ui/select-box";
import { useStoredValue } from "@/components/ui/management-screen/use-stored-value";
import { useToast } from "@/components/ui/toast-provider";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { useZoneFilter, ZoneFilterField } from "@/features/api-workspace/zone-filter";
import { LogCard } from "@/features/cycles-api/log-card";
import { logTypes } from "@/features/cycles-api/log-contracts";
import { useUnsavedGuard } from "@/features/farming-management/use-unsaved-guard";
import { useZoneOptions } from "@/features/input-issues/issue-access";
import { loadOptions } from "@/features/operations/lookups";
import { operationAllowed } from "@/features/operations/permissions";
import { operationError, useRemote } from "@/features/operations/ui";
import listStyles from "@/features/suppliers-api/suppliers.module.css";
import { LogCreateDialog } from "./log-create-dialog";
import type { LogPage, LogPageItem, LogPageQuery } from "./log-page-contract";
import { readLogPage } from "./log-page-repository";
import { LogsTable, logColumns } from "./logs-table";

const railSelect = "h-[30px] w-full rounded-md border border-border-strong bg-surface px-2 text-[13px]";

/**
 * Nhật ký chăm sóc: the care logs of every raft the account may read, newest visit first unless a header sorts it (on the server, over every log), server-paged. The filters (zone, raft, type, visit dates) and the search
 * (raft code or text) go to the backend. A row opens the log as a card, the raft code opens the raft on its Nhật ký tab (by code), "+ Ghi nhật ký" picks zone and raft first.
 * `?zoneId=&raftId=` preselect the filters.
 */
export function LogsScreen({ helpHref }: { helpHref?: string }) {
  const params = useSearchParams();
  return <LogsList key={`${params?.get("zoneId") ?? ""}:${params?.get("raftId") ?? ""}`} helpHref={helpHref} linkedZone={params?.get("zoneId") ?? ""} linkedRaft={params?.get("raftId") ?? ""} />;
}

function LogsList({ helpHref, linkedZone, linkedRaft }: { helpHref?: string; linkedZone: string; linkedRaft: string }) {
  const { identity, permissions } = useApiWorkspace(), { notify } = useToast(), guard = useUnsavedGuard();
  const functions = permissions.functionPermissions;
  const view = operationAllowed("cultivation-cycles", identity, functions, "LogsView");
  const canCreate = operationAllowed("cultivation-cycles", identity, functions, "LogsCreate");
  const [search, setSearch] = useState(""), [raftChoice, setRaftChoice] = useState({ id: linkedZone ? linkedRaft : "", zone: linkedZone }), [type, setType] = useState(""), [time, setTime] = useState<TimeRangeValue>(allTime);
  const [sort, setSort] = useState<SortState>({ key: "visitDate", direction: "desc" }), [page, setPage] = useState(1), [pageSize, setPageSize] = useState(20), [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<LogPage>(), [loading, setLoading] = useState(true), [error, setError] = useState<string>();
  const [viewing, setViewing] = useState<LogPageItem>(), [creating, setCreating] = useState(false);
  // The zone filter is the header zone chip (two-way); the Bè filter needs exactly one zone, and a raft chosen under another zone no longer applies.
  const { zones } = useZoneOptions(view), filter = useZoneFilter(), zoneId = filter.singleZoneId ?? "";
  const raft = zoneId && raftChoice.zone === zoneId ? raftChoice.id : "";
  const [shownZones, setShownZones] = useState(filter.apiZoneIds);
  if (shownZones !== filter.apiZoneIds) { setShownZones(filter.apiZoneIds); setPage(1); }
  const rafts = useRemote(useCallback(async (signal: AbortSignal): Promise<WorkspaceResult<{ id: string; code: string }[]>> => {
    if (!zoneId) return { status: "success", data: [] };
    const result = await loadOptions("rafts", signal, { zoneId });
    return result.status === "success" ? { status: "success", data: result.data.map(row => ({ id: row.id, code: String(row.code ?? "") })) } : result;
  }, [zoneId]));
  const [storedColumns, storeColumns] = useStoredValue("omts-columns-cultivation-logs", logColumns.map(column => column.key).join(","));
  const visible = logColumns.filter(column => storedColumns.split(",").includes(column.key)).map(column => column.key);
  const query = useMemo<LogPageQuery>(() => ({ search: search.trim(), zoneIds: filter.apiZoneIds ?? "", raftId: raft, logType: type, from: time.from, to: time.to, sortBy: sort.key, sortDir: sort.direction }), [search, filter.apiZoneIds, raft, type, time, sort]);

  useEffect(() => {
    if (!view) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true); setError(undefined);
      void readLogPage({ ...query, page: String(page), pageSize: String(pageSize) }, controller.signal).then(result => {
        if (controller.signal.aborted) return;
        setLoading(false);
        if (result.status === "success") {
          setData(result.data);
          if (result.data.total > 0 && page > Math.ceil(result.data.total / pageSize)) setPage(Math.ceil(result.data.total / pageSize));
        } else { setData(undefined); setError(operationError(result)); }
      });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [view, query, page, pageSize, refresh]);

  const changed = <T,>(apply: (value: T) => void) => (value: T) => { apply(value); setPage(1); };
  const reload = () => setRefresh(value => value + 1);
  const hasFilter = !!(raft || type) || time.kind !== allTime.kind || time.from !== allTime.from || time.to !== allTime.to;
  if (!view) return <p role="alert" className="rounded-card border border-border bg-surface p-6">Bạn không có quyền xem chức năng này.</p>;
  const createZones = zones.filter(item => operationAllowed("cultivation-cycles", identity, functions, "LogsCreate", item.id));

  const rail = <>
    <div className={listStyles.railHead}><strong>Bộ lọc</strong><button type="button" className={managementStyles.linkButton} disabled={!hasFilter} onClick={() => changed<void>(() => { setRaftChoice({ id: "", zone: "" }); setType(""); setTime(allTime); })()}>Đặt lại</button></div>
    <ZoneFilterField filter={filter} className={railSelect} beforeChange={apply => void guard.leave(apply)} />
    <FilterGroup legend="Bè"><SelectBox aria-label="Bè" className={railSelect} disabled={!zoneId} value={raft} title={zoneId ? undefined : "Chọn một vùng để lọc theo bè"} onChange={event => changed<string>(id => setRaftChoice({ id, zone: zoneId }))(event.target.value)}>
      <option value="">{zoneId ? "Tất cả bè" : "Chọn một vùng để lọc theo bè"}</option>{(rafts.data ?? []).map(item => <option key={item.id} value={item.id}>{item.code}</option>)}</SelectBox></FilterGroup>
    <FilterGroup legend="Loại nhật ký"><SelectBox aria-label="Loại nhật ký" className={railSelect} value={type} onChange={event => changed<string>(setType)(event.target.value)}>
      <option value="">Tất cả loại</option>{logTypes.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</SelectBox></FilterGroup>
    <TimeRangeFilter legend="Ngày chăm sóc" value={time} onChange={changed<TimeRangeValue>(setTime)} />
  </>;

  return <ManagementLayout storageKey="cultivation-logs" icon="document" title="Nhật ký chăm sóc" filters={rail} filterLabel="Bộ lọc nhật ký chăm sóc"
    footer={<ManagementPagination page={data?.page ?? page} pageSize={pageSize} total={data?.total ?? 0} unit="nhật ký" disabled={loading} onPage={setPage} onPageSize={changed<number>(setPageSize)} />}
    search={<input type="search" aria-label="Tìm nhật ký" placeholder="Theo mã bè hoặc nội dung" maxLength={100} value={search} onChange={event => changed<string>(setSearch)(event.target.value)} />}
    actions={<>
      {canCreate && <Button className="w-auto" onClick={() => void guard.leave(() => setCreating(true))}><InterfaceIcon name="add" className="mr-1 size-4" />Ghi nhật ký</Button>}
      <ColumnPicker columns={logColumns} visible={visible} onChange={keys => storeColumns(keys.join(","))} /><HelpLink helpHref={helpHref} />
    </>}>
    {guard.dialog}
    <ManagementScroller busy={loading}>
      {error ? <ListStateMessage error={error} onRetry={reload} retryLabel="Tải lại" />
        : !data ? <div role="status" aria-label="Đang tải danh sách" className={listStyles.skeleton}>{[1, 2, 3, 4, 5].map(key => <div key={key} />)}</div>
        : !data.items.length ? <ListStateMessage>{search || hasFilter ? "Không có nhật ký phù hợp bộ lọc." : "Chưa có nhật ký chăm sóc nào."}</ListStateMessage>
        : <LogsTable items={data.items} visible={visible} sort={sort} onSort={changed<SortState>(setSort)} onOpen={setViewing} />}
    </ManagementScroller>
    {viewing && <LogCard log={viewing} cycleId={viewing.cycleId} zoneId={viewing.zoneId} canEdit={operationAllowed("cultivation-cycles", identity, functions, "LogsEdit", viewing.zoneId)} guard={guard}
      onClose={() => setViewing(undefined)} onChanged={reload} />}
    {creating && <LogCreateDialog zones={createZones} defaultZoneId={zoneId} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); reload(); notify({ tone: "success", title: "Đã ghi nhật ký chăm sóc." }); }} />}
  </ManagementLayout>;
}
