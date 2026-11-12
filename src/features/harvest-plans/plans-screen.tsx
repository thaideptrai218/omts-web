"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { FilterGroup, HelpLink, ManagementLayout } from "@/components/ui/management-screen/management-layout";
import { ColumnPicker, ListStateMessage, ManagementPagination, ManagementScroller, managementStyles } from "@/components/ui/management-screen/management-table";
import { TimeRangeFilter } from "@/components/ui/management-screen/time-range-filter";
import { allTime, type TimeRangeValue } from "@/components/ui/management-screen/time-range-model";
import { useStoredValue } from "@/components/ui/management-screen/use-stored-value";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import { SelectBox } from "@/components/ui/select-box";
import issueStyles from "@/features/input-issues/input-issues.module.css";
import { useZoneOptions } from "@/features/input-issues/issue-access";
import type { ListQuery } from "@/features/input-items/repository";
import { viDateTime } from "@/features/purchase-documents/document-parts";
import { orderHref } from "@/features/sales-orders/order-labels";
import listStyles from "@/features/suppliers-api/suppliers.module.css";
import { PLAN, type PlanPage, type PlanRow } from "./contracts";
import { usePlanAccess } from "./plan-access";
import { PlanDetailPanel } from "./plan-detail";
import { PLANS_PATH, PlanStatus, allPlanStatuses, planStatusLabel } from "./plan-labels";
import { errorText, planRepository } from "./repository";

type Column = { key: string; label: string; numeric?: boolean; hidden?: boolean; render(row: PlanRow): ReactNode };
const dash = (value: string | null | undefined) => value || "—";
const stop = (event: { stopPropagation(): void }) => event.stopPropagation();
const columns: readonly Column[] = [
  { key: "code", label: "Mã KHT", render: (row) => <span className="font-mono tabular-nums">{row.code}</span> },
  { key: "plannedAt", label: "Thời gian dự kiến", render: (row) => viDateTime(row.plannedAt) },
  { key: "zone", label: "Vùng", render: (row) => dash(row.zones.map((zone) => zone.code).join(", ")) },
  { key: "rafts", label: "Số bè", numeric: true, render: (row) => <span title={row.raftCodes.join(", ")}>{row.raftCodes.length}</span> },
  { key: "lanes", label: "Số luống", numeric: true, render: (row) => row.progress.lanes },
  { key: "done", label: "Đã thu (dòng)", numeric: true, render: (row) => `${row.progress.linesDone}/${row.progress.lines}` },
  { key: "skipped", label: "Không thu (luống)", numeric: true, render: (row) => row.progress.lanesSkipped },
  { key: "orders", label: "Đơn đặt hàng", render: (row) => row.orders.length ? <span className="flex flex-wrap gap-x-2">{row.orders.map((order) => <Link key={order.id} className={issueStyles.link} href={orderHref(order.code)} onClick={stop}>{order.code}</Link>)}</span> : "—" },
  { key: "createdBy", label: "Người tạo", hidden: true, render: (row) => dash(row.createdBy) },
  { key: "status", label: "Trạng thái", render: (row) => <PlanStatus statusId={row.statusId} /> },
];
const defaultStatuses: number[] = [PLAN.draft, PLAN.assigned, PLAN.harvesting];
const emptyFilters = { zone: "" };
const railSelect = "h-[30px] w-full rounded-md border border-border-strong bg-surface px-2 text-[13px]";
const sameStatuses = (a: readonly number[], b: readonly number[]) => a.length === b.length && a.every((value) => b.includes(value));

/**
 * A link opens this list on one plan by its code (`?code=KHT000001`). The list is keyed by that code so a link followed while the list is already open
 * starts it again: the search box shows the code, every status is shown and the row with exactly that code opens.
 */
export function PlansScreen(props: { helpHref?: string }) {
  const linkedCode = useSearchParams().get("code") ?? "";
  return <PlansList key={linkedCode} linkedCode={linkedCode} {...props} />;
}

function PlansList({ helpHref, linkedCode }: { helpHref?: string; linkedCode: string }) {
  const access = usePlanAccess(), router = useRouter();
  const linkPending = useRef(linkedCode);
  const [search, setSearch] = useState(linkedCode), [filters, setFilters] = useState(emptyFilters), [statuses, setStatuses] = useState<number[]>(linkedCode ? [] : defaultStatuses);
  const [time, setTime] = useState<TimeRangeValue>(allTime);
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(15), [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<PlanPage>(), [loading, setLoading] = useState(true), [error, setError] = useState<string>(), [expanded, setExpanded] = useState<string>();
  const defaults = useMemo(() => columns.filter((column) => !column.hidden).map((column) => column.key).join(","), []);
  const [stored, store] = useStoredValue("omts-columns-harvest-plans", defaults);
  const visible = useMemo(() => { const keys = stored.split(","), shown = columns.filter((column) => keys.includes(column.key)); return shown.length ? shown : columns; }, [stored]);
  const { zones } = useZoneOptions(access.view);

  const query = useMemo<ListQuery>(() => {
    const values: Record<string, string> = { search: search.trim(), statusIds: statuses.join(","), from: time.from, to: time.to, zoneId: filters.zone };
    return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== ""));
  }, [search, statuses, time, filters]);

  useEffect(() => {
    if (!access.view) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true); setError(undefined);
      void planRepository.list({ ...query, page: String(page), pageSize: String(pageSize) }, controller.signal).then((result) => {
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
  const setZoneFilter = changed<string>((value) => setFilters({ zone: value }));
  const toggleStatus = changed<number>((value) => setStatuses((current) => current.includes(value) ? current.filter((status) => status !== value) : [...current, value]));
  const reload = () => setRefresh((value) => value + 1);
  const hasFilter = filters.zone !== "" || time.kind !== allTime.kind || time.from !== allTime.from || time.to !== allTime.to || !sameStatuses(statuses, linkedCode ? [] : defaultStatuses);
  const toggleRow = (id: string) => setExpanded((value) => value === id ? undefined : id);
  if (!access.view) return <p role="alert" className="rounded-card border border-border bg-surface p-6">Bạn không có quyền xem chức năng này.</p>;

  const rail = <>
    <div className={listStyles.railHead}><strong>Bộ lọc</strong><button type="button" className={managementStyles.linkButton} disabled={!hasFilter} onClick={() => changed<void>(() => { setFilters(emptyFilters); setStatuses(defaultStatuses); setTime(allTime); })()}>Đặt lại</button></div>
    <FilterGroup legend="Trạng thái"><div className={managementStyles.pills}>{allPlanStatuses.map((status) =>
      <label key={status} className={managementStyles.pill}><input type="checkbox" className="sr-only" checked={statuses.includes(status)} onChange={() => toggleStatus(status)} />{planStatusLabel[status]}</label>)}</div></FilterGroup>
    <TimeRangeFilter legend="Thời gian dự kiến" value={time} onChange={changed<TimeRangeValue>(setTime)} />
    <FilterGroup legend="Vùng"><SelectBox aria-label="Vùng" className={railSelect} value={filters.zone} onChange={(event) => setZoneFilter(event.target.value)}>
      <option value="">Tất cả vùng</option>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.code || zone.name}</option>)}</SelectBox></FilterGroup>
  </>;

  return <ManagementLayout storageKey="harvest-plans" icon="raft" title="Kế hoạch thu hoạch" filters={rail} filterLabel="Bộ lọc kế hoạch thu hoạch"
    footer={<ManagementPagination page={data?.page ?? page} pageSize={pageSize} total={data?.total ?? 0} unit="kế hoạch" disabled={loading} onPage={(next) => { setPage(next); setExpanded(undefined); }} onPageSize={changed<number>(setPageSize)} />}
    search={<input type="search" aria-label="Tìm kế hoạch thu hoạch" placeholder="Theo mã KHT, bè hoặc mã đơn đặt hàng" maxLength={200} value={search} onChange={(event) => changed<string>(setSearch)(event.target.value)} />}
    actions={<>
      {access.create && <Button className="w-auto" onClick={() => router.push(`${PLANS_PATH}/new`)}><InterfaceIcon name="add" className="mr-1 size-4" />Lập kế hoạch</Button>}
      <ColumnPicker columns={columns} visible={visible.map((column) => column.key)} onChange={(keys) => store(keys.join(","))} />
      <HelpLink helpHref={helpHref} />
    </>}>
    <ManagementScroller busy={loading}>
      {error ? <ListStateMessage error={error} onRetry={reload} retryLabel="Tải lại" />
        : !data ? <div role="status" aria-label="Đang tải danh sách" className={listStyles.skeleton}>{[1, 2, 3, 4, 5].map((key) => <div key={key} />)}</div>
        : !data.items.length ? <ListStateMessage>{search || hasFilter ? "Không có kế hoạch thu hoạch phù hợp bộ lọc." : access.create ? "Chưa có kế hoạch thu hoạch. Bấm Lập kế hoạch để tạo kế hoạch." : "Chưa có kế hoạch thu hoạch."}</ListStateMessage>
        : <table className={listStyles.table}><thead><tr>
          <th scope="col" className={listStyles.expandCell}><span className="sr-only">Mở dòng</span></th>
          {visible.map((column) => <th key={column.key} scope="col" className={column.numeric ? issueStyles.num : undefined}>{column.label}</th>)}
        </tr></thead><tbody>
          {data.items.map((row) => <Fragment key={row.id}>
            <OpenableTableRow data-selected={expanded === row.id || undefined} onOpen={() => toggleRow(row.id)}>
              <td className={listStyles.expandCell}><button type="button" aria-expanded={expanded === row.id} aria-label={`${expanded === row.id ? "Thu gọn" : "Mở"} ${row.code}`} onClick={() => toggleRow(row.id)}><InterfaceIcon name={expanded === row.id ? "chevron-down" : "chevron-right"} /></button></td>
              {visible.map((column) => <td key={column.key} className={`${column.numeric ? issueStyles.num : ""} ${row.statusId === PLAN.cancelled ? issueStyles.muted : ""}`.trim() || undefined}>{column.render(row)}</td>)}
            </OpenableTableRow>
            {expanded === row.id && <tr><td colSpan={visible.length + 1} className={listStyles.detailCell}><div className={managementStyles.viewWidth}>
              <PlanDetailPanel id={row.id} access={access} onChanged={reload} />
            </div></td></tr>}
          </Fragment>)}
        </tbody></table>}
    </ManagementScroller>
  </ManagementLayout>;
}
