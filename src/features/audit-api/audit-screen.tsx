"use client";
import { Fragment, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { FilterGroup, HelpLink, ManagementLayout } from "@/components/ui/management-screen/management-layout";
import { ColumnPicker, ListStateMessage, ManagementPagination, ManagementScroller, Subtabs, managementStyles } from "@/components/ui/management-screen/management-table";
import { TimeRangeFilter } from "@/components/ui/management-screen/time-range-filter";
import { presetValue, type TimeRangeValue } from "@/components/ui/management-screen/time-range-model";
import { useStoredValue } from "@/components/ui/management-screen/use-stored-value";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import { SelectBox } from "@/components/ui/select-box";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { workspaceError } from "@/features/api-workspace/workspace-error";
import { Skeleton, useRemote } from "@/features/operations/ui";
import listStyles from "@/features/suppliers-api/suppliers.module.css";
import { AuditChangeSummary } from "./change-summary";
import type { AuditPage } from "./contracts";
import { actionOptionLabel, auditAction, auditTime, longestAuditFrom, recordNames } from "./presentation";
import { auditRepository } from "./repository";
import { DetailRow } from "@/components/ui/management-screen/detail-pane";

type Row = AuditPage["page"]["items"][number];
type Column = { key: string; label: string; render(row: Row): ReactNode };
const columns: readonly Column[] = [
  { key: "time", label: "Thời gian", render: (row) => auditTime(row.occurredAt) },
  { key: "actor", label: "Người thao tác", render: (row) => row.actor.kind === "System" ? "Hệ thống" : row.actor.name },
  { key: "action", label: "Hành động", render: (row) => auditAction(row.action) },
  { key: "record", label: "Bản ghi", render: (row) => <>{recordNames[row.recordType] ?? "Hồ sơ nghiệp vụ"}{row.recordCode ? <> · <span className="font-mono tabular-nums">{row.recordCode}</span></> : null}</> },
  { key: "reason", label: "Lý do", render: (row) => row.reason || "—" },
];
const defaults = columns.map((column) => column.key).join(",");
const emptyFilters = { recordType: "", action: "", actor: "" };
const defaultTime = () => presetValue("last30");
/** The log's own default period is 30 days, so that is where the list opens. */
const isDefaultTime = (time: TimeRangeValue) => time.kind === "preset" && time.preset === "last30";
const railSelect = "h-[30px] w-full rounded-md border border-border-strong bg-surface px-2 text-[13px]";
const recordTypeOptions = Object.entries(recordNames).sort((a, b) => a[1].localeCompare(b[1], "vi"));

/** The actor filter is one select: a person is `account:<id>` or `employee:<id>`, the system is `system`. */
function actorQuery(actor: string): Record<string, string> {
  if (actor === "system") return { system: "true" };
  const [kind, id] = actor.split(":");
  return kind === "account" ? { actorAccountId: id } : kind === "employee" ? { actorEmployeeId: id } : {};
}

/** The change an event made, opened under its row; the log is read only so there is nothing to edit. */
function AuditDetailPanel({ id }: { id: string }) {
  const remote = useRemote(useCallback((signal: AbortSignal) => auditRepository.detail(id, signal), [id]));
  const [tab, setTab] = useState<"changes">("changes");
  return <section className={listStyles.detail} aria-label="Chi tiết nhật ký">
    <Subtabs<"changes"> label="Nội dung nhật ký" tabs={[{ key: "changes", label: "Chi tiết thay đổi" }]} value={tab} onChange={setTab} />
    <div className={listStyles.tabBody}>
      {remote.loading ? <Skeleton /> : remote.error || !remote.data ? <ListStateMessage error={remote.error ?? "Chưa tải được chi tiết nhật ký."} onRetry={remote.reload} retryLabel="Tải lại" /> : <AuditChangeSummary record={remote.data} />}
    </div>
  </section>;
}

export function AuditScreen({ helpHref }: { helpHref?: string }) {
  const context = useApiWorkspace();
  if (context.identity.subjectType !== "CooperativeOwner") return <p role="alert" className="rounded-card border border-border bg-surface p-6">Bạn không có quyền xem nhật ký thao tác.</p>;
  return <AuditList helpHref={helpHref} />;
}

function AuditList({ helpHref }: { helpHref?: string }) {
  const [search, setSearch] = useState(""), [filters, setFilters] = useState(emptyFilters), [time, setTime] = useState<TimeRangeValue>(defaultTime);
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(15), [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<AuditPage>(), [loading, setLoading] = useState(true), [error, setError] = useState<string>(), [expanded, setExpanded] = useState<string>();
  const [stored, store] = useStoredValue("omts-columns-audit", defaults);
  const visible = useMemo(() => { const keys = stored.split(","), shown = columns.filter((column) => keys.includes(column.key)); return shown.length ? shown : columns; }, [stored]);
  // Without the facets the action and person selects stay at "Tất cả"; the list itself does not depend on them.
  const facets = useRemote(useCallback((signal: AbortSignal) => auditRepository.facets(signal), []));
  const actors = useMemo(() => (facets.data?.people ?? []).flatMap((person) => {
    const value = person.accountId ? `account:${person.accountId}` : person.employeeId ? `employee:${person.employeeId}` : "";
    return value ? [{ value, label: person.username ? `${person.name} (${person.username})` : person.name }] : [];
  }).sort((a, b) => a.label.localeCompare(b.label, "vi")), [facets.data]);
  const actions = useMemo(() => (facets.data?.actions ?? []).map((value) => ({ value, label: actionOptionLabel(value) })).sort((a, b) => a.label.localeCompare(b.label, "vi")), [facets.data]);

  const query = useMemo(() => ({
    recordCode: search.trim(), recordType: filters.recordType, action: filters.action, ...actorQuery(filters.actor),
    from: time.from || longestAuditFrom(), to: time.to,
  }), [search, filters, time]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true); setError(undefined);
      void auditRepository.list({ ...query, page: String(page), pageSize: String(pageSize) }, controller.signal).then((result) => {
        if (controller.signal.aborted) return;
        setLoading(false);
        if (result.status === "success") {
          setData(result.data);
          const { total, pageSize: size } = result.data.page;
          if (total > 0 && page > Math.ceil(total / size)) setPage(Math.ceil(total / size));
        } else { setData(undefined); setError(workspaceError(result)); }
      });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, page, pageSize, refresh]);

  function changed<T>(apply: (value: T) => void) { return (value: T) => { apply(value); setPage(1); setExpanded(undefined); }; }
  const setFilter = (key: keyof typeof emptyFilters) => changed<string>((value) => setFilters((current) => ({ ...current, [key]: value })));
  const reload = () => setRefresh((value) => value + 1);
  const hasFilter = Object.values(filters).some(Boolean) || !isDefaultTime(time);
  const toggle = (id: string) => setExpanded((value) => value === id ? undefined : id);

  const rail = <>
    <div className={listStyles.railHead}><strong>Bộ lọc</strong><button type="button" className={managementStyles.linkButton} disabled={!hasFilter} onClick={() => changed<void>(() => { setFilters(emptyFilters); setTime(defaultTime()); })()}>Đặt lại</button></div>
    <TimeRangeFilter legend="Thời gian thao tác" value={time} onChange={changed<TimeRangeValue>(setTime)} />
    <FilterGroup legend="Loại bản ghi"><SelectBox aria-label="Loại bản ghi" searchable className={railSelect} value={filters.recordType} onChange={(event) => setFilter("recordType")(event.target.value)}>
      <option value="">Tất cả loại</option>{recordTypeOptions.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</SelectBox></FilterGroup>
    <FilterGroup legend="Hành động"><SelectBox aria-label="Hành động" searchable className={railSelect} value={filters.action} onChange={(event) => setFilter("action")(event.target.value)}>
      <option value="">Tất cả hành động</option>{actions.map((action) => <option key={action.value} value={action.value}>{action.label}</option>)}</SelectBox></FilterGroup>
    <FilterGroup legend="Người thao tác"><SelectBox aria-label="Người thao tác" searchable className={railSelect} value={filters.actor} onChange={(event) => setFilter("actor")(event.target.value)}>
      <option value="">Tất cả</option><option value="system">Hệ thống</option>{actors.map((actor) => <option key={actor.value} value={actor.value}>{actor.label}</option>)}</SelectBox></FilterGroup>
  </>;

  return <ManagementLayout storageKey="audit" icon="security" title="Nhật ký thao tác" filters={rail} filterLabel="Bộ lọc nhật ký thao tác"
    footer={<ManagementPagination page={data?.page.page ?? page} pageSize={pageSize} total={data?.page.total ?? 0} unit="thao tác" disabled={loading} onPage={(next) => { setPage(next); setExpanded(undefined); }} onPageSize={changed<number>(setPageSize)} />}
    search={<input type="search" aria-label="Tìm theo mã bản ghi" placeholder="Theo mã bản ghi" maxLength={100} value={search} onChange={(event) => changed<string>(setSearch)(event.target.value)} />}
    actions={<>
      <ColumnPicker columns={columns} visible={visible.map((column) => column.key)} onChange={(keys) => store(keys.join(","))} />
      <HelpLink helpHref={helpHref} />
    </>}>
    <ManagementScroller busy={loading}>
      {error ? <ListStateMessage error={error} onRetry={reload} retryLabel="Tải lại" />
        : !data ? <div role="status" aria-label="Đang tải danh sách" className={listStyles.skeleton}>{[1, 2, 3, 4, 5].map((key) => <div key={key} />)}</div>
        : !data.page.items.length ? <ListStateMessage>{search || hasFilter ? "Không có thao tác phù hợp bộ lọc." : "Chưa có thao tác nào trong khoảng thời gian này."}</ListStateMessage>
        : <table className={listStyles.table}><thead><tr>
          <th scope="col" className={listStyles.expandCell}><span className="sr-only">Mở dòng</span></th>
          {/* The log has one order, newest first, so no header sorts. */}
          {visible.map((column) => <th key={column.key} scope="col">{column.label}</th>)}
        </tr></thead><tbody>{data.page.items.map((row) => <Fragment key={row.id}>
          <OpenableTableRow data-selected={expanded === row.id || undefined} onOpen={() => toggle(row.id)}>
            <td className={listStyles.expandCell}><button type="button" aria-expanded={expanded === row.id} aria-label={`${expanded === row.id ? "Thu gọn" : "Mở"} thao tác ${auditTime(row.occurredAt)}`} onClick={() => toggle(row.id)}><InterfaceIcon name={expanded === row.id ? "chevron-down" : "chevron-right"} /></button></td>
            {visible.map((column) => <td key={column.key}>{column.render(row)}</td>)}
          </OpenableTableRow>
          {expanded === row.id && <DetailRow colSpan={visible.length + 1} className={listStyles.detailCell}><div className={managementStyles.viewWidth}><AuditDetailPanel id={row.id} /></div></DetailRow>}
        </Fragment>)}</tbody></table>}
    </ManagementScroller>
  </ManagementLayout>;
}
