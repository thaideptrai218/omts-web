"use client";
import { SelectBox } from "@/components/ui/select-box";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { FilterGroup, FilterPills, HelpLink, ManagementLayout } from "@/components/ui/management-screen/management-layout";
import { ColumnPicker, ListStateMessage, ManagementPagination, ManagementScroller, SortableHeader, managementStyles, type SortState } from "@/components/ui/management-screen/management-table";
import { TimeRangeFilter } from "@/components/ui/management-screen/time-range-filter";
import { allTime, presetValue, type TimeRangeValue } from "@/components/ui/management-screen/time-range-model";
import { useStoredValue } from "@/components/ui/management-screen/use-stored-value";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import { listCollectors } from "@/features/cash-book/repository";
import { ErrorNotice, useMutation, useRemote } from "@/features/operations/ui";
import { fmt, viDateTime } from "@/features/purchase-documents/document-parts";
import { usePurchaseLookups } from "@/features/purchase-documents/repository";
import listStyles from "@/features/suppliers-api/suppliers.module.css";
import { ISSUE, type IssuePage, type IssueRow, type IssueKind } from "@/features/input-items/contracts";
import { issueRepository, errorText, type ListQuery } from "@/features/input-items/repository";
import { IssueDetailPanel } from "./issue-detail";
import { IssueStatus, IssueTypeDialog } from "./issue-dialogs";
import { kindInfo, useIssueAccess, useIssueTypes, useReceivers, useZoneOptions, type IssueAccess } from "./issue-access";
import styles from "./input-issues.module.css";

type Column = { key: string; label: string; sort?: string; numeric?: boolean; hidden?: boolean; only?: IssueKind; render(row: IssueRow): ReactNode };
const dash = (value: string | null | undefined) => value || "—";
const columns: readonly Column[] = [
  { key: "code", label: "Mã phiếu", sort: "code", render: (row) => <span className="font-mono tabular-nums">{row.code}</span> },
  { key: "time", label: "Thời gian", sort: "issuedAt", render: (row) => viDateTime(row.issuedAt) },
  { key: "zone", label: "Vùng", only: "Use", render: (row) => dash(row.zoneCode) },
  { key: "raft", label: "Bè", only: "Use", render: (row) => dash(row.raftCode) },
  { key: "type", label: "Loại xuất", only: "Use", render: (row) => dash(row.issueTypeName) },
  { key: "receiver", label: "Người nhận", only: "Use", render: (row) => dash(row.receiverName) },
  { key: "reason", label: "Lý do", only: "Disposal", render: (row) => dash(row.reason) },
  { key: "value", label: "Giá trị", sort: "totalValue", numeric: true, render: (row) => fmt(row.totalValue) },
  { key: "createdBy", label: "Người tạo", hidden: true, render: (row) => dash(row.createdBy) },
  { key: "notes", label: "Ghi chú", hidden: true, render: (row) => dash(row.notes) },
  { key: "status", label: "Trạng thái", sort: "status", render: (row) => <IssueStatus statusId={row.statusId} /> },
];
const emptyFilters = { status: "", zone: "", raft: "", type: "", createdById: "", receiver: "" };
type Filters = typeof emptyFilters;
const statuses: readonly (readonly [string, string])[] = [["Draft", "Phiếu tạm"], ["Completed", "Hoàn thành"], ["Cancelled", "Đã hủy"]];
const railSelect = "h-[30px] w-full rounded-md border border-border-strong bg-surface px-2 text-[13px]";

/**
 * A link opens this list on one document by its code (`?code=XD000001`). The list is keyed by that code so a link followed while the list
 * is already open starts it again: the search box shows the code and the row with exactly that code opens.
 */
export function IssuesScreen(props: { kind: IssueKind; helpHref?: string }) {
  const linkedCode = useSearchParams().get("code") ?? "";
  return <IssuesList key={`${props.kind}:${linkedCode}`} linkedCode={linkedCode} {...props} />;
}

function IssuesList({ kind, helpHref, linkedCode }: { kind: IssueKind; helpHref?: string; linkedCode: string }) {
  const info = kindInfo[kind], use = kind === "Use", access = useIssueAccess(kind), router = useRouter(), exportFile = useMutation();
  const linkPending = useRef(linkedCode);
  const [search, setSearch] = useState(linkedCode), [filters, setFilters] = useState<Filters>(emptyFilters);
  const [time, setTime] = useState<TimeRangeValue>(() => linkedCode ? allTime : presetValue("thisMonth"));
  const [sort, setSort] = useState<SortState>({ key: "code", direction: "desc" }), [page, setPage] = useState(1), [pageSize, setPageSize] = useState(15), [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<IssuePage>(), [loading, setLoading] = useState(true), [error, setError] = useState<string>(), [expanded, setExpanded] = useState<string>();
  const offered = useMemo(() => columns.filter((column) => !column.only || column.only === kind), [kind]);
  const defaults = useMemo(() => offered.filter((column) => !column.hidden).map((column) => column.key).join(","), [offered]);
  const [stored, store] = useStoredValue(`omts-columns-input-issues-${kind.toLowerCase()}`, defaults);
  const visible = useMemo(() => { const keys = stored.split(","), shown = offered.filter((column) => keys.includes(column.key)); return shown.length ? shown : offered; }, [stored, offered]);
  const canPeople = access.can("CASH_BOOK", "View");
  const creators = useRemote(useCallback(async (signal: AbortSignal): Promise<WorkspaceResult<{ id: string; name: string }[] | undefined>> => canPeople ? listCollectors(signal) : { status: "success", data: undefined }, [canPeople]));

  const query = useMemo<ListQuery>(() => {
    const values: Record<string, string> = { search: search.trim(), kind, status: filters.status, from: time.from, to: time.to, zoneId: filters.zone, raftId: filters.raft, issueTypeId: filters.type,
      createdById: filters.createdById, receiverId: filters.receiver, sortBy: sort.key, sortDir: sort.direction };
    return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== ""));
  }, [search, kind, filters, time, sort]);

  useEffect(() => {
    if (!access.view) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true); setError(undefined);
      void issueRepository.list({ ...query, page: String(page), pageSize: String(pageSize) }, controller.signal).then((result) => {
        if (controller.signal.aborted) return;
        setLoading(false);
        if (result.status === "success") {
          setData(result.data);
          if (linkPending.current) { const code = linkPending.current.toLowerCase(); linkPending.current = ""; const linked = result.data.items.find((row) => row.code.toLowerCase() === code); if (linked) setExpanded(linked.id); }
          if (result.data.total > 0 && page > Math.ceil(result.data.total / pageSize)) setPage(Math.ceil(result.data.total / pageSize));
        } else { setData(undefined); setError(errorText(result)); }
      });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [access.view, query, page, pageSize, refresh]);

  function changed<T>(apply: (value: T) => void) { return (value: T) => { apply(value); setPage(1); setExpanded(undefined); }; }
  const setFilter = (key: keyof Filters) => changed<string>((value) => setFilters((current) => ({ ...current, [key]: value })));
  const setZone = changed<string>((zone) => setFilters((current) => ({ ...current, zone, raft: "", receiver: "" })));
  const reload = () => setRefresh((value) => value + 1);
  const defaultTime = linkedCode ? allTime : presetValue("thisMonth");
  const hasFilter = Object.values(filters).some((value) => value !== "") || time.kind !== defaultTime.kind || time.from !== defaultTime.from || time.to !== defaultTime.to;
  const toggle = (id: string) => setExpanded((value) => value === id ? undefined : id);
  if (!access.view) return <p role="alert" className="rounded-card border border-border bg-surface p-6">Bạn không có quyền xem chức năng này.</p>;

  const rail = <>
    <div className={listStyles.railHead}><strong>Bộ lọc</strong><button type="button" className={managementStyles.linkButton} disabled={!hasFilter} onClick={() => changed<void>(() => { setFilters(emptyFilters); setTime(presetValue("thisMonth")); })()}>Đặt lại</button></div>
    <FilterPills legend="Trạng thái" name={`issue-status-${kind}`} value={filters.status} options={statuses} onChange={setFilter("status")} />
    <TimeRangeFilter legend="Thời gian" value={time} onChange={changed<TimeRangeValue>(setTime)} />
    {creators.data && <FilterGroup legend="Người tạo"><SelectBox aria-label="Người tạo" className={railSelect} value={filters.createdById} onChange={(event) => setFilter("createdById")(event.target.value)}>
      <option value="">Tất cả</option>{creators.data.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</SelectBox></FilterGroup>}
    {use && <UseFilters filters={filters} access={access} onZone={setZone} onFilter={setFilter} />}
  </>;
  const summary = data?.summary;

  return <ManagementLayout storageKey={`input-issues-${kind.toLowerCase()}`} icon={info.icon} title={info.title} filters={rail} filterLabel={`Bộ lọc ${info.noun}`}
    footer={<ManagementPagination page={data?.page ?? page} pageSize={pageSize} total={data?.total ?? 0} unit="phiếu" disabled={loading} onPage={(next) => { setPage(next); setExpanded(undefined); }} onPageSize={changed<number>(setPageSize)} />}
    search={<input type="search" aria-label={`Tìm ${info.noun}`} placeholder="Theo mã phiếu, ghi chú hoặc lý do" maxLength={200} value={search} onChange={(event) => changed<string>(setSearch)(event.target.value)} />}
    actions={<>
      {access.create && <Button className="w-auto" onClick={() => router.push(`${info.path}/new`)}><InterfaceIcon name="add" className="mr-1 size-4" />Tạo mới</Button>}
      {access.exportFile && <Button className="w-auto" variant="secondary" isPending={exportFile.pending} onClick={() => void exportFile.run(() => issueRepository.exportList(query), true)}><InterfaceIcon name="download" className="mr-1 size-4" />Xuất file</Button>}
      <ColumnPicker columns={offered} visible={visible.map((column) => column.key)} onChange={(keys) => store(keys.join(","))} />
      <HelpLink helpHref={helpHref} />
    </>}>
    {exportFile.error && <div className={listStyles.feedback}><ErrorNotice error={exportFile.error} /></div>}
    <ManagementScroller busy={loading}>
      {error ? <ListStateMessage error={error} onRetry={reload} retryLabel="Tải lại" />
        : !data ? <div role="status" aria-label="Đang tải danh sách" className={listStyles.skeleton}>{[1, 2, 3, 4, 5].map((key) => <div key={key} />)}</div>
        : !data.items.length ? <ListStateMessage>{search || hasFilter ? `Không có ${info.noun} phù hợp bộ lọc.` : access.create ? `Chưa có ${info.noun}. Bấm Tạo mới để lập phiếu.` : `Chưa có ${info.noun}.`}</ListStateMessage>
        : <table className={listStyles.table}><thead><tr>
          <th scope="col" className={listStyles.expandCell}><span className="sr-only">Mở dòng</span></th>
          {visible.map((column) => <SortableHeader key={column.key} label={column.label} sortKey={column.sort} sort={sort} onSort={changed<SortState>(setSort)} className={column.numeric ? styles.num : undefined} />)}
        </tr></thead><tbody>
          {summary && <tr className={styles.totalRow} aria-label="Tổng hợp theo bộ lọc"><td />{visible.map((column, index) => <td key={column.key} className={column.numeric ? styles.num : undefined}>{column.key === "value" ? fmt(summary.totalValue) : index === 0 ? "Tổng (phiếu hoàn thành)" : null}</td>)}</tr>}
          {data.items.map((row) => <Fragment key={row.id}>
            <OpenableTableRow data-selected={expanded === row.id || undefined} onOpen={() => toggle(row.id)}>
              <td className={listStyles.expandCell}><button type="button" aria-expanded={expanded === row.id} aria-label={`${expanded === row.id ? "Thu gọn" : "Mở"} ${row.code}`} onClick={() => toggle(row.id)}><InterfaceIcon name={expanded === row.id ? "chevron-down" : "chevron-right"} /></button></td>
              {visible.map((column) => <td key={column.key} className={`${column.numeric ? styles.num : ""} ${row.statusId === ISSUE.cancelled ? styles.muted : ""}`.trim() || undefined}>{column.render(row)}</td>)}
            </OpenableTableRow>
            {expanded === row.id && <tr><td colSpan={visible.length + 1} className={listStyles.detailCell}><div className={managementStyles.viewWidth}>
              <IssueDetailPanel id={row.id} access={access} onChanged={reload} onRemoved={() => { setExpanded(undefined); reload(); }} />
            </div></td></tr>}
          </Fragment>)}
        </tbody></table>}
    </ManagementScroller>
  </ManagementLayout>;
}

/** The filters only a use issue has: where it went, what for and who took it. */
function UseFilters({ filters, access, onZone, onFilter }: { filters: Filters; access: IssueAccess; onZone(value: string): void; onFilter(key: keyof Filters): (value: string) => void }) {
  const { zones } = useZoneOptions(), types = useIssueTypes(), lookups = usePurchaseLookups(), receivers = useReceivers(filters.zone), [creating, setCreating] = useState(false);
  const rafts = lookups.rafts.filter((raft) => !filters.zone || raft.zoneId === filters.zone);
  return <>
    <FilterGroup legend="Vùng"><SelectBox aria-label="Vùng" className={railSelect} value={filters.zone} onChange={(event) => onZone(event.target.value)}>
      <option value="">Tất cả vùng</option>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.code || zone.name}</option>)}</SelectBox></FilterGroup>
    <FilterGroup legend="Bè"><SelectBox aria-label="Bè" className={railSelect} value={filters.raft} onChange={(event) => onFilter("raft")(event.target.value)}>
      <option value="">Tất cả bè</option>{rafts.map((raft) => <option key={raft.id} value={raft.id}>{raft.code}</option>)}</SelectBox></FilterGroup>
    <FilterGroup legend="Loại xuất"><SelectBox aria-label="Loại xuất" className={railSelect} value={filters.type} onChange={(event) => onFilter("type")(event.target.value)}>
      <option value="">Tất cả loại xuất</option>{types.types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</SelectBox>
      {access.owner && <button type="button" className={managementStyles.linkButton} onClick={() => setCreating(true)}>+ Tạo mới</button>}</FilterGroup>
    {filters.zone && <FilterGroup legend="Người nhận"><SelectBox aria-label="Người nhận" className={railSelect} value={filters.receiver} onChange={(event) => onFilter("receiver")(event.target.value)}>
      <option value="">Tất cả</option>{receivers.receivers.map((person) => <option key={person.id} value={person.id}>{person.fullName}</option>)}</SelectBox></FilterGroup>}
    {creating && <IssueTypeDialog onClose={() => setCreating(false)} onSaved={() => { setCreating(false); types.reload(); }} />}
  </>;
}
