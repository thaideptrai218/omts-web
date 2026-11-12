"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { FilterGroup, FilterPills, HelpLink, ManagementLayout } from "@/components/ui/management-screen/management-layout";
import { ColumnPicker, ListStateMessage, ManagementPagination, ManagementScroller, SortableHeader, managementStyles, type SortState } from "@/components/ui/management-screen/management-table";
import { TimeRangeFilter } from "@/components/ui/management-screen/time-range-filter";
import { allTime, presetValue, type TimeRangeValue } from "@/components/ui/management-screen/time-range-model";
import { useStoredValue } from "@/components/ui/management-screen/use-stored-value";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import { SelectBox } from "@/components/ui/select-box";
import { customerHref, invoiceHref } from "@/features/customers/customer-links";
import issueStyles from "@/features/input-issues/input-issues.module.css";
import type { ListQuery } from "@/features/input-items/repository";
import { ErrorNotice, useMutation, useRemote } from "@/features/operations/ui";
import { fmt, viDateTime } from "@/features/purchase-documents/document-parts";
import { listReceivers } from "@/features/purchase-documents/repository";
import purchaseStyles from "@/features/purchase-documents/purchases.module.css";
import listStyles from "@/features/suppliers-api/suppliers.module.css";
import { ORDER, orderSources, type OrderPage, type OrderRow } from "./contracts";
import { useOrderAccess } from "./order-access";
import { OrderDetailPanel } from "./order-detail";
import { ORDERS_PATH, OrderStatus, orderSourceOptions, orderStatusLabel, sourceLabel } from "./order-labels";
import { daysUntilPickup, progressText, waitingText } from "./order-logic";
import { errorText, orderRepository } from "./repository";

type Column = { key: string; label: string; hint?: string; sort?: string; numeric?: boolean; hidden?: boolean; render(row: OrderRow): ReactNode };
const dash = (value: string | null | undefined) => value || "—";
const stop = (event: { stopPropagation(): void }) => event.stopPropagation();
const columns: readonly Column[] = [
  { key: "code", label: "Mã DH", sort: "code", render: (row) => <span className="font-mono tabular-nums">{row.code}</span> },
  { key: "invoices", label: "Mã HĐ", render: (row) => row.invoiceCodes.length ? <span className="flex flex-wrap gap-x-2">{row.invoiceCodes.map((code) => <Link key={code} className={issueStyles.link} href={invoiceHref(code)} onClick={stop}>{code}</Link>)}</span> : "—" },
  { key: "time", label: "Thời gian", sort: "orderedAt", render: (row) => viDateTime(row.orderedAt) },
  { key: "pickup", label: "Hẹn lấy hàng", sort: "pickupAt", render: (row) => row.pickupAt ? viDateTime(row.pickupAt) : "—" },
  { key: "waiting", label: "Số ngày chờ", hint: "Số ngày còn lại đến ngày hẹn lấy hàng (0 là hôm nay)", numeric: true, hidden: true, render: (row) => waitingText(daysUntilPickup(row.pickupAt, row.statusId)) },
  { key: "customerCode", label: "Mã KH", render: (row) => row.customerCode ? <Link className={issueStyles.link} href={customerHref(row.customerCode)} onClick={stop}>{row.customerCode}</Link> : "—" },
  { key: "customer", label: "Khách hàng", render: (row) => row.walkInCustomer ? "Khách lẻ" : dash(row.customerName) },
  { key: "phone", label: "SĐT", render: (row) => dash(row.customerPhone) },
  { key: "createdBy", label: "Người tạo", hidden: true, render: (row) => dash(row.createdBy) },
  { key: "receivedBy", label: "Người nhận đặt", hidden: true, render: (row) => dash(row.receivedBy) },
  { key: "source", label: "Nguồn đặt", render: (row) => sourceLabel[row.source] },
  { key: "total", label: "Tổng", sort: "total", numeric: true, render: (row) => fmt(row.total) },
  { key: "invoiced", label: "Đã lập HĐ", numeric: true, render: (row) => fmt(row.invoicedTotal) },
  { key: "paid", label: "Khách đã trả", numeric: true, render: (row) => fmt(row.customerPaid) },
  { key: "status", label: "Trạng thái", render: (row) => <OrderStatus statusId={row.statusId} /> },
  { key: "progress", label: "Tiến độ", render: (row) => progressText(row.progress) },
];
const defaultStatuses = [ORDER.draft, ORDER.delivering];
const allStatuses = [ORDER.draft, ORDER.delivering, ORDER.completed, ORDER.cancelled];
const emptyFilters = { source: "", createdBy: "", receivedBy: "" };
type Filters = typeof emptyFilters;
const sameStatuses = (a: readonly number[], b: readonly number[]) => a.length === b.length && a.every((value) => b.includes(value));

/**
 * A link opens this list on one order by its code (`?code=DH000001`). The list is keyed by that code so a link followed while the list is already open
 * starts it again: the search box shows the code, every status is shown and the row with exactly that code opens.
 */
export function OrdersScreen(props: { helpHref?: string }) {
  const linkedCode = useSearchParams().get("code") ?? "";
  return <OrdersList key={linkedCode} linkedCode={linkedCode} {...props} />;
}

function OrdersList({ helpHref, linkedCode }: { helpHref?: string; linkedCode: string }) {
  const access = useOrderAccess(), router = useRouter(), exportFile = useMutation();
  const linkPending = useRef(linkedCode);
  const [search, setSearch] = useState(linkedCode), [filters, setFilters] = useState<Filters>(emptyFilters), [statuses, setStatuses] = useState<number[]>(linkedCode ? [] : defaultStatuses);
  const [time, setTime] = useState<TimeRangeValue>(() => linkedCode ? allTime : presetValue("thisMonth")), [pickup, setPickup] = useState<TimeRangeValue>(allTime);
  const [sort, setSort] = useState<SortState>({ key: "code", direction: "desc" }), [page, setPage] = useState(1), [pageSize, setPageSize] = useState(15), [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<OrderPage>(), [loading, setLoading] = useState(true), [error, setError] = useState<string>(), [expanded, setExpanded] = useState<string>();
  const defaults = useMemo(() => columns.filter((column) => !column.hidden).map((column) => column.key).join(","), []);
  const [stored, store] = useStoredValue("omts-columns-sales-orders", defaults);
  const visible = useMemo(() => { const keys = stored.split(","), shown = columns.filter((column) => keys.includes(column.key)); return shown.length ? shown : columns; }, [stored]);
  const people = useRemote(useCallback((signal: AbortSignal) => access.view ? listReceivers(signal) : Promise.resolve({ status: "success" as const, data: [] }), [access.view]));

  const query = useMemo<ListQuery>(() => {
    const values: Record<string, string> = {
      search: search.trim(), statusIds: statuses.join(","), from: time.from, to: time.to, pickupFrom: pickup.from, pickupTo: pickup.to, source: filters.source,
      createdById: filters.createdBy, receivedById: filters.receivedBy, sortBy: sort.key, sortDir: sort.direction,
    };
    return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== ""));
  }, [search, statuses, time, pickup, filters, sort]);

  useEffect(() => {
    if (!access.view) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true); setError(undefined);
      void orderRepository.list({ ...query, page: String(page), pageSize: String(pageSize) }, controller.signal).then((result) => {
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
  const toggleStatus = changed<number>((value) => setStatuses((current) => current.includes(value) ? current.filter((status) => status !== value) : [...current, value]));
  const reload = () => setRefresh((value) => value + 1);
  const defaultTime = linkedCode ? allTime : presetValue("thisMonth");
  const sameRange = (a: TimeRangeValue, b: TimeRangeValue) => a.kind === b.kind && a.from === b.from && a.to === b.to;
  const hasFilter = Object.values(filters).some((value) => value !== "") || !sameRange(time, defaultTime) || !sameRange(pickup, allTime) || !sameStatuses(statuses, linkedCode ? [] : defaultStatuses);
  const toggleRow = (id: string) => setExpanded((value) => value === id ? undefined : id);
  if (!access.view) return <p role="alert" className="rounded-card border border-border bg-surface p-6">Bạn không có quyền xem chức năng này.</p>;

  // Same rail select as the purchase receipt and cash book filters: full rail width, the list opens under it without widening the rail.
  const person = (legend: string, key: "createdBy" | "receivedBy") => <FilterGroup legend={legend}>
    <SelectBox aria-label={legend} className={purchaseStyles.railSelect} value={filters[key]} onChange={(event) => setFilter(key)(event.target.value)}>
      <option value="">Tất cả</option>{(people.data ?? []).map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</SelectBox></FilterGroup>;
  const rail = <>
    <div className={listStyles.railHead}><strong>Bộ lọc</strong><button type="button" className={managementStyles.linkButton} disabled={!hasFilter} onClick={() => changed<void>(() => { setFilters(emptyFilters); setStatuses(defaultStatuses); setTime(presetValue("thisMonth")); setPickup(allTime); })()}>Đặt lại</button></div>
    <FilterGroup legend="Trạng thái"><div className={managementStyles.pills}>{allStatuses.map((status) =>
      <label key={status} className={managementStyles.pill}><input type="checkbox" className="sr-only" checked={statuses.includes(status)} onChange={() => toggleStatus(status)} />{orderStatusLabel[status]}</label>)}</div></FilterGroup>
    <TimeRangeFilter legend="Thời gian" value={time} onChange={changed<TimeRangeValue>(setTime)} />
    <TimeRangeFilter legend="Hẹn lấy hàng" value={pickup} onChange={changed<TimeRangeValue>(setPickup)} />
    <FilterPills legend="Nguồn đặt" name="order-source" value={filters.source} options={orderSourceOptions.filter(([value]) => orderSources.includes(value))} onChange={setFilter("source")} />
    {person("Người tạo", "createdBy")}
    {person("Người nhận đặt", "receivedBy")}
  </>;
  const summary = data?.summary, sums: Record<string, number | undefined> = { total: summary?.total, invoiced: summary?.invoiced, paid: summary?.customerPaid };

  return <ManagementLayout storageKey="sales-orders" icon="request" title="Đặt hàng" filters={rail} filterLabel="Bộ lọc đơn đặt hàng"
    footer={<ManagementPagination page={data?.page ?? page} pageSize={pageSize} total={data?.total ?? 0} unit="đơn" disabled={loading} onPage={(next) => { setPage(next); setExpanded(undefined); }} onPageSize={changed<number>(setPageSize)} />}
    search={<input type="search" aria-label="Tìm đơn đặt hàng" placeholder="Theo mã DH, mã HĐ, khách hàng hoặc SĐT" maxLength={200} value={search} onChange={(event) => changed<string>(setSearch)(event.target.value)} />}
    actions={<>
      {access.create && <Button className="w-auto" onClick={() => router.push(`${ORDERS_PATH}/new`)}><InterfaceIcon name="add" className="mr-1 size-4" />Đặt hàng</Button>}
      {access.exportFile && <Button className="w-auto" variant="secondary" isPending={exportFile.pending} onClick={() => void exportFile.run(() => orderRepository.exportList(query), true)}><InterfaceIcon name="download" className="mr-1 size-4" />Xuất file</Button>}
      <ColumnPicker columns={columns} visible={visible.map((column) => column.key)} onChange={(keys) => store(keys.join(","))} />
      <HelpLink helpHref={helpHref} />
    </>}>
    {exportFile.error && <div className={listStyles.feedback}><ErrorNotice error={exportFile.error} /></div>}
    <ManagementScroller busy={loading}>
      {error ? <ListStateMessage error={error} onRetry={reload} retryLabel="Tải lại" />
        : !data ? <div role="status" aria-label="Đang tải danh sách" className={listStyles.skeleton}>{[1, 2, 3, 4, 5].map((key) => <div key={key} />)}</div>
        : !data.items.length ? <ListStateMessage>{search || hasFilter ? "Không có đơn đặt hàng phù hợp bộ lọc." : access.create ? "Chưa có đơn đặt hàng. Bấm Đặt hàng để lập đơn." : "Chưa có đơn đặt hàng."}</ListStateMessage>
        : <table className={listStyles.table}><thead><tr>
          <th scope="col" className={listStyles.expandCell}><span className="sr-only">Mở dòng</span></th>
          {visible.map((column) => column.hint ? <th key={column.key} scope="col" title={column.hint} className={column.numeric ? issueStyles.num : undefined}>{column.label}</th> : <SortableHeader key={column.key} label={column.label} sortKey={column.sort} sort={sort} onSort={changed<SortState>(setSort)} className={column.numeric ? issueStyles.num : undefined} />)}
        </tr></thead><tbody>
          {summary && <tr className={issueStyles.totalRow} aria-label="Tổng hợp theo bộ lọc"><td />{visible.map((column, index) => <td key={column.key} className={column.numeric ? issueStyles.num : undefined}>{sums[column.key] !== undefined ? fmt(sums[column.key]) : index === 0 ? "Tổng (đơn chưa hủy)" : null}</td>)}</tr>}
          {data.items.map((row) => <Fragment key={row.id}>
            <OpenableTableRow data-selected={expanded === row.id || undefined} onOpen={() => toggleRow(row.id)}>
              <td className={listStyles.expandCell}><button type="button" aria-expanded={expanded === row.id} aria-label={`${expanded === row.id ? "Thu gọn" : "Mở"} ${row.code}`} onClick={() => toggleRow(row.id)}><InterfaceIcon name={expanded === row.id ? "chevron-down" : "chevron-right"} /></button></td>
              {visible.map((column) => <td key={column.key} className={`${column.numeric ? issueStyles.num : ""} ${row.statusId === ORDER.cancelled ? issueStyles.muted : ""}`.trim() || undefined}>{column.render(row)}</td>)}
            </OpenableTableRow>
            {expanded === row.id && <tr><td colSpan={visible.length + 1} className={listStyles.detailCell}><div className={managementStyles.viewWidth}>
              <OrderDetailPanel id={row.id} access={access} onChanged={reload} />
            </div></td></tr>}
          </Fragment>)}
        </tbody></table>}
    </ManagementScroller>
  </ManagementLayout>;
}
