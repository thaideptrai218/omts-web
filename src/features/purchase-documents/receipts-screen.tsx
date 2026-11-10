"use client";
import { useToast } from "@/components/ui/toast-provider";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { StatusPill } from "@/components/ui/management-page";
import { FilterGroup, FilterPills, HelpLink, ManagementLayout } from "@/components/ui/management-screen/management-layout";
import { BulkBar, ColumnPicker, ListStateMessage, ManagementPagination, ManagementScroller, SortableHeader, managementStyles, type SortState } from "@/components/ui/management-screen/management-table";
import { TimeRangeFilter } from "@/components/ui/management-screen/time-range-filter";
import { allTime, presetValue, type TimeRangeValue } from "@/components/ui/management-screen/time-range-model";
import { useStoredValue } from "@/components/ui/management-screen/use-stored-value";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { ErrorNotice, useMutation } from "@/features/operations/ui";
import listStyles from "@/features/suppliers-api/suppliers.module.css";
import { errorText, fmt, usePurchaseAccess, viDate, viDateTime } from "./document-parts";
import { ReceiptDetailPanel } from "./receipt-detail";
import { download, listReceipts, removeReceipts, usePurchaseLookups } from "./repository";
import { RECEIPT, itemGroups, receiptStatusLabel, type Page, type ReceiptQuery, type ReceiptRow, type ReceiptTotals } from "./types";
import styles from "./purchases.module.css";

type Column = { key: string; label: string; sort?: string; numeric?: boolean; hidden?: boolean; render(row: ReceiptRow): ReactNode };
const tone = (statusId: number) => statusId === RECEIPT.completed ? "success" as const : statusId === RECEIPT.cancelled ? "danger" as const : "neutral" as const;
export const ReceiptStatus = ({ statusId }: { statusId: number }) => <StatusPill tone={tone(statusId)}>{receiptStatusLabel[statusId]}</StatusPill>;
const columns: readonly Column[] = [
  { key: "code", label: "Mã nhập hàng", sort: "code", render: (row) => <span className="font-mono tabular-nums">{row.code}</span> },
  { key: "date", label: "Thời gian", sort: "date", render: (row) => row.receivedAt ? viDateTime(row.receivedAt) : viDate(row.receiptDate) },
  { key: "returnCodes", label: "Mã trả hàng nhập", render: (row) => row.returnCodes?.length ? <span className={styles.codeList}>{row.returnCodes.map((code) => <Link key={code} className={styles.link} href={`/operations/purchase-returns?code=${code}`} onClick={(event) => event.stopPropagation()}>{code}</Link>)}</span> : "—" },
  { key: "supplierCode", label: "Mã NCC", hidden: true, render: (row) => row.supplierCode },
  { key: "supplier", label: "Nhà cung cấp", sort: "supplier", render: (row) => row.supplier.name },
  { key: "phone", label: "SĐT NCC", hidden: true, render: (row) => row.supplier.phoneNumber },
  { key: "receivedBy", label: "Người nhập", hidden: true, render: (row) => row.receivedByName ?? "—" },
  { key: "recordedBy", label: "Người lập", hidden: true, render: (row) => row.recordedByName },
  { key: "itemCount", label: "Số mặt hàng", numeric: true, hidden: true, render: (row) => row.itemCount },
  { key: "goods", label: "Tổng tiền hàng", numeric: true, hidden: true, render: (row) => fmt(row.total) },
  { key: "discount", label: "Giảm giá", numeric: true, hidden: true, render: (row) => fmt(row.discount) },
  { key: "payable", label: "Cần trả NCC", sort: "payable", numeric: true, render: (row) => fmt(row.payable) },
  { key: "paid", label: "Tiền đã trả NCC", numeric: true, render: (row) => fmt(row.paid) },
  { key: "returned", label: "Đã trả hàng", numeric: true, hidden: true, render: (row) => fmt(row.returned) },
  { key: "createdAt", label: "Thời gian tạo", hidden: true, render: (row) => viDateTime(row.createdAt) },
  { key: "updatedAt", label: "Ngày cập nhật", hidden: true, render: (row) => row.updatedAt ? viDateTime(row.updatedAt) : "—" },
  { key: "notes", label: "Ghi chú", hidden: true, render: (row) => row.notes ?? "—" },
  { key: "status", label: "Trạng thái", sort: "status", render: (row) => <ReceiptStatus statusId={row.statusId} /> },
];
const defaults = columns.filter((column) => !column.hidden).map((column) => column.key).join(",");
const emptyFilters = { group: "", supplier: "", status: "" };

/**
 * A link opens this list on one record by its code (`?code=…`). The list is keyed by that code so a link followed while
 * the list is already open starts it again: the search box shows the code and the row with exactly that code opens.
 */
export function PurchaseReceiptsScreen(props: { helpHref?: string }) {
  const linkedCode = useSearchParams().get("code") ?? "";
  return <ReceiptsList key={linkedCode} linkedCode={linkedCode} {...props} />;
}

function ReceiptsList({ helpHref, linkedCode }: { helpHref?: string; linkedCode: string }) {
  const access = usePurchaseAccess(), router = useRouter(), confirmation = useActionDialog(), lookups = usePurchaseLookups(), exportFile = useMutation();
  const linkPending = useRef(linkedCode);
  const [search, setSearch] = useState(linkedCode), [filters, setFilters] = useState(emptyFilters), [time, setTime] = useState<TimeRangeValue>(() => linkedCode ? allTime : presetValue("thisMonth"));
  const [sort, setSort] = useState<SortState>({ key: "code", direction: "desc" }), [page, setPage] = useState(1), [pageSize, setPageSize] = useState(15), [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<Page<ReceiptRow> & { totals: ReceiptTotals }>(), [loading, setLoading] = useState(true), [error, setError] = useState<string>();
  const [expanded, setExpanded] = useState<string>(), [selected, setSelected] = useState<ReadonlySet<string>>(new Set()), { notify } = useToast();
  const [stored, store] = useStoredValue("omts-columns-purchase-receipts", defaults);
  const visible = useMemo(() => { const keys = stored.split(","), shown = columns.filter((column) => keys.includes(column.key)); return shown.length ? shown : columns; }, [stored]);
  const query = useMemo<ReceiptQuery>(() => ({ search, statusId: filters.status, group: filters.group, supplierId: filters.supplier, from: time.from, to: time.to, sortBy: sort.key, sortDir: sort.direction, page, pageSize }), [search, filters, time, sort, page, pageSize]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true); setError(undefined);
      void listReceipts(query, controller.signal).then((result) => {
        if (controller.signal.aborted) return;
        setLoading(false);
        if (result.status === "success") { setData(result.data); if (linkPending.current) { const code = linkPending.current.toLowerCase(); linkPending.current = ""; const linked = result.data.items.find((row) => row.code.toLowerCase() === code); if (linked) setExpanded(linked.id); } } else { setData(undefined); setError(errorText(result)); }
      });
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, refresh]);

  function changed<T>(apply: (value: T) => void) { return (value: T) => { apply(value); setPage(1); setExpanded(undefined); setSelected(new Set()); }; }
  const setFilter = (key: keyof typeof emptyFilters) => changed<string>((value) => setFilters((current) => ({ ...current, [key]: value })));
  const reload = () => setRefresh((value) => value + 1);
  const drafts = data?.items.filter((row) => row.statusId === RECEIPT.draft).map((row) => row.id) ?? [];
  const allSelected = drafts.length > 0 && drafts.every((id) => selected.has(id));
  const toggle = (id: string, on: boolean) => setSelected((current) => { const next = new Set(current); if (on) next.add(id); else next.delete(id); return next; });
  const open = (id: string) => setExpanded((value) => value === id ? undefined : id);
  async function removeSelected() {
    if (!(await confirmation.confirm(`Xóa ${selected.size} phiếu tạm đã chọn?`))) return;
    const result = await removeReceipts([...selected]);
    if (result.status === "success") { notify({ tone: "success", title: `Đã xóa ${result.data} phiếu tạm.` }); setSelected(new Set()); reload(); } else notify({ tone: "danger", title: errorText(result) ?? "Không thực hiện được." });
  }
  if (!access.view) return <p role="alert" className="rounded-card border border-border bg-surface p-6">Bạn không có quyền xem chức năng này.</p>;

  const rail = <>
    <div className={listStyles.railHead}><strong>Bộ lọc</strong><button type="button" className={managementStyles.linkButton} onClick={() => changed<void>(() => { setFilters(emptyFilters); setTime(presetValue("thisMonth")); })()}>Đặt lại</button></div>
    <FilterPills legend="Nhóm hàng" name="receipt-group" value={filters.group} options={itemGroups} onChange={setFilter("group")} />
    <TimeRangeFilter legend="Thời gian" value={time} onChange={changed<TimeRangeValue>(setTime)} />
    <FilterGroup legend="Nhà cung cấp"><select aria-label="Nhà cung cấp" className={styles.railSelect} value={filters.supplier} onChange={(event) => setFilter("supplier")(event.target.value)}><option value="">Tất cả nhà cung cấp</option>{lookups.suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></FilterGroup>
    <FilterPills legend="Trạng thái" name="receipt-status" value={filters.status} options={[[String(RECEIPT.draft), "Phiếu tạm"], [String(RECEIPT.completed), "Đã nhập hàng"], [String(RECEIPT.cancelled), "Đã hủy"]]} onChange={setFilter("status")} />
  </>;

  return <ManagementLayout storageKey="purchase-receipts" icon="receipt" title="Nhập hàng" filters={rail} filterLabel="Bộ lọc phiếu nhập"
    footer={<ManagementPagination page={data?.page ?? page} pageSize={pageSize} total={data?.total ?? 0} unit="phiếu" disabled={loading} onPage={(next) => { setPage(next); setExpanded(undefined); setSelected(new Set()); }} onPageSize={changed<number>(setPageSize)} />}
    search={<input type="search" aria-label="Tìm phiếu nhập" placeholder="Theo mã phiếu nhập, nhà cung cấp" maxLength={200} value={search} onChange={(event) => changed<string>(setSearch)(event.target.value)} />}
    actions={<>
      {access.create && <Button className="w-auto" onClick={() => router.push("/operations/purchase-receipts/new")}><InterfaceIcon name="add" className="mr-1 size-4" />Nhập hàng</Button>}
      {access.exportFile && <Button className="w-auto" variant="secondary" isPending={exportFile.pending} onClick={() => void exportFile.run(() => download("receipts", query), true)}><InterfaceIcon name="download" className="mr-1 size-4" />Xuất file</Button>}
      <ColumnPicker columns={columns} visible={visible.map((column) => column.key)} onChange={(keys) => store(keys.join(","))} />
      <HelpLink helpHref={helpHref} />
    </>}>
    {confirmation.dialog}
    <BulkBar count={access.remove ? selected.size : 0} onClear={() => setSelected(new Set())}><Button className="w-auto" variant="danger" onClick={() => void removeSelected()}>Xóa phiếu tạm</Button></BulkBar>
    {exportFile.error && <div className={listStyles.feedback}><ErrorNotice error={exportFile.error} /></div>}
    {data && <p className={styles.summary}>Tiền hàng đã nhập <strong>{fmt(data.totals.received)}</strong> · Trả hàng nhập <strong>{fmt(data.totals.returned)}</strong> · Thuần <strong>{fmt(data.totals.net)}</strong> <span>(trước giảm giá, phiếu đã nhập hàng)</span></p>}
    <ManagementScroller busy={loading}>
      {error ? <ListStateMessage error={error} onRetry={reload} retryLabel="Tải lại" />
        : !data ? <div role="status" aria-label="Đang tải danh sách" className={listStyles.skeleton}>{[1, 2, 3, 4, 5].map((key) => <div key={key} />)}</div>
        : !data.items.length ? <ListStateMessage>{access.create ? "Không có phiếu nhập phù hợp. Đổi bộ lọc hoặc bấm Nhập hàng để lập phiếu mới." : "Không có phiếu nhập phù hợp bộ lọc."}</ListStateMessage>
        : <table className={listStyles.table}><thead><tr>
          {access.remove && <th scope="col" className={listStyles.checkCell}><input type="checkbox" aria-label="Chọn tất cả phiếu tạm trên trang" disabled={!drafts.length} checked={allSelected} onChange={(event) => setSelected(event.target.checked ? new Set([...selected, ...drafts]) : new Set([...selected].filter((id) => !drafts.includes(id))))} /></th>}
          <th scope="col" className={listStyles.expandCell}><span className="sr-only">Mở dòng</span></th>
          {visible.map((column) => <SortableHeader key={column.key} label={column.label} sortKey={column.sort} sort={sort} onSort={changed<SortState>(setSort)} className={column.numeric ? styles.num : undefined} />)}
        </tr></thead><tbody>
          {data.items.map((row) => <Fragment key={row.id}>
            <OpenableTableRow data-selected={expanded === row.id || undefined} onOpen={() => open(row.id)}>
              {access.remove && <td className={listStyles.checkCell}>{row.statusId === RECEIPT.draft && <input type="checkbox" aria-label={`Chọn ${row.code}`} checked={selected.has(row.id)} onChange={(event) => toggle(row.id, event.target.checked)} />}</td>}
              <td className={listStyles.expandCell}><button type="button" aria-expanded={expanded === row.id} aria-label={`${expanded === row.id ? "Thu gọn" : "Mở"} ${row.code}`} onClick={() => open(row.id)}><InterfaceIcon name={expanded === row.id ? "chevron-down" : "chevron-right"} /></button></td>
              {visible.map((column) => <td key={column.key} className={column.numeric ? styles.num : undefined}>{column.render(row)}</td>)}
            </OpenableTableRow>
            {expanded === row.id && <tr><td colSpan={visible.length + (access.remove ? 2 : 1)} className={listStyles.detailCell}><div className={managementStyles.viewWidth}><ReceiptDetailPanel id={row.id} access={access} onChanged={(message) => { notify({ tone: "success", title: message }); setExpanded(undefined); reload(); }} /></div></td></tr>}
          </Fragment>)}
        </tbody></table>}
    </ManagementScroller>
  </ManagementLayout>;
}
