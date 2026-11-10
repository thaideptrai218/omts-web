"use client";
import { supplierHref } from "./receipt-detail";
import { useToast } from "@/components/ui/toast-provider";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { StatusPill } from "@/components/ui/management-page";
import { FilterGroup, FilterPills, HelpLink, ManagementLayout } from "@/components/ui/management-screen/management-layout";
import { ColumnPicker, ListStateMessage, ManagementPagination, ManagementScroller, SortableHeader, Subtabs, managementStyles, type SortState } from "@/components/ui/management-screen/management-table";
import { TimeRangeFilter } from "@/components/ui/management-screen/time-range-filter";
import { allTime, presetValue, type TimeRangeValue } from "@/components/ui/management-screen/time-range-model";
import { useStoredValue } from "@/components/ui/management-screen/use-stored-value";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { ErrorNotice, Skeleton, useMutation, useRemote } from "@/features/operations/ui";
import listStyles from "@/features/suppliers-api/suppliers.module.css";
import { errorText, fmt, methodLabel, usePurchaseAccess, viDate, viDateTime } from "./document-parts";
import { cancelReturn, download, getReturn, listReturns, removeReturn, usePurchaseLookups } from "./repository";
import { RETURN, goodsTotal, returnStatusLabel, type Page, type ReturnQuery, type ReturnRow } from "./types";
import styles from "./purchases.module.css";

type Column = { key: string; label: string; sort?: string; numeric?: boolean; hidden?: boolean; render(row: ReturnRow): ReactNode };
const tone = (statusId: number) => statusId === RETURN.recorded ? "success" as const : statusId === RETURN.cancelled ? "danger" as const : "neutral" as const;
const Status = ({ statusId }: { statusId: number }) => <StatusPill tone={tone(statusId)}>{returnStatusLabel[statusId]}</StatusPill>;
const columns: readonly Column[] = [
  { key: "code", label: "Mã trả hàng", sort: "code", render: (row) => <span className="font-mono tabular-nums">{row.code}</span> },
  { key: "date", label: "Thời gian trả", sort: "date", render: (row) => row.returnedAt ? viDateTime(row.returnedAt) : viDate(row.returnDate) },
  { key: "receipt", label: "Phiếu nhập", render: (row) => row.receiptCode ?? "—" },
  { key: "supplierCode", label: "Mã NCC", hidden: true, render: (row) => row.supplierCode },
  { key: "supplier", label: "Nhà cung cấp", sort: "supplier", render: (row) => row.supplier.name },
  { key: "reason", label: "Lý do", hidden: true, render: (row) => row.reason || "—" },
  { key: "recordedBy", label: "Người lập", hidden: true, render: (row) => row.recordedBy.name },
  { key: "itemCount", label: "Số mặt hàng", numeric: true, hidden: true, render: (row) => row.itemCount },
  { key: "goods", label: "Tổng tiền hàng", numeric: true, hidden: true, render: (row) => fmt(row.value) },
  { key: "discount", label: "Giảm giá", numeric: true, hidden: true, render: (row) => fmt(row.discount) },
  { key: "value", label: "NCC cần trả", sort: "value", numeric: true, render: (row) => fmt(row.netValue) },
  { key: "refund", label: "Tiền NCC đã trả", numeric: true, render: (row) => fmt(row.refunded) },
  { key: "createdAt", label: "Thời gian tạo", hidden: true, render: (row) => viDateTime(row.createdAt) },
  { key: "status", label: "Trạng thái", sort: "status", render: (row) => <Status statusId={row.statusId} /> },
];
const defaults = columns.filter((column) => !column.hidden).map((column) => column.key).join(",");
const emptyFilters = { source: "", supplier: "", status: "" };

/**
 * A link opens this list on one record by its code (`?code=…`). The list is keyed by that code so a link followed while
 * the list is already open starts it again: the search box shows the code and the row with exactly that code opens.
 */
export function PurchaseReturnsScreen(props: { helpHref?: string }) {
  const linkedCode = useSearchParams().get("code") ?? "";
  return <ReturnsList key={linkedCode} linkedCode={linkedCode} {...props} />;
}

function ReturnsList({ helpHref, linkedCode }: { helpHref?: string; linkedCode: string }) {
  const access = usePurchaseAccess(), router = useRouter(), lookups = usePurchaseLookups(), exportFile = useMutation(), linkPending = useRef(linkedCode);
  const [search, setSearch] = useState(linkedCode), [filters, setFilters] = useState(emptyFilters), [time, setTime] = useState<TimeRangeValue>(() => linkedCode ? allTime : presetValue("thisMonth"));
  const [sort, setSort] = useState<SortState>({ key: "code", direction: "desc" }), [page, setPage] = useState(1), [pageSize, setPageSize] = useState(15), [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<Page<ReturnRow> & { totalValue: number }>(), [loading, setLoading] = useState(true), [error, setError] = useState<string>(), [expanded, setExpanded] = useState<string>(), { notify } = useToast();
  const [stored, store] = useStoredValue("omts-columns-purchase-returns", defaults);
  const visible = useMemo(() => { const keys = stored.split(","), shown = columns.filter((column) => keys.includes(column.key)); return shown.length ? shown : columns; }, [stored]);
  const query = useMemo<ReturnQuery>(() => ({ search, statusId: filters.status, source: filters.source, supplierId: filters.supplier, from: time.from, to: time.to, sortBy: sort.key, sortDir: sort.direction, page, pageSize }), [search, filters, time, sort, page, pageSize]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true); setError(undefined);
      void listReturns(query, controller.signal).then((result) => {
        if (controller.signal.aborted) return;
        setLoading(false);
        if (result.status === "success") { setData(result.data); if (linkPending.current) { const code = linkPending.current.toLowerCase(); linkPending.current = ""; const linked = result.data.items.find((row) => row.code.toLowerCase() === code); if (linked) setExpanded(linked.id); } } else { setData(undefined); setError(errorText(result)); }
      });
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, refresh]);
  function changed<T>(apply: (value: T) => void) { return (value: T) => { apply(value); setPage(1); setExpanded(undefined); }; }
  const setFilter = (key: keyof typeof emptyFilters) => changed<string>((value) => setFilters((current) => ({ ...current, [key]: value })));
  const open = (id: string) => setExpanded((value) => value === id ? undefined : id);
  const reload = () => setRefresh((value) => value + 1);
  if (!access.view) return <p role="alert" className="rounded-card border border-border bg-surface p-6">Bạn không có quyền xem chức năng này.</p>;
  const rail = <>
    <div className={listStyles.railHead}><strong>Bộ lọc</strong><button type="button" className={managementStyles.linkButton} onClick={() => changed<void>(() => { setFilters(emptyFilters); setTime(presetValue("thisMonth")); })()}>Đặt lại</button></div>
    <FilterPills legend="Nguồn phiếu" name="return-source" value={filters.source} options={[["receipt", "Từ phiếu nhập"], ["standalone", "Độc lập"]]} onChange={setFilter("source")} />
    <TimeRangeFilter legend="Thời gian" value={time} onChange={changed<TimeRangeValue>(setTime)} />
    <FilterGroup legend="Nhà cung cấp"><select aria-label="Nhà cung cấp" className={styles.railSelect} value={filters.supplier} onChange={(event) => setFilter("supplier")(event.target.value)}><option value="">Tất cả nhà cung cấp</option>{lookups.suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></FilterGroup>
    <FilterPills legend="Trạng thái" name="return-status" value={filters.status} options={[[String(RETURN.draft), "Phiếu tạm"], [String(RETURN.recorded), "Đã trả hàng"], [String(RETURN.cancelled), "Đã hủy"]]} onChange={setFilter("status")} />
  </>;
  return <ManagementLayout storageKey="purchase-returns" icon="upload" title="Trả hàng nhập" filters={rail} filterLabel="Bộ lọc phiếu trả"
    footer={<ManagementPagination page={data?.page ?? page} pageSize={pageSize} total={data?.total ?? 0} unit="phiếu" disabled={loading} onPage={(next) => { setPage(next); setExpanded(undefined); }} onPageSize={changed<number>(setPageSize)} />}
    search={<input type="search" aria-label="Tìm phiếu trả" placeholder="Theo mã phiếu trả, phiếu nhập, nhà cung cấp" maxLength={200} value={search} onChange={(event) => changed<string>(setSearch)(event.target.value)} />}
    actions={<>
      {access.create && <Button className="w-auto" onClick={() => router.push("/operations/purchase-returns/new")}><InterfaceIcon name="add" className="mr-1 size-4" />Trả hàng nhập</Button>}
      {access.exportFile && <Button className="w-auto" variant="secondary" isPending={exportFile.pending} onClick={() => void exportFile.run(() => download("returns", query), true)}><InterfaceIcon name="download" className="mr-1 size-4" />Xuất file</Button>}
      <ColumnPicker columns={columns} visible={visible.map((column) => column.key)} onChange={(keys) => store(keys.join(","))} />
      <HelpLink helpHref={helpHref} />
    </>}>
    {exportFile.error && <div className={listStyles.feedback}><ErrorNotice error={exportFile.error} /></div>}
    <ManagementScroller busy={loading}>
      {error ? <ListStateMessage error={error} onRetry={reload} retryLabel="Tải lại" />
        : !data ? <div role="status" aria-label="Đang tải danh sách" className={listStyles.skeleton}>{[1, 2, 3, 4, 5].map((key) => <div key={key} />)}</div>
        : !data.items.length ? <ListStateMessage>Không có phiếu trả phù hợp bộ lọc.</ListStateMessage>
        : <table className={listStyles.table}><thead><tr><th scope="col" className={listStyles.expandCell}><span className="sr-only">Mở dòng</span></th>
          {visible.map((column) => <SortableHeader key={column.key} label={column.label} sortKey={column.sort} sort={sort} onSort={changed<SortState>(setSort)} className={column.numeric ? styles.num : undefined} />)}</tr></thead>
          <tbody><tr className={styles.totalRow}><td />{visible.map((column) => <td key={column.key} className={column.numeric ? styles.num : undefined}>{column.key === "value" ? fmt(data.totalValue) : ""}</td>)}</tr>
            {data.items.map((row) => <Fragment key={row.id}>
              <OpenableTableRow data-selected={expanded === row.id || undefined} onOpen={() => open(row.id)}>
                <td className={listStyles.expandCell}><button type="button" aria-expanded={expanded === row.id} aria-label={`${expanded === row.id ? "Thu gọn" : "Mở"} ${row.code}`} onClick={() => open(row.id)}><InterfaceIcon name={expanded === row.id ? "chevron-down" : "chevron-right"} /></button></td>
                {visible.map((column) => <td key={column.key} className={column.numeric ? styles.num : undefined}>{column.render(row)}</td>)}
              </OpenableTableRow>
              {expanded === row.id && <tr><td colSpan={visible.length + 1} className={listStyles.detailCell}><div className={managementStyles.viewWidth}><ReturnDetail id={row.id} owner={access.owner} canEdit={access.edit} canRemove={access.remove} onChanged={(message) => { notify({ tone: "success", title: message }); setExpanded(undefined); reload(); }} /></div></td></tr>}
            </Fragment>)}
          </tbody></table>}
    </ManagementScroller>
  </ManagementLayout>;
}

function ReturnDetail({ id, owner, canEdit, canRemove, onChanged }: { id: string; owner: boolean; canEdit: boolean; canRemove: boolean; onChanged(message: string): void }) {
  const remote = useRemote(useCallback((signal: AbortSignal) => getReturn(id, signal), [id])), confirmation = useActionDialog(), router = useRouter();
  const [error, setError] = useState<string>();
  const item = remote.data;
  if (remote.loading) return <div className={listStyles.detail}><Skeleton /></div>;
  if (remote.error || !item) return <ListStateMessage error={remote.error ?? "Không tải được phiếu."} onRetry={remote.reload} retryLabel="Tải lại phiếu" />;
  const draft = item.statusId === RETURN.draft, recorded = item.statusId === RETURN.recorded;
  async function remove() {
    if (!(await confirmation.confirm(`Xóa phiếu tạm ${item!.code}?`))) return;
    const result = await removeReturn(item!.id);
    if (result.status === "success") onChanged(`Đã xóa phiếu tạm ${item!.code}.`); else setError(errorText(result));
  }
  async function cancel() {
    const reason = await confirmation.prompt(`Hủy phiếu trả ${item!.code}`);
    if (!reason) return;
    const result = await cancelReturn(item!.id, reason, item!.rowVersion);
    if (result.status === "success") onChanged(`Đã hủy phiếu trả ${item!.code}.`); else setError(errorText(result));
  }
  return <section className={listStyles.detail} aria-label={`Chi tiết ${item.code}`}>{confirmation.dialog}
    <Subtabs<"info"> label="Nội dung phiếu trả" tabs={[{ key: "info", label: "Thông tin" }]} value="info" onChange={() => undefined} />
    <div className={listStyles.tabBody}>
      <header className={styles.head}><div><h3>{item.code}</h3><Status statusId={item.statusId} /></div></header>
      <dl className={styles.facts}>
        <div><dt>Người lập</dt><dd>{item.recordedBy}</dd></div><div><dt>Thời gian trả</dt><dd>{viDateTime(item.returnedAt)}</dd></div><div><dt>Nhà cung cấp</dt><dd><Link className={styles.link} href={supplierHref(item)}>{item.supplier.name}</Link></dd></div>
        {item.receipt && <div><dt>Phiếu nhập</dt><dd><Link className={managementStyles.linkButton} href={`/operations/purchase-receipts?code=${item.receipt.code}`}>{item.receipt.code}</Link></dd></div>}
        {item.refund && <div><dt>Phiếu NCC trả tiền</dt><dd>{item.refund.code} · {methodLabel[item.refund.method]}</dd></div>}
        {item.cancelReason && <div><dt>Lý do hủy</dt><dd className={styles.danger}>{item.cancelReason}</dd></div>}
      </dl>
      <div className={styles.innerScroll}><table className={styles.inner}><thead><tr><th>#</th><th>Mã hàng</th><th>Tên hàng</th><th>ĐVT</th><th className={styles.num}>Số lượng</th><th className={styles.num}>Giá trả</th><th className={styles.num}>Thành tiền</th></tr></thead>
        <tbody>{item.lines.map((line, index) => <tr key={line.id}><td>{index + 1}</td><td>{line.item.code}</td><td>{line.item.name}</td><td>{line.item.unit}</td><td className={styles.num}>{fmt(line.quantity)}</td><td className={styles.num}>{fmt(line.unitPrice)}</td><td className={styles.num}>{fmt(Math.round(line.quantity * line.unitPrice))}</td></tr>)}</tbody></table></div>
      <div className={styles.foot}><p className={styles.noteBox}>{item.reason || "Chưa nhập lý do trả hàng."}</p>
        <div className={styles.sums}><div><span>Tổng tiền hàng</span><span>{fmt(goodsTotal(item.lines))}</span></div><div><span>Giảm giá</span><span>{fmt(item.discount)}</span></div><div className={styles.strong}><span>NCC cần trả</span><span>{fmt(item.netValue)}</span></div><div><span>Tiền NCC đã trả</span><span>{fmt(item.refund?.amount ?? 0)}</span></div></div></div>
      <ErrorNotice error={error} />
      {((draft && (canRemove || canEdit)) || (recorded && (owner || canEdit))) && <footer className={listStyles.tabFooter}>
        <div>{draft && canRemove && <Button className="w-auto" variant="ghost" onClick={() => void remove()}><InterfaceIcon name="lock" className="size-4" />Xóa phiếu tạm</Button>}{recorded && owner && <Button className="w-auto" variant="ghost" onClick={() => void cancel()}><InterfaceIcon name="lock" className="size-4" />Hủy phiếu trả</Button>}</div>
        <div>{(draft || recorded) && canEdit && <Button className="w-auto" onClick={() => router.push(`/operations/purchase-returns/${item.id}/edit`)}><InterfaceIcon name="pencil" className="size-4" />Mở phiếu</Button>}</div>
      </footer>}
    </div>
  </section>;
}
