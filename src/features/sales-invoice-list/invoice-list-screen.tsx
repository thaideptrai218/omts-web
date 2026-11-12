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
import { SelectBox } from "@/components/ui/select-box";
import { customerHref } from "@/features/customers/customer-links";
import { ErrorNotice, businessToday, operationError, useMutation } from "@/features/operations/ui";
import { fmt, viDate, viDateTime } from "@/features/purchase-documents/document-parts";
import styles from "@/features/purchase-documents/purchases.module.css";
import { orderHref } from "@/features/sales-orders/order-labels";
import listStyles from "@/features/suppliers-api/suppliers.module.css";
import { InvoiceDetailPanel } from "./invoice-detail";
import { searchResult, type ListRow, type SearchResult } from "./invoice-list-contracts";
import { paymentTerm } from "./invoice-labels";
import { emptyFilters, timeProblem, toQuery, type Filters } from "./invoice-list-logic";
import { RailFinder, searchCustomers, searchLots } from "./invoice-rail-finder";
import { DeliveryStatus, INVOICE, InvoiceStatus, PaidStatus } from "./invoice-status";
import { invoiceRepository, useInvoiceAccess } from "./use-invoice-list";

type Column = { key: string; label: string; numeric?: boolean; hidden?: boolean; render(row: ListRow): ReactNode };
const stop = (event: { stopPropagation(): void }) => event.stopPropagation();
const dash = (value: string | null | undefined) => value || "—";
const columns: readonly Column[] = [
  { key: "code", label: "Mã hóa đơn", render: (row) => <span className="font-mono tabular-nums">{row.code}</span> },
  { key: "order", label: "Mã DH", render: (row) => row.salesOrder ? <Link className={styles.link} href={orderHref(row.salesOrder.code)} onClick={stop}>{row.salesOrder.code}</Link> : "—" },
  { key: "time", label: "Thời gian", render: (row) => viDateTime(row.invoicedAt) },
  { key: "zone", label: "Vùng", render: (row) => row.zone.code },
  { key: "customerCode", label: "Mã KH", render: (row) => row.customer?.code ? <Link className={styles.link} href={customerHref(row.customer.code)} onClick={stop}>{row.customer.code}</Link> : "—" },
  { key: "customer", label: "Khách hàng", render: (row) => row.customer?.name ?? "Khách lẻ" },
  { key: "phone", label: "SĐT", render: (row) => dash(row.customer?.phoneNumber) },
  { key: "total", label: "Tổng tiền", numeric: true, render: (row) => fmt(row.total) },
  { key: "status", label: "Trạng thái", render: (row) => <InvoiceStatus statusId={row.statusId} /> },
  { key: "term", label: "Hình thức thanh toán", render: (row) => paymentTerm(row.paymentTerm) },
  { key: "paid", label: "Thanh toán", render: (row) => <><PaidStatus isPaid={row.isPaid} />
    {row.isPaid === false && row.unpaidAmount > 0 && <span className={styles.sub}>Còn {fmt(row.unpaidAmount)}</span>}
    {row.cashAwaitingConfirmation != null && <span className={styles.sub}>Tiền mặt chờ xác nhận {fmt(row.cashAwaitingConfirmation)}</span>}</> },
  { key: "delivery", label: "Gửi hóa đơn", render: (row) => row.statusId === INVOICE.cancelled ? "—" : <DeliveryStatus statusId={row.deliveryStatusId} /> },
];
const defaults = columns.filter((column) => !column.hidden).map((column) => column.key).join(",");
// The list API has no sort parameter: the headers are the shared sortable header without a sort key, so they stay plain until the API has one.
const unsorted: SortState = { key: "", direction: "desc" };
const ignoreSort = () => undefined;
const pageSizes = [20, 50, 100];

/** SCR-SALE-05 Hóa đơn bán: danh sách hóa đơn của các vùng bạn được xem, lọc theo kỳ/vùng/khách/lô/trạng thái, chi tiết mở dưới dòng và các lệnh theo quyền (SALE-09). Cùng khung với màn Nhập hàng. */
export function SalesInvoiceListScreen(props: { helpHref?: string }) {
  const linkedCode = useSearchParams()?.get("code") ?? "";
  return <InvoiceList key={linkedCode} linkedCode={linkedCode} {...props} />;
}

/**
 * A link opens this list on one invoice by its code (`?code=HD000123`). The list is keyed by that code so a link followed while the list is already open
 * starts it again: the search box shows the code, the longest period is searched and the invoice with exactly that code opens.
 */
function InvoiceList({ helpHref, linkedCode }: { helpHref?: string; linkedCode: string }) {
  const access = useInvoiceAccess(), exportFile = useMutation(), [today] = useState(businessToday), linkPending = useRef(linkedCode);
  const [search, setSearch] = useState(linkedCode), [filters, setFilters] = useState<Filters>(emptyFilters), [time, setTime] = useState<TimeRangeValue>(() => linkedCode ? allTime : presetValue("thisMonth"));
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(pageSizes[0]), [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<SearchResult>(), [loading, setLoading] = useState(true), [error, setError] = useState<string>(), [expanded, setExpanded] = useState<string>();
  const [stored, store] = useStoredValue("omts-columns-sales-invoice-list", defaults);
  const visible = useMemo(() => { const keys = stored.split(","), shown = columns.filter((column) => keys.includes(column.key)); return shown.length ? shown : columns; }, [stored]);
  const problem = timeProblem(time), query = useMemo(() => toQuery({ search, time, filters }, today), [search, time, filters, today]);

  useEffect(() => {
    if (!access.view || problem) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true); setError(undefined);
      void invoiceRepository.read("list", { ...query, page: String(page), pageSize: String(pageSize) }, searchResult, controller.signal).then((result) => {
        if (controller.signal.aborted) return;
        setLoading(false);
        if (result.status === "success") {
          setData(result.data);
          if (linkPending.current) { const code = linkPending.current.toLowerCase(); linkPending.current = ""; const linked = result.data.page.items.find((row) => row.code.toLowerCase() === code); if (linked) setExpanded(linked.id); }
        } else { setData(undefined); setError(operationError(result)); }
      });
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [access.view, problem, query, page, pageSize, refresh]);

  function changed<T>(apply: (value: T) => void) { return (value: T) => { apply(value); setPage(1); setExpanded(undefined); }; }
  const setFilter = <K extends keyof Filters>(key: K) => changed<Filters[K]>((value) => setFilters((current) => ({ ...current, [key]: value })));
  const reload = () => setRefresh((value) => value + 1);
  const defaultTime = linkedCode ? allTime : presetValue("thisMonth");
  const hasFilter = JSON.stringify(filters) !== JSON.stringify(emptyFilters) || time.from !== defaultTime.from || time.to !== defaultTime.to;
  const open = (id: string) => setExpanded((value) => value === id ? undefined : id);
  if (!access.view) return <p role="alert" className="rounded-card border border-border bg-surface p-6">Bạn không có quyền xem chức năng này.</p>;

  const rail = <>
    <div className={listStyles.railHead}><strong>Bộ lọc</strong><button type="button" className={managementStyles.linkButton} onClick={() => changed<void>(() => { setFilters(emptyFilters); setTime(presetValue("thisMonth")); })()}>Đặt lại</button></div>
    <FilterPills legend="Trạng thái" name="invoice-status" value={filters.status} options={[[String(INVOICE.completed), "Hoàn thành"], [String(INVOICE.cancelled), "Đã hủy"]]} onChange={(value) => setFilter("status")(value as Filters["status"])} />
    <TimeRangeFilter legend="Thời gian" value={time} onChange={changed<TimeRangeValue>(setTime)} />
    <FilterGroup legend="Vùng"><SelectBox aria-label="Vùng" className={styles.railSelect} value={filters.zoneId} onChange={(event) => setFilter("zoneId")(event.target.value)}>
      <option value="">Tất cả vùng của tôi</option>{access.zoneOptions.map((zone) => <option key={zone.id} value={zone.id}>{zone.label}</option>)}</SelectBox></FilterGroup>
    <FilterGroup legend="Khách hàng"><RailFinder label="Tìm khách hàng" placeholder="Tên hoặc số điện thoại" icon="user" value={filters.customer} search={searchCustomers} onChange={setFilter("customer")} /></FilterGroup>
    <FilterGroup legend="Lô thu hoạch"><RailFinder label="Tìm lô thu hoạch" placeholder="Mã lô, ví dụ B03" icon="product" minLength={2} value={filters.lot} search={searchLots} onChange={setFilter("lot")} /></FilterGroup>
    <FilterPills legend="Tình trạng thu tiền" name="invoice-paid" value={filters.paid} options={[["true", "Đã trả đủ"], ["false", "Còn nợ"]]} onChange={(value) => setFilter("paid")(value as Filters["paid"])} />
    <FilterGroup legend="Tiền mặt"><div className={managementStyles.pills}><label className={managementStyles.pill}><input type="checkbox" className="sr-only" checked={filters.cashMine} onChange={(event) => setFilter("cashMine")(event.target.checked)} />Tôi thu, chưa được xác nhận</label></div></FilterGroup>
  </>;
  const failure = problem ?? error;

  return <ManagementLayout storageKey="sales-invoice-list" icon="receipt" title="Hóa đơn bán" filters={rail} filterLabel="Bộ lọc hóa đơn"
    footer={<ManagementPagination page={data?.page.page ?? page} pageSize={pageSize} total={data?.page.total ?? 0} pageSizes={pageSizes} unit="hóa đơn" disabled={loading} onPage={(next) => { setPage(next); setExpanded(undefined); }} onPageSize={changed<number>(setPageSize)} />}
    search={<input type="search" aria-label="Tìm hóa đơn" placeholder="Theo mã hóa đơn" maxLength={50} value={search} onChange={(event) => changed<string>(setSearch)(event.target.value)} />}
    actions={<>
      {access.exportFile && <Button className="w-auto" variant="secondary" isPending={exportFile.pending} onClick={() => void exportFile.run(() => invoiceRepository.download(query), true)}><InterfaceIcon name="download" className="mr-1 size-4" />Xuất file</Button>}
      <ColumnPicker columns={columns} visible={visible.map((column) => column.key)} onChange={(keys) => store(keys.join(","))} />
      <HelpLink helpHref={helpHref} />
    </>}>
    {exportFile.error && <div className={listStyles.feedback}><ErrorNotice error={exportFile.error} /></div>}
    {data && !failure && <p className={styles.summary}>Số hóa đơn <strong>{data.page.total}</strong> · Tổng tiền hóa đơn hoàn thành <strong>{fmt(data.completedTotal)}</strong> <span>(kỳ xem {data.from === data.to ? viDate(data.from) : `${viDate(data.from)} – ${viDate(data.to)}`})</span></p>}
    <ManagementScroller busy={loading}>
      {failure ? <ListStateMessage error={failure} onRetry={problem ? undefined : reload} retryLabel="Tải lại" />
        : !data ? <div role="status" aria-label="Đang tải danh sách" className={listStyles.skeleton}>{[1, 2, 3, 4, 5].map((key) => <div key={key} />)}</div>
        : !data.page.items.length ? <ListStateMessage>{search || hasFilter ? "Không có hóa đơn phù hợp bộ lọc." : "Chưa có hóa đơn trong kỳ này. Chọn kỳ rộng hơn để xem các hóa đơn trước đó."}</ListStateMessage>
        : <table className={listStyles.table}><thead><tr>
          <th scope="col" className={listStyles.expandCell}><span className="sr-only">Mở dòng</span></th>
          {visible.map((column) => <SortableHeader key={column.key} label={column.label} sort={unsorted} onSort={ignoreSort} className={column.numeric ? styles.num : undefined} />)}
        </tr></thead><tbody>
          {data.page.items.map((row) => <Fragment key={row.id}>
            <OpenableTableRow data-selected={expanded === row.id || undefined} onOpen={() => open(row.id)}>
              <td className={listStyles.expandCell}><button type="button" aria-expanded={expanded === row.id} aria-label={`${expanded === row.id ? "Thu gọn" : "Mở"} ${row.code}`} onClick={() => open(row.id)}><InterfaceIcon name={expanded === row.id ? "chevron-down" : "chevron-right"} /></button></td>
              {visible.map((column) => <td key={column.key} className={column.numeric ? styles.num : undefined}>{column.render(row)}</td>)}
            </OpenableTableRow>
            {expanded === row.id && <tr><td colSpan={visible.length + 1} className={listStyles.detailCell}><div className={managementStyles.viewWidth}><InvoiceDetailPanel id={row.id} canExport={access.exportFile} onChanged={reload} /></div></td></tr>}
          </Fragment>)}
        </tbody></table>}
    </ManagementScroller>
  </ManagementLayout>;
}
