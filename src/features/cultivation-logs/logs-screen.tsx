"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { FilterGroup, HelpLink, ManagementLayout } from "@/components/ui/management-screen/management-layout";
import { ListStateMessage, ManagementPagination, ManagementScroller, managementStyles } from "@/components/ui/management-screen/management-table";
import { TimeRangeFilter } from "@/components/ui/management-screen/time-range-filter";
import { allTime, type TimeRangeValue } from "@/components/ui/management-screen/time-range-model";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import { SelectBox } from "@/components/ui/select-box";
import { useToast } from "@/components/ui/toast-provider";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { useScopedZones } from "@/features/api-workspace/selected-zones";
import { LogCard } from "@/features/cycles-api/log-card";
import { logTypeLabel, logTypes } from "@/features/cycles-api/log-contracts";
import { logPhotoSrc } from "@/features/cycles-api/log-photo-src";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import { useUnsavedGuard } from "@/features/farming-management/use-unsaved-guard";
import { useZoneOptions } from "@/features/input-issues/issue-access";
import { loadOptions } from "@/features/operations/lookups";
import { operationAllowed } from "@/features/operations/permissions";
import { operationError, useRemote } from "@/features/operations/ui";
import { viDateTime } from "@/features/purchase-documents/document-parts";
import listStyles from "@/features/suppliers-api/suppliers.module.css";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { LogCreateDialog } from "./log-create-dialog";
import type { LogPage, LogPageItem, LogPageQuery } from "./log-page-contract";
import { readLogPage } from "./log-page-repository";

const railSelect = "h-[30px] w-full rounded-md border border-border-strong bg-surface px-2 text-[13px]";
const stop = (event: { stopPropagation(): void }) => event.stopPropagation();
const when = (value: string) => Number.isNaN(Date.parse(value)) ? "—" : viDateTime(value);

/**
 * Nhật ký chăm sóc: the care logs of every raft the account may read, newest visit first, server-paged. The filters (zone, raft, type, visit dates) and the search
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
  const [search, setSearch] = useState(""), [zone, setZone] = useState(linkedZone), [raft, setRaft] = useState(linkedZone ? linkedRaft : ""), [type, setType] = useState(""), [time, setTime] = useState<TimeRangeValue>(allTime);
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(20), [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<LogPage>(), [loading, setLoading] = useState(true), [error, setError] = useState<string>();
  const [viewing, setViewing] = useState<LogPageItem>(), [creating, setCreating] = useState(false);
  // The zone choice follows the zone picker of the header: with a narrowed selection only those zones are offered and one of them is always chosen.
  const { zones } = useZoneOptions(view), scoped = useScopedZones(zones, zone, linkedZone);
  const zoneId = scoped.narrowed ? scoped.zoneId : zone;
  const rafts = useRemote(useCallback(async (signal: AbortSignal): Promise<WorkspaceResult<{ id: string; code: string }[]>> => {
    if (!zoneId) return { status: "success", data: [] };
    const result = await loadOptions("rafts", signal, { zoneId });
    return result.status === "success" ? { status: "success", data: result.data.map(row => ({ id: row.id, code: String(row.code ?? "") })) } : result;
  }, [zoneId]));
  const query = useMemo<LogPageQuery>(() => ({ search: search.trim(), zoneId, raftId: zoneId ? raft : "", logType: type, from: time.from, to: time.to }), [search, zoneId, raft, type, time]);

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
  const hasFilter = !!(zone || raft || type) || time.kind !== allTime.kind || time.from !== allTime.from || time.to !== allTime.to;
  if (!view) return <p role="alert" className="rounded-card border border-border bg-surface p-6">Bạn không có quyền xem chức năng này.</p>;
  const createZones = zones.filter(item => operationAllowed("cultivation-cycles", identity, functions, "LogsCreate", item.id));

  const rail = <>
    <div className={listStyles.railHead}><strong>Bộ lọc</strong><button type="button" className={managementStyles.linkButton} disabled={!hasFilter} onClick={() => changed<void>(() => { setZone(""); setRaft(""); setType(""); setTime(allTime); })()}>Đặt lại</button></div>
    <FilterGroup legend="Vùng nuôi"><SelectBox aria-label="Vùng nuôi" className={railSelect} value={zoneId} onChange={event => changed<string>(value => { setZone(value); setRaft(""); })(event.target.value)}>
      {!scoped.narrowed && <option value="">Tất cả vùng</option>}{scoped.zones.map(item => <option key={item.id} value={item.id}>{item.code || item.name}</option>)}</SelectBox></FilterGroup>
    <FilterGroup legend="Bè"><SelectBox aria-label="Bè" className={railSelect} disabled={!zoneId} value={raft} onChange={event => changed<string>(setRaft)(event.target.value)}>
      <option value="">{zoneId ? "Tất cả bè" : "Chọn vùng trước"}</option>{(rafts.data ?? []).map(item => <option key={item.id} value={item.id}>{item.code}</option>)}</SelectBox></FilterGroup>
    <FilterGroup legend="Loại nhật ký"><SelectBox aria-label="Loại nhật ký" className={railSelect} value={type} onChange={event => changed<string>(setType)(event.target.value)}>
      <option value="">Tất cả loại</option>{logTypes.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</SelectBox></FilterGroup>
    <TimeRangeFilter legend="Ngày chăm sóc" value={time} onChange={changed<TimeRangeValue>(setTime)} />
  </>;

  return <ManagementLayout storageKey="cultivation-logs" icon="document" title="Nhật ký chăm sóc" filters={rail} filterLabel="Bộ lọc nhật ký chăm sóc"
    footer={<ManagementPagination page={data?.page ?? page} pageSize={pageSize} total={data?.total ?? 0} unit="nhật ký" disabled={loading} onPage={setPage} onPageSize={changed<number>(setPageSize)} />}
    search={<input type="search" aria-label="Tìm nhật ký" placeholder="Theo mã bè hoặc nội dung" maxLength={100} value={search} onChange={event => changed<string>(setSearch)(event.target.value)} />}
    actions={<>
      {canCreate && <Button className="w-auto" onClick={() => void guard.leave(() => setCreating(true))}><InterfaceIcon name="add" className="mr-1 size-4" />Ghi nhật ký</Button>}
      <HelpLink helpHref={helpHref} />
    </>}>
    {guard.dialog}
    <ManagementScroller busy={loading}>
      {error ? <ListStateMessage error={error} onRetry={reload} retryLabel="Tải lại" />
        : !data ? <div role="status" aria-label="Đang tải danh sách" className={listStyles.skeleton}>{[1, 2, 3, 4, 5].map(key => <div key={key} />)}</div>
        : !data.items.length ? <ListStateMessage>{search || hasFilter ? "Không có nhật ký phù hợp bộ lọc." : "Chưa có nhật ký chăm sóc nào."}</ListStateMessage>
        : <table className={listStyles.table}><thead><tr>
          <th scope="col">Ngày chăm sóc</th><th scope="col">Vùng · Bè</th><th scope="col">Loại</th><th scope="col">Nội dung</th><th scope="col">Ảnh</th><th scope="col">Người ghi</th><th scope="col">Thời gian ghi</th>
        </tr></thead><tbody>{data.items.map(log => <OpenableTableRow key={log.id} onOpen={() => setViewing(log)}>
          <td><button type="button" className={managementStyles.linkButton} aria-label={`Xem nhật ký ${log.raftCode} ngày ${formatVietnameseDate(log.visitDate)}`} onClick={event => { stop(event); setViewing(log); }}>{formatVietnameseDate(log.visitDate)}</button></td>
          <td className="whitespace-nowrap">{log.zoneCode || log.zoneName || "—"} · <Link className={managementStyles.linkButton} href={farmingReferenceHref("raft", { zoneId: log.zoneId, search: log.raftCode, tab: "logs" })} onClick={stop}>{log.raftCode}</Link></td>
          <td className="whitespace-nowrap">{logTypeLabel(log.logType)}</td>
          <td className="max-w-xs truncate" title={log.notes ?? undefined}>{log.notes ?? "—"}</td>
          <td>{log.photos.length ? <span className="inline-flex items-center gap-2"><Image src={logPhotoSrc(log.id, log.zoneId, 0)} alt="" width={32} height={32} unoptimized className="size-8 rounded object-cover" />{log.photos.length}</span> : "—"}</td>
          <td>{log.recordedByName ?? "—"}</td><td className="whitespace-nowrap">{when(log.recordedAt)}</td>
        </OpenableTableRow>)}</tbody></table>}
    </ManagementScroller>
    {viewing && <LogCard log={viewing} cycleId={viewing.cycleId} zoneId={viewing.zoneId} canEdit={operationAllowed("cultivation-cycles", identity, functions, "LogsEdit", viewing.zoneId)} guard={guard}
      onClose={() => setViewing(undefined)} onChanged={reload} />}
    {creating && <LogCreateDialog zones={createZones} defaultZoneId={zoneId} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); reload(); notify({ tone: "success", title: "Đã ghi nhật ký chăm sóc." }); }} />}
  </ManagementLayout>;
}
