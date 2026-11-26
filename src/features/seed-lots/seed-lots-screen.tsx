"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { FilterGroup, HelpLink, ManagementLayout } from "@/components/ui/management-screen/management-layout";
import { ColumnPicker, ListStateMessage, ManagementPagination, ManagementScroller, SortableHeader, managementStyles, type SortState } from "@/components/ui/management-screen/management-table";
import { TimeRangeFilter } from "@/components/ui/management-screen/time-range-filter";
import { allTime, type TimeRangeValue } from "@/components/ui/management-screen/time-range-model";
import { useStoredValue } from "@/components/ui/management-screen/use-stored-value";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import { SelectBox } from "@/components/ui/select-box";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import issueStyles from "@/features/input-issues/input-issues.module.css";
import { useZoneOptions } from "@/features/input-issues/issue-access";
import { itemHref, kindOfGroup, receiptHref } from "@/features/input-items/stock-kind";
import { operationAllowed } from "@/features/operations/permissions";
import { ErrorNotice, operationError, useMutation } from "@/features/operations/ui";
import { productHref } from "@/features/products/product-helpers";
import { fmt, viDateTime } from "@/features/purchase-documents/document-parts";
import { usePurchaseLookups } from "@/features/purchase-documents/repository";
import { supplierHref } from "@/features/purchase-documents/receipt-detail";
import listStyles from "@/features/suppliers-api/suppliers.module.css";
import type { SeedLotListQuery, SeedLotPage, SeedLotRow, SeedLotTotals } from "./contracts";
import { SeedLotDetailPanel } from "./seed-lot-detail";
import { SeedLotProgressCell, kgText } from "./seed-lot-progress";
import { seedLotRepository } from "./repository";
import { DetailRow } from "@/components/ui/management-screen/detail-pane";

type Column = { key: string; label: string; sort?: string; numeric?: boolean; hidden?: boolean; render(row: SeedLotRow): ReactNode; total?: keyof SeedLotRow };
const stop = (event: { stopPropagation(): void }) => event.stopPropagation();
const linked = (href: string, text: ReactNode) => <Link className={issueStyles.link} href={href} onClick={stop}>{text}</Link>;
const figure = (row: SeedLotRow, key: "receivedQty" | "returnedQty" | "nursingQty" | "nurseryLossQty" | "seededQty" | "remainingQty") => `${fmt(row[key])}`;
export const columns: readonly Column[] = [
  { key: "code", label: "Mã lô giống", sort: "code", render: (row) => <span className="font-mono tabular-nums">{row.seedLotCode}</span> },
  { key: "receipt", label: "Phiếu nhập", render: (row) => linked(receiptHref(row.receiptCode, "Seed"), row.receiptCode) },
  { key: "receivedAt", label: "Ngày nhập", sort: "receivedAt", render: (row) => viDateTime(row.receivedAt) },
  { key: "supplier", label: "Nhà cung cấp", render: (row) => linked(supplierHref({ supplier: row.supplier }), row.supplier.name) },
  { key: "item", label: "Giống", render: (row) => row.item.code ? linked(itemHref(row.item.code, "Seed"), row.item.name) : row.item.name },
  { key: "product", label: "Sản phẩm", render: (row) => row.product?.code ? linked(productHref(row.product.code), row.product.name) : row.product?.name ?? "—" },
  { key: "unit", label: "ĐVT", hidden: true, render: (row) => row.unitName },
  { key: "received", label: "Nhập", numeric: true, total: "receivedQty", render: (row) => figure(row, "receivedQty") },
  { key: "returned", label: "Trả", hidden: true, numeric: true, total: "returnedQty", render: (row) => figure(row, "returnedQty") },
  { key: "nursing", label: "Đang ươm", hidden: true, numeric: true, total: "nursingQty", render: (row) => figure(row, "nursingQty") },
  { key: "loss", label: "Hao hụt", hidden: true, numeric: true, total: "nurseryLossQty", render: (row) => figure(row, "nurseryLossQty") },
  { key: "seeded", label: "Đã treo", hidden: true, numeric: true, total: "seededQty", render: (row) => figure(row, "seededQty") },
  { key: "remaining", label: "Còn", sort: "remaining", numeric: true, total: "remainingQty", render: (row) => figure(row, "remainingQty") },
  { key: "progress", label: "Tiến độ sử dụng", render: (row) => <SeedLotProgressCell lot={row} /> },
  { key: "harvested", label: "Thu hoạch (kg)", numeric: true, render: (row) => kgText(row, row.harvestedKg) },
  { key: "sold", label: "Đã bán (kg)", numeric: true, render: (row) => kgText(row, row.soldKg) },
  { key: "lastUsed", label: "Dùng gần nhất", hidden: true, render: (row) => row.lastUsedAt ? viDateTime(row.lastUsedAt) : "—" },
];
const defaults = columns.filter((column) => !column.hidden).map((column) => column.key).join(",");
const emptyFilters = { supplier: "", item: "", zone: "" };
type Filters = typeof emptyFilters;
const railSelect = "h-[30px] w-full rounded-md border border-border-strong bg-surface px-2 text-[13px]";
/** The sum of a figure column, from the totals of the API; a column it does not total shows a dash. */
const totalOf = (totals: SeedLotTotals, key: keyof SeedLotRow) => typeof totals[key] === "number" ? fmt(totals[key]) : "—";

/**
 * A link opens this list on one seed lot by its code (`?code=PN000004-1`). The list is keyed by that code so a link followed while the list is already open starts it again:
 * the search box shows the code, every state and date is shown and the row with exactly that code opens.
 */
export function SeedLotsScreen(props: { helpHref?: string }) {
  const linkedCode = useSearchParams().get("code") ?? "";
  return <SeedLotsList key={linkedCode} linkedCode={linkedCode} {...props} />;
}

function SeedLotsList({ helpHref, linkedCode }: { helpHref?: string; linkedCode: string }) {
  const { identity, permissions } = useApiWorkspace(), exportFile = useMutation(), lookups = usePurchaseLookups();
  const view = operationAllowed("seed-lots", identity, permissions.functionPermissions, "View"), mayExport = operationAllowed("seed-lots", identity, permissions.functionPermissions, "Export");
  const linkPending = useRef(linkedCode);
  const [search, setSearch] = useState(linkedCode), [filters, setFilters] = useState<Filters>(emptyFilters), [time, setTime] = useState<TimeRangeValue>(allTime);
  const [sort, setSort] = useState<SortState>({ key: "code", direction: "desc" }), [page, setPage] = useState(1), [pageSize, setPageSize] = useState(10), [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<SeedLotPage>(), [loading, setLoading] = useState(true), [error, setError] = useState<string>(), [expanded, setExpanded] = useState<string>();
  const [stored, store] = useStoredValue("omts-columns-seed-lots-v2", defaults);
  const visible = useMemo(() => { const keys = stored.split(","), shown = columns.filter((column) => keys.includes(column.key)); return shown.length ? shown : columns; }, [stored]);
  const { zones } = useZoneOptions(view);
  const seedItems = useMemo(() => lookups.items.filter((item) => kindOfGroup(item.group) === "Seed"), [lookups.items]);

  // The filters as the list and the file take them; the file has no paging.
  const query = useMemo<SeedLotListQuery>(() => {
    const values: SeedLotListQuery = { search: search.trim(), from: time.from, to: time.to, supplierId: filters.supplier, itemId: filters.item, zoneId: filters.zone, sort: sort.key, sortDir: sort.direction };
    return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== "")) as SeedLotListQuery;
  }, [search, filters, time, sort]);

  useEffect(() => {
    if (!view) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true); setError(undefined);
      void seedLotRepository.list({ ...query, page: String(page), pageSize: String(pageSize) }, controller.signal).then((result) => {
        if (controller.signal.aborted) return;
        setLoading(false);
        if (result.status === "success") {
          setData(result.data);
          if (linkPending.current) { const code = linkPending.current.toLowerCase(); linkPending.current = ""; const found = result.data.items.find((row) => row.seedLotCode.toLowerCase() === code); if (found) setExpanded(found.id); }
          if (result.data.total > 0 && page > Math.ceil(result.data.total / pageSize)) setPage(Math.ceil(result.data.total / pageSize));
        } else { setData(undefined); setError(operationError(result)); }
      });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [view, query, page, pageSize, refresh]);

  function changed<T>(apply: (value: T) => void) { return (value: T) => { apply(value); setPage(1); setExpanded(undefined); }; }
  const setFilter = (key: keyof Filters) => changed<string>((value) => setFilters((current) => ({ ...current, [key]: value })));
  const reload = () => setRefresh((value) => value + 1);
  const hasFilter = Object.values(filters).some((value) => value !== "") || time.kind !== allTime.kind || time.from !== allTime.from || time.to !== allTime.to;
  const toggle = (id: string) => setExpanded((value) => value === id ? undefined : id);
  if (!view) return <p role="alert" className="rounded-card border border-border bg-surface p-6">Bạn không có quyền xem chức năng này.</p>;

  const rail = <>
    <div className={listStyles.railHead}><strong>Bộ lọc</strong><button type="button" className={managementStyles.linkButton} disabled={!hasFilter} onClick={() => changed<void>(() => { setFilters(emptyFilters); setTime(allTime); })()}>Đặt lại</button></div>
    <TimeRangeFilter legend="Ngày nhập" value={time} onChange={changed<TimeRangeValue>(setTime)} />
    <FilterGroup legend="Nhà cung cấp"><SelectBox aria-label="Nhà cung cấp" className={railSelect} value={filters.supplier} onChange={(event) => setFilter("supplier")(event.target.value)}>
      <option value="">Tất cả nhà cung cấp</option>{lookups.suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</SelectBox></FilterGroup>
    <FilterGroup legend="Giống"><SelectBox aria-label="Giống" className={railSelect} value={filters.item} onChange={(event) => setFilter("item")(event.target.value)}>
      <option value="">Tất cả giống</option>{seedItems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</SelectBox></FilterGroup>
    {zones.length > 0 && <FilterGroup legend="Vùng"><SelectBox aria-label="Vùng" className={railSelect} value={filters.zone} onChange={(event) => setFilter("zone")(event.target.value)}>
      <option value="">Tất cả vùng</option>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.code || zone.name}</option>)}</SelectBox></FilterGroup>}
  </>;

  return <ManagementLayout storageKey="seed-lots" icon="product" title="Lô giống" filters={rail} filterLabel="Bộ lọc lô giống"
    footer={<ManagementPagination page={data?.page ?? page} pageSize={pageSize} total={data?.total ?? 0} unit="lô" disabled={loading} onPage={(next) => { setPage(next); setExpanded(undefined); }} onPageSize={changed<number>(setPageSize)} />}
    search={<input type="search" aria-label="Tìm lô giống" placeholder="Theo mã lô giống, mã phiếu nhập hoặc tên giống" maxLength={100} value={search} onChange={(event) => changed<string>(setSearch)(event.target.value)} />}
    actions={<>
      {mayExport && <Button className="w-auto" variant="secondary" isPending={exportFile.pending} onClick={() => void exportFile.run(() => seedLotRepository.exportList(query), true)}><InterfaceIcon name="download" className="mr-1 size-4" />Xuất file</Button>}
      <ColumnPicker columns={columns} visible={visible.map((column) => column.key)} onChange={(keys) => store(keys.join(","))} />
      <HelpLink helpHref={helpHref} />
    </>}>
    {exportFile.error && <div className={listStyles.feedback}><ErrorNotice error={exportFile.error} /></div>}
    <ManagementScroller busy={loading}>
      {error ? <ListStateMessage error={error} onRetry={reload} retryLabel="Tải lại" />
        : !data ? <div role="status" aria-label="Đang tải danh sách" className={listStyles.skeleton}>{[1, 2, 3, 4, 5].map((key) => <div key={key} />)}</div>
        : !data.items.length ? <ListStateMessage>{search || hasFilter ? "Không có lô giống phù hợp bộ lọc." : "Chưa có lô giống. Lô giống có khi phiếu Nhập giống được hoàn thành."}</ListStateMessage>
        : <table className={listStyles.table}><thead><tr>
          <th scope="col" className={listStyles.expandCell}><span className="sr-only">Mở dòng</span></th>
          {visible.map((column) => <SortableHeader key={column.key} label={column.label} sortKey={column.sort} sort={sort} onSort={changed<SortState>(setSort)} className={column.numeric ? issueStyles.num : undefined} />)}
        </tr></thead><tbody>
          <tr className={issueStyles.totalRow} aria-label="Tổng hợp theo bộ lọc"><td />{visible.map((column, index) => <td key={column.key} className={column.numeric ? issueStyles.num : undefined}>{column.total ? totalOf(data.totals, column.total) : index === 0 ? `Tổng (${fmt(data.total)} lô)` : null}</td>)}</tr>
          {data.items.map((row) => <Fragment key={row.id}>
            <OpenableTableRow data-selected={expanded === row.id || undefined} onOpen={() => toggle(row.id)}>
              <td className={listStyles.expandCell}><button type="button" aria-expanded={expanded === row.id} aria-label={`${expanded === row.id ? "Thu gọn" : "Mở"} ${row.seedLotCode}`} onClick={() => toggle(row.id)}><InterfaceIcon name={expanded === row.id ? "chevron-down" : "chevron-right"} /></button></td>
              {visible.map((column) => <td key={column.key} className={column.numeric ? issueStyles.num : undefined}>{column.render(row)}</td>)}
            </OpenableTableRow>
            {expanded === row.id && <DetailRow colSpan={visible.length + 1} className={listStyles.detailCell}><div className={managementStyles.viewWidth}><SeedLotDetailPanel key={row.id} id={row.id} /></div></DetailRow>}
          </Fragment>)}
        </tbody></table>}
    </ManagementScroller>
  </ManagementLayout>;
}
