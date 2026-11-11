"use client";
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
import { useZoneOptions } from "@/features/input-issues/issue-access";
import issueStyles from "@/features/input-issues/input-issues.module.css";
import type { ListQuery } from "@/features/input-items/repository";
import { ErrorNotice, useMutation, useRemote } from "@/features/operations/ui";
import { fmt, viDateTime } from "@/features/purchase-documents/document-parts";
import { DISPOSAL, type DisposalPage, type DisposalRow, type ProductRow } from "@/features/products/contracts";
import { useDisposalAccess } from "@/features/products/product-access";
import { disposalRepository, errorText, productRepository } from "@/features/products/repository";
import listStyles from "@/features/suppliers-api/suppliers.module.css";
import { DisposalDetailPanel } from "./disposal-detail";
import { DISPOSALS_PATH, DisposalStatus } from "./disposal-parts";

type Column = { key: string; label: string; sort?: string; numeric?: boolean; hidden?: boolean; render(row: DisposalRow): ReactNode };
const dash = (value: string | null | undefined) => value || "—";
const columns: readonly Column[] = [
  { key: "code", label: "Mã phiếu", sort: "code", render: (row) => <span className="font-mono tabular-nums">{row.code}</span> },
  { key: "time", label: "Thời gian", sort: "disposedAt", render: (row) => viDateTime(row.disposedAt) },
  { key: "zone", label: "Vùng", render: (row) => dash(row.zoneCode) },
  { key: "reason", label: "Lý do", render: (row) => dash(row.reason) },
  { key: "kg", label: "Tổng số kg hủy", sort: "totalKg", numeric: true, render: (row) => fmt(row.totalKg) },
  { key: "createdBy", label: "Người tạo", hidden: true, render: (row) => dash(row.createdBy) },
  { key: "notes", label: "Ghi chú", hidden: true, render: (row) => dash(row.notes) },
  { key: "status", label: "Trạng thái", sort: "status", render: (row) => <DisposalStatus statusId={row.statusId} /> },
];
const emptyFilters = { status: "", zone: "", product: "" };
type Filters = typeof emptyFilters;
const statuses: readonly (readonly [string, string])[] = [["Draft", "Phiếu tạm"], ["Completed", "Hoàn thành"], ["Cancelled", "Đã hủy"]];
const railSelect = "h-[30px] w-full rounded-md border border-border-strong bg-surface px-2 text-[13px]";

/**
 * A link opens this list on one document by its code (`?code=XHS000001`). The list is keyed by that code so a link followed while the list
 * is already open starts it again: the search box shows the code and the row with exactly that code opens.
 */
export function DisposalsScreen(props: { helpHref?: string }) {
  const linkedCode = useSearchParams().get("code") ?? "";
  return <DisposalsList key={linkedCode} linkedCode={linkedCode} {...props} />;
}

function DisposalsList({ helpHref, linkedCode }: { helpHref?: string; linkedCode: string }) {
  const access = useDisposalAccess(), router = useRouter(), exportFile = useMutation();
  const linkPending = useRef(linkedCode);
  const [search, setSearch] = useState(linkedCode), [filters, setFilters] = useState<Filters>(emptyFilters);
  const [time, setTime] = useState<TimeRangeValue>(() => linkedCode ? allTime : presetValue("thisMonth"));
  const [sort, setSort] = useState<SortState>({ key: "code", direction: "desc" }), [page, setPage] = useState(1), [pageSize, setPageSize] = useState(15), [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<DisposalPage>(), [loading, setLoading] = useState(true), [error, setError] = useState<string>(), [expanded, setExpanded] = useState<string>();
  const defaults = useMemo(() => columns.filter((column) => !column.hidden).map((column) => column.key).join(","), []);
  const [stored, store] = useStoredValue("omts-columns-product-disposals", defaults);
  const visible = useMemo(() => { const keys = stored.split(","), shown = columns.filter((column) => keys.includes(column.key)); return shown.length ? shown : columns; }, [stored]);
  const { zones } = useZoneOptions();
  const products = useRemote<ProductRow[]>(useCallback((signal: AbortSignal) => access.view ? productRepository.all({}, signal) : Promise.resolve({ status: "success" as const, data: [] }), [access.view]));

  const query = useMemo<ListQuery>(() => {
    const values: Record<string, string> = { search: search.trim(), status: filters.status, from: time.from, to: time.to, zoneId: filters.zone, productId: filters.product, sortBy: sort.key, sortDir: sort.direction };
    return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== ""));
  }, [search, filters, time, sort]);

  useEffect(() => {
    if (!access.view) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true); setError(undefined);
      void disposalRepository.list({ ...query, page: String(page), pageSize: String(pageSize) }, controller.signal).then((result) => {
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
  const reload = () => setRefresh((value) => value + 1);
  const defaultTime = linkedCode ? allTime : presetValue("thisMonth");
  const hasFilter = Object.values(filters).some((value) => value !== "") || time.kind !== defaultTime.kind || time.from !== defaultTime.from || time.to !== defaultTime.to;
  const toggle = (id: string) => setExpanded((value) => value === id ? undefined : id);
  if (!access.view) return <p role="alert" className="rounded-card border border-border bg-surface p-6">Bạn không có quyền xem chức năng này.</p>;

  const rail = <>
    <div className={listStyles.railHead}><strong>Bộ lọc</strong><button type="button" className={managementStyles.linkButton} disabled={!hasFilter} onClick={() => changed<void>(() => { setFilters(emptyFilters); setTime(presetValue("thisMonth")); })()}>Đặt lại</button></div>
    <FilterPills legend="Trạng thái" name="disposal-status" value={filters.status} options={statuses} onChange={setFilter("status")} />
    <TimeRangeFilter legend="Thời gian" value={time} onChange={changed<TimeRangeValue>(setTime)} />
    <FilterGroup legend="Vùng"><SelectBox aria-label="Vùng" className={railSelect} value={filters.zone} onChange={(event) => setFilter("zone")(event.target.value)}>
      <option value="">Tất cả vùng</option>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.code || zone.name}</option>)}</SelectBox></FilterGroup>
    {!!products.data?.length && <FilterGroup legend="Sản phẩm"><SelectBox aria-label="Sản phẩm" className={railSelect} value={filters.product} onChange={(event) => setFilter("product")(event.target.value)}>
      <option value="">Tất cả sản phẩm</option>{products.data.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</SelectBox></FilterGroup>}
  </>;
  const summary = data?.summary;

  return <ManagementLayout storageKey="product-disposals" icon="trash" title="Xuất hủy hàu" filters={rail} filterLabel="Bộ lọc phiếu xuất hủy hàu"
    footer={<ManagementPagination page={data?.page ?? page} pageSize={pageSize} total={data?.total ?? 0} unit="phiếu" disabled={loading} onPage={(next) => { setPage(next); setExpanded(undefined); }} onPageSize={changed<number>(setPageSize)} />}
    search={<input type="search" aria-label="Tìm phiếu xuất hủy hàu" placeholder="Theo mã phiếu, ghi chú hoặc lý do" maxLength={200} value={search} onChange={(event) => changed<string>(setSearch)(event.target.value)} />}
    actions={<>
      {access.create && <Button className="w-auto" onClick={() => router.push(`${DISPOSALS_PATH}/new`)}><InterfaceIcon name="add" className="mr-1 size-4" />Tạo mới</Button>}
      {access.exportFile && <Button className="w-auto" variant="secondary" isPending={exportFile.pending} onClick={() => void exportFile.run(() => disposalRepository.exportList(query), true)}><InterfaceIcon name="download" className="mr-1 size-4" />Xuất file</Button>}
      <ColumnPicker columns={columns} visible={visible.map((column) => column.key)} onChange={(keys) => store(keys.join(","))} />
      <HelpLink helpHref={helpHref} />
    </>}>
    {exportFile.error && <div className={listStyles.feedback}><ErrorNotice error={exportFile.error} /></div>}
    <ManagementScroller busy={loading}>
      {error ? <ListStateMessage error={error} onRetry={reload} retryLabel="Tải lại" />
        : !data ? <div role="status" aria-label="Đang tải danh sách" className={listStyles.skeleton}>{[1, 2, 3, 4, 5].map((key) => <div key={key} />)}</div>
        : !data.items.length ? <ListStateMessage>{search || hasFilter ? "Không có phiếu xuất hủy hàu phù hợp bộ lọc." : access.create ? "Chưa có phiếu xuất hủy hàu. Bấm Tạo mới để lập phiếu." : "Chưa có phiếu xuất hủy hàu."}</ListStateMessage>
        : <table className={listStyles.table}><thead><tr>
          <th scope="col" className={listStyles.expandCell}><span className="sr-only">Mở dòng</span></th>
          {visible.map((column) => <SortableHeader key={column.key} label={column.label} sortKey={column.sort} sort={sort} onSort={changed<SortState>(setSort)} className={column.numeric ? issueStyles.num : undefined} />)}
        </tr></thead><tbody>
          {summary && <tr className={issueStyles.totalRow} aria-label="Tổng hợp theo bộ lọc"><td />{visible.map((column, index) => <td key={column.key} className={column.numeric ? issueStyles.num : undefined}>{column.key === "kg" ? fmt(summary.totalKg) : index === 0 ? "Tổng (phiếu hoàn thành)" : null}</td>)}</tr>}
          {data.items.map((row) => <Fragment key={row.id}>
            <OpenableTableRow data-selected={expanded === row.id || undefined} onOpen={() => toggle(row.id)}>
              <td className={listStyles.expandCell}><button type="button" aria-expanded={expanded === row.id} aria-label={`${expanded === row.id ? "Thu gọn" : "Mở"} ${row.code}`} onClick={() => toggle(row.id)}><InterfaceIcon name={expanded === row.id ? "chevron-down" : "chevron-right"} /></button></td>
              {visible.map((column) => <td key={column.key} className={`${column.numeric ? issueStyles.num : ""} ${row.statusId === DISPOSAL.cancelled ? issueStyles.muted : ""}`.trim() || undefined}>{column.render(row)}</td>)}
            </OpenableTableRow>
            {expanded === row.id && <tr><td colSpan={visible.length + 1} className={listStyles.detailCell}><div className={managementStyles.viewWidth}>
              <DisposalDetailPanel id={row.id} access={access} onChanged={reload} onRemoved={() => { setExpanded(undefined); reload(); }} />
            </div></td></tr>}
          </Fragment>)}
        </tbody></table>}
    </ManagementScroller>
  </ManagementLayout>;
}
