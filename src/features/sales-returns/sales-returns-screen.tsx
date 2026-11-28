"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { FilterGroup, FilterPills, HelpLink, ManagementLayout } from "@/components/ui/management-screen/management-layout";
import { ColumnPicker, ListStateMessage, ManagementPagination, ManagementScroller, SortableHeader, managementStyles, type SortState } from "@/components/ui/management-screen/management-table";
import { TimeRangeFilter } from "@/components/ui/management-screen/time-range-filter";
import { allTime, presetValue, type TimeRangeValue } from "@/components/ui/management-screen/time-range-model";
import { useStoredValue } from "@/components/ui/management-screen/use-stored-value";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { ZoneFilterField, useZoneFilter } from "@/features/api-workspace/zone-filter";
import { customerHref, invoiceHref } from "@/features/customers/customer-links";
import { operationAllowed } from "@/features/operations/permissions";
import { ErrorNotice, operationError, useMutation } from "@/features/operations/ui";
import { fmt, viDate, viDateTime } from "@/features/purchase-documents/document-parts";
import styles from "@/features/purchase-documents/purchases.module.css";
import { RailFinder, searchCustomers } from "@/features/sales-invoice-list/invoice-rail-finder";
import type { Picked } from "@/features/sales-invoice-list/invoice-list-logic";
import { orderHref } from "@/features/sales-orders/order-labels";
import listStyles from "@/features/suppliers-api/suppliers.module.css";
import { RETURN, type ReturnListQuery, type ReturnPage, type ReturnRow, type ReturnTotals } from "./return-contracts";
import { ReturnDetailPanel } from "./return-detail";
import { ReturnStatus, returnStatusLabel } from "./return-labels";
import { returnRepository } from "./repository";
import { DetailRow } from "@/components/ui/management-screen/detail-pane";

type Column = { key: string; label: string; sort?: string; numeric?: boolean; hidden?: boolean; render(row: ReturnRow): ReactNode; total?(totals: ReturnTotals): ReactNode };
const stop = (event: { stopPropagation(): void }) => event.stopPropagation();
const columns: readonly Column[] = [
  { key: "code", label: "Mã phiếu", sort: "code", render: (row) => <span className="font-mono tabular-nums">{row.code}</span> },
  { key: "time", label: "Thời gian", sort: "returnDate", render: (row) => row.recordedAt ? viDateTime(row.recordedAt) : viDate(row.returnDate) },
  { key: "invoice", label: "Hóa đơn", render: (row) => <Link className={styles.link} href={invoiceHref(row.invoiceCode)} onClick={stop}>{row.invoiceCode}</Link> },
  { key: "order", label: "Đơn đặt hàng", render: (row) => row.salesOrder ? <Link className={styles.link} href={orderHref(row.salesOrder.code)} onClick={stop}>{row.salesOrder.code}</Link> : "—" },
  { key: "customer", label: "Khách hàng", render: (row) => row.customer ? row.customer.code ? <Link className={styles.link} href={customerHref(row.customer.code)} onClick={stop}>{row.customer.name}</Link> : row.customer.name : "Khách lẻ" },
  { key: "zone", label: "Vùng", render: (row) => row.zoneCode || "—" },
  { key: "value", label: "Giá trị", sort: "value", numeric: true, render: (row) => fmt(row.value), total: (totals) => fmt(totals.value) },
  { key: "backForSale", label: "Kg bán lại", numeric: true, render: (row) => fmt(row.backForSaleKg), total: (totals) => fmt(totals.backForSaleKg) },
  { key: "discarded", label: "Kg hủy", numeric: true, render: (row) => fmt(row.discardedKg), total: (totals) => fmt(totals.discardedKg) },
  { key: "lines", label: "Số dòng", numeric: true, hidden: true, render: (row) => row.lineCount },
  { key: "recordedBy", label: "Người lập", hidden: true, render: (row) => row.recordedByName || "—" },
  { key: "status", label: "Trạng thái", render: (row) => <ReturnStatus statusId={row.statusId} /> },
];
const defaults = columns.filter((column) => !column.hidden).map((column) => column.key).join(",");
const emptyFilters = { status: "", customer: null as Picked | null };
type Filters = typeof emptyFilters;

/**
 * Trả hàng bán (CLAIM-03): the returns of the invoices of the zones the account may see. A return is made from an invoice (its detail, a claim accepted with a return offer or the lot's sales tab lead to the editor),
 * so the toolbar has no "+ Thêm". A link opens the list on one return by its code (`?code=TL000001`); the list is keyed by it so a link followed while the list is open starts it again.
 */
export function SalesReturnsScreen(props: { helpHref?: string }) {
  const linkedCode = useSearchParams()?.get("code") ?? "";
  return <ReturnsList key={linkedCode} linkedCode={linkedCode} {...props} />;
}

function ReturnsList({ helpHref, linkedCode }: { helpHref?: string; linkedCode: string }) {
  const { identity, permissions } = useApiWorkspace(), exportFile = useMutation(), linkPending = useRef(linkedCode);
  const allowed = (action: string) => operationAllowed("sales-returns", identity, permissions.functionPermissions, action);
  const view = allowed("View"), canCancel = allowed("Delete");
  const defaultTime = linkedCode ? allTime : presetValue("thisMonth");
  const [search, setSearch] = useState(linkedCode), [filters, setFilters] = useState<Filters>(emptyFilters), [time, setTime] = useState<TimeRangeValue>(defaultTime);
  const [sort, setSort] = useState<SortState>({ key: "code", direction: "desc" }), [page, setPage] = useState(1), [pageSize, setPageSize] = useState(10), [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<ReturnPage>(), [loading, setLoading] = useState(true), [error, setError] = useState<string>(), [expanded, setExpanded] = useState<string>();
  const [stored, store] = useStoredValue("omts-columns-sales-returns", defaults);
  const visible = useMemo(() => { const keys = stored.split(","), shown = columns.filter((column) => keys.includes(column.key)); return shown.length ? shown : columns; }, [stored]);
  const zone = useZoneFilter(), zoneIds = zone.apiZoneIds ?? "";

  // The filters as the list and the file take them; the file has no paging.
  const query = useMemo<ReturnListQuery>(() => {
    const values: ReturnListQuery = { search: search.trim(), statusId: filters.status, zoneIds, customerId: filters.customer?.id ?? "", from: time.from, to: time.to, sort: sort.key, sortDir: sort.direction };
    return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== "")) as ReturnListQuery;
  }, [search, filters, zoneIds, time, sort]);

  useEffect(() => {
    if (!view) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true); setError(undefined);
      void returnRepository.list({ ...query, page: String(page), pageSize: String(pageSize) }, controller.signal).then((result) => {
        if (controller.signal.aborted) return;
        setLoading(false);
        if (result.status === "success") {
          setData(result.data);
          if (linkPending.current) { const code = linkPending.current.toLowerCase(); linkPending.current = ""; const linked = result.data.items.find((row) => row.code.toLowerCase() === code); if (linked) setExpanded(linked.id); }
        } else { setData(undefined); setError(operationError(result)); }
      });
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [view, query, page, pageSize, refresh]);

  // The zone is the header selection: a change made in the header starts the list again at page 1 as well (state adjusted while rendering).
  const [seenZones, setSeenZones] = useState(zoneIds);
  if (seenZones !== zoneIds) { setSeenZones(zoneIds); setPage(1); setExpanded(undefined); }
  function changed<T>(apply: (value: T) => void) { return (value: T) => { apply(value); setPage(1); setExpanded(undefined); }; }
  const setFilter = <K extends keyof Filters>(key: K) => changed<Filters[K]>((value) => setFilters((current) => ({ ...current, [key]: value })));
  const reload = () => setRefresh((value) => value + 1);
  const hasFilter = filters.status !== "" || filters.customer !== null || time.from !== defaultTime.from || time.to !== defaultTime.to;
  const open = (id: string) => setExpanded((value) => value === id ? undefined : id);
  if (!view) return <p role="alert" className="rounded-card border border-border bg-surface p-6">Bạn không có quyền xem chức năng này.</p>;

  const rail = <>
    <div className={listStyles.railHead}><strong>Bộ lọc</strong><button type="button" className={managementStyles.linkButton} disabled={!hasFilter} onClick={() => changed<void>(() => { setFilters(emptyFilters); setTime(defaultTime); })()}>Đặt lại</button></div>
    <FilterPills legend="Trạng thái" name="return-status" value={filters.status} options={[RETURN.recorded, RETURN.cancelled].map((id) => [String(id), returnStatusLabel[id]] as const)} onChange={setFilter("status")} />
    <TimeRangeFilter legend="Thời gian trả" value={time} onChange={changed<TimeRangeValue>(setTime)} />
    <ZoneFilterField filter={zone} className={styles.railSelect} />
    <FilterGroup legend="Khách hàng"><RailFinder label="Tìm khách hàng" placeholder="Tên hoặc số điện thoại" icon="user" value={filters.customer} search={searchCustomers} onChange={setFilter("customer")} /></FilterGroup>
  </>;

  return <ManagementLayout storageKey="sales-returns" icon="receipt" title="Trả hàng bán" filters={rail} filterLabel="Bộ lọc phiếu trả hàng bán"
    footer={<ManagementPagination page={data?.page ?? page} pageSize={pageSize} total={data?.total ?? 0} unit="phiếu" disabled={loading} onPage={(next) => { setPage(next); setExpanded(undefined); }} onPageSize={changed<number>(setPageSize)} />}
    search={<input type="search" aria-label="Tìm phiếu trả hàng" placeholder="Theo mã phiếu, hóa đơn hoặc khách hàng" maxLength={100} value={search} onChange={(event) => changed<string>(setSearch)(event.target.value)} />}
    actions={<>
      <Button className="w-auto" variant="secondary" isPending={exportFile.pending} onClick={() => void exportFile.run(() => returnRepository.exportList(query), true)}><InterfaceIcon name="download" className="mr-1 size-4" />Xuất file</Button>
      <ColumnPicker columns={columns} visible={visible.map((column) => column.key)} onChange={(keys) => store(keys.join(","))} />
      <HelpLink helpHref={helpHref} />
    </>}>
    {exportFile.error && <div className={listStyles.feedback}><ErrorNotice error={exportFile.error} /></div>}
    <ManagementScroller busy={loading}>
      {error ? <ListStateMessage error={error} onRetry={reload} retryLabel="Tải lại" />
        : !data ? <div role="status" aria-label="Đang tải danh sách" className={listStyles.skeleton}>{[1, 2, 3, 4, 5].map((key) => <div key={key} />)}</div>
        : !data.items.length ? <ListStateMessage>{search || hasFilter || zoneIds ? "Không có phiếu trả hàng phù hợp bộ lọc." : "Chưa có phiếu trả hàng bán. Phiếu được tạo từ chi tiết hóa đơn bán hoặc từ khiếu nại đã chấp nhận trả lại hàng."}</ListStateMessage>
        : <table className={listStyles.table}><thead><tr>
          <th scope="col" className={listStyles.expandCell}><span className="sr-only">Mở dòng</span></th>
          {visible.map((column) => <SortableHeader key={column.key} label={column.label} sortKey={column.sort} sort={sort} onSort={changed<SortState>(setSort)} className={column.numeric ? styles.num : undefined} />)}
        </tr></thead><tbody>
          <tr className={styles.totalRow} aria-label="Tổng hợp theo bộ lọc"><td />{visible.map((column, index) => <td key={column.key} className={column.numeric ? styles.num : undefined}>{column.total ? column.total(data.totals) : index === 0 ? `Tổng (${fmt(data.total)} phiếu)` : null}</td>)}</tr>
          {data.items.map((row) => <Fragment key={row.id}>
            <OpenableTableRow data-selected={expanded === row.id || undefined} onOpen={() => open(row.id)}>
              <td className={listStyles.expandCell}><button type="button" aria-expanded={expanded === row.id} aria-label={`${expanded === row.id ? "Thu gọn" : "Mở"} ${row.code}`} onClick={() => open(row.id)}><InterfaceIcon name={expanded === row.id ? "chevron-down" : "chevron-right"} /></button></td>
              {visible.map((column) => <td key={column.key} className={column.numeric ? styles.num : undefined}>{column.render(row)}</td>)}
            </OpenableTableRow>
            {expanded === row.id && <DetailRow colSpan={visible.length + 1} className={listStyles.detailCell}><div className={managementStyles.viewWidth}>
              <ReturnDetailPanel id={row.id} canCancel={canCancel} onChanged={reload} />
            </div></DetailRow>}
          </Fragment>)}
        </tbody></table>}
    </ManagementScroller>
  </ManagementLayout>;
}
