"use client";
import { useSearchParams } from "next/navigation";
import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { FilterGroup, FilterPills, HelpLink, ManagementLayout } from "@/components/ui/management-screen/management-layout";
import { BulkBar, ColumnPicker, ListStateMessage, ManagementPagination, ManagementScroller, SortableHeader, managementStyles, type SortState } from "@/components/ui/management-screen/management-table";
import { NumberRangeFilter } from "@/components/ui/management-screen/number-range-filter";
import { TimeRangeFilter } from "@/components/ui/management-screen/time-range-filter";
import { allTime, isAllTime, type TimeRangeValue } from "@/components/ui/management-screen/time-range-model";
import { useStoredValue } from "@/components/ui/management-screen/use-stored-value";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { StatusPill } from "@/components/ui/management-page";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { workspaceError } from "@/features/api-workspace/workspace-error";
import { ErrorNotice, Money, useMutation } from "@/features/operations/ui";
import { IN_USE, supplierTypes, typeLabel, type BulkResult, type SupplierDetail, type SupplierPage, type SupplierRow } from "./contracts";
import { supplierRepository, type SupplierQuery } from "./repository";
import { SupplierDetailPanel, type SupplierAccess } from "./supplier-detail";
import { SupplierFormDialog } from "./supplier-form-dialog";
import { SupplierImportDialog } from "./supplier-import-dialog";
import styles from "./suppliers.module.css";

type Column = { key: string; label: string; sort?: string; render(row: SupplierRow): ReactNode; gate?: "total" | "debt"; defaultHidden?: boolean };
const shortDate = (value: string) => new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short" }).format(new Date(value));
const columns: readonly Column[] = [
  { key: "code", label: "Mã", sort: "code", render: (row) => <span className="font-mono tabular-nums">{row.code}</span> },
  { key: "name", label: "Tên nhà cung cấp", sort: "name", render: (row) => <span className={styles.name}>{row.name}</span> },
  { key: "type", label: "Nhóm", sort: "type", render: (row) => typeLabel(row.supplierType) },
  { key: "phone", label: "Điện thoại", sort: "phone", render: (row) => row.phoneNumber },
  { key: "email", label: "Email", render: (row) => row.email ?? "—", defaultHidden: true },
  { key: "address", label: "Địa chỉ", render: (row) => row.address ?? "—", defaultHidden: true },
  { key: "province", label: "Khu vực", sort: "province", render: (row) => row.province ?? "—", defaultHidden: true },
  { key: "company", label: "Công ty", render: (row) => row.companyName ?? "—", defaultHidden: true },
  { key: "taxCode", label: "Mã số thuế", render: (row) => row.taxCode ?? "—", defaultHidden: true },
  { key: "createdBy", label: "Người tạo", render: (row) => row.createdBy ?? "—", defaultHidden: true },
  { key: "createdAt", label: "Ngày tạo", sort: "createdAt", render: (row) => shortDate(row.createdAt), defaultHidden: true },
  { key: "total", label: "Tổng mua", sort: "totalPurchased", gate: "total", render: (row) => <Money value={row.totalPurchased} /> },
  { key: "debt", label: "Nợ hiện tại", sort: "currentDebt", gate: "debt", render: (row) => <Money value={row.currentDebt} /> },
  { key: "status", label: "Trạng thái", sort: "status", render: (row) => <StatusPill tone={row.statusId === IN_USE ? "success" : "neutral"}>{row.statusId === IN_USE ? "Đang dùng" : "Ngừng dùng"}</StatusPill> },
];
const emptyFilters = { type: "", statusId: "", totalFrom: "", totalTo: "", debtFrom: "", debtTo: "" };
const reversed = (from: string, to: string) => from !== "" && to !== "" && Number(from) > Number(to);

export function SupplierScreen({ helpHref }: { helpHref?: string }) {
  const context = useApiWorkspace();
  const can = (fn: string, action: string) => context.identity.subjectType === "CooperativeOwner" || context.permissions.functionPermissions.some((p) => p.functionCode === fn && p.action === action);
  const canView = can("SUPPLIERS", "View"), canCreate = can("SUPPLIERS", "Create"), canEdit = can("SUPPLIERS", "Edit"), canExport = can("SUPPLIERS", "Export"), canTotal = can("PURCHASE_RECEIPTS", "View"), canDebt = can("SUPPLIER_PAYMENTS", "View");
  const access: SupplierAccess = { edit: canEdit, history: canTotal, debt: canDebt, pay: can("SUPPLIER_PAYMENTS", "Create"), exportDebt: can("SUPPLIER_PAYMENTS", "Export") };
  // A link from a purchase document opens this list on one supplier: ?search=<name>&recordId=<id>.
  const params = useSearchParams(), linkedId = params.get("recordId") ?? undefined;
  const [search, setSearch] = useState(params.get("search") ?? ""), [filters, setFilters] = useState(emptyFilters), [purchaseTime, setPurchaseTime] = useState<TimeRangeValue>(allTime);
  const [sort, setSort] = useState<SortState>({ key: "code", direction: "desc" });
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(15), [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<SupplierPage>(), [loading, setLoading] = useState(true), [error, setError] = useState<string>();
  const [expanded, setExpanded] = useState<string | undefined>(linkedId), [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [editor, setEditor] = useState<SupplierDetail | null>(), [importing, setImporting] = useState(false), [notice, setNotice] = useState<string>(), [bulkOutcome, setBulkOutcome] = useState<BulkResult>();
  const bulk = useMutation(), exportFile = useMutation(), confirmation = useActionDialog();

  const offered = useMemo(() => columns.filter((column) => column.gate === "total" ? canTotal : column.gate === "debt" ? canDebt : true), [canTotal, canDebt]);
  const defaults = useMemo(() => offered.filter((column) => !column.defaultHidden).map((column) => column.key).join(","), [offered]);
  const [storedColumns, storeColumns] = useStoredValue("omts-columns-suppliers", defaults);
  const visible = useMemo(() => { const keys = storedColumns.split(","), shown = offered.filter((column) => keys.includes(column.key)); return shown.length ? shown : offered; }, [storedColumns, offered]);

  const rangeError = reversed(filters.totalFrom, filters.totalTo) || reversed(filters.debtFrom, filters.debtTo);
  const query = useMemo<SupplierQuery>(() => ({
    search: search.trim(), type: filters.type, statusId: filters.statusId, sortBy: sort.key, sortDir: sort.direction,
    ...(canTotal ? { totalPurchasedFrom: filters.totalFrom, totalPurchasedTo: filters.totalTo, purchaseFrom: purchaseTime.from, purchaseTo: purchaseTime.to } : {}),
    ...(canDebt ? { currentDebtFrom: filters.debtFrom, currentDebtTo: filters.debtTo } : {}),
  }), [search, filters, purchaseTime, sort, canTotal, canDebt]);

  useEffect(() => {
    if (!canView || rangeError) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true); setError(undefined);
      void supplierRepository.list({ ...query, page: String(page), pageSize: String(pageSize) }, controller.signal).then((result) => {
        if (controller.signal.aborted) return;
        setLoading(false);
        if (result.status === "success") {
          setData(result.data);
          if (result.data.total > 0 && page > Math.ceil(result.data.total / pageSize)) setPage(Math.ceil(result.data.total / pageSize));
        } else { setData(undefined); setError(workspaceError(result)); }
      });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [canView, query, page, pageSize, refresh, rangeError]);

  function changed<T>(apply: (value: T) => void) { return (value: T) => { apply(value); setPage(1); setExpanded(undefined); setSelected(new Set()); }; }
  const setFilter = (key: keyof typeof emptyFilters) => changed<string>((value) => setFilters((current) => ({ ...current, [key]: value })));
  const reload = () => setRefresh((value) => value + 1);
  const hasFilter = Object.values(filters).some(Boolean) || !isAllTime(purchaseTime);
  const pageIds = data?.items.map((row) => row.id) ?? [];
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  function toggle(id: string, on: boolean) { setSelected((current) => { const next = new Set(current); if (on) next.add(id); else next.delete(id); return next; }); }
  async function runBulk(action: "Discontinue" | "Resume") {
    const ids = [...selected];
    if (!(await confirmation.confirm(action === "Discontinue" ? `Ngừng dùng ${ids.length} nhà cung cấp?` : `Sử dụng lại ${ids.length} nhà cung cấp?`))) return;
    const result = await bulk.run(() => supplierRepository.bulk(action, ids));
    if (result) { setBulkOutcome(result); setSelected(new Set(result.outcomes.filter((o) => !o.succeeded).map((o) => o.id))); reload(); }
  }

  if (!canView) return <p role="alert" className="rounded-card border border-border bg-surface p-6">Bạn không có quyền xem chức năng này.</p>;
  const failedOutcomes = bulkOutcome?.outcomes.filter((outcome) => !outcome.succeeded) ?? [];
  const filterRail = <>
    <div className={styles.railHead}><strong>Bộ lọc</strong><button type="button" className={managementStyles.linkButton} disabled={!hasFilter} onClick={() => changed<void>(() => { setFilters(emptyFilters); setPurchaseTime(allTime); })()}>Đặt lại</button></div>
    <FilterPills legend="Loại" name="supplier-type" value={filters.type} options={supplierTypes} onChange={setFilter("type")} />
    <FilterPills legend="Trạng thái" name="supplier-status" value={filters.statusId} options={[["101", "Đang dùng"], ["102", "Ngừng dùng"]]} onChange={setFilter("statusId")} />
    {canTotal && <FilterGroup legend="Tổng mua"><NumberRangeFilter label="Tổng mua" from={filters.totalFrom} to={filters.totalTo} onFromChange={setFilter("totalFrom")} onToChange={setFilter("totalTo")} /></FilterGroup>}
    {canTotal && <TimeRangeFilter legend="Thời gian mua" value={purchaseTime} onChange={changed<TimeRangeValue>(setPurchaseTime)} />}
    {canDebt && <FilterGroup legend="Nợ hiện tại"><NumberRangeFilter label="Nợ hiện tại" allowNegative from={filters.debtFrom} to={filters.debtTo} onFromChange={setFilter("debtFrom")} onToChange={setFilter("debtTo")} /></FilterGroup>}
    {rangeError && <p role="alert" className={styles.rangeError}>Giá trị &quot;từ&quot; phải nhỏ hơn hoặc bằng giá trị &quot;đến&quot;.</p>}
  </>;

  return <ManagementLayout storageKey="suppliers" icon="supplier" title="Nhà cung cấp" filters={filterRail} filterLabel="Bộ lọc nhà cung cấp"
    footer={<ManagementPagination page={data?.page ?? page} pageSize={pageSize} total={data?.total ?? 0} unit="nhà cung cấp" disabled={loading} onPage={(next) => { setPage(next); setExpanded(undefined); setSelected(new Set()); }} onPageSize={changed<number>(setPageSize)} />}
    search={<input type="search" aria-label="Tìm nhà cung cấp" placeholder="Theo tên, điện thoại hoặc mã" maxLength={200} value={search} onChange={(event) => changed<string>(setSearch)(event.target.value)} />}
    actions={<>
      {canCreate && <Button className="w-auto" onClick={() => setEditor(null)}><InterfaceIcon name="add" className="mr-1 size-4" />Thêm nhà cung cấp</Button>}
      {canCreate && <Button className="w-auto" variant="secondary" onClick={() => setImporting(true)}><InterfaceIcon name="upload" className="mr-1 size-4" />Import file</Button>}
      {canExport && <Button className="w-auto" variant="secondary" isPending={exportFile.pending} disabled={rangeError} onClick={() => void exportFile.run(() => supplierRepository.download("export", query, "nha-cung-cap.xlsx"), true)}><InterfaceIcon name="download" className="mr-1 size-4" />Xuất file</Button>}
      <ColumnPicker columns={offered} visible={visible.map((column) => column.key)} onChange={(keys) => storeColumns(keys.join(","))} />
      <HelpLink helpHref={helpHref} />
    </>}>
    {confirmation.dialog}
    <BulkBar count={canEdit ? selected.size : 0} onClear={() => setSelected(new Set())}>
      <Button className="w-auto" variant="danger" disabled={bulk.pending} onClick={() => void runBulk("Discontinue")}>Ngừng dùng</Button>
      <Button className="w-auto" variant="secondary" disabled={bulk.pending} onClick={() => void runBulk("Resume")}>Sử dụng lại</Button>
    </BulkBar>
    {(bulk.error || exportFile.error || notice || bulkOutcome) && <div className={styles.feedback}>
      <ErrorNotice error={bulk.error || exportFile.error} />{notice && <p role="status">{notice}</p>}
      {bulkOutcome && <div role="status"><p>Thành công {bulkOutcome.succeeded}, không thực hiện được {bulkOutcome.failed}. <button type="button" className={managementStyles.linkButton} onClick={() => setBulkOutcome(undefined)}>Đóng</button></p>
        {failedOutcomes.length > 0 && <ul>{failedOutcomes.map((outcome) => <li key={outcome.id}>{data?.items.find((row) => row.id === outcome.id)?.name ?? outcome.id}: {outcome.code === "MSG-GEN-09" ? "Trạng thái hiện tại không cho phép." : "Không thực hiện được."}</li>)}</ul>}</div>}
    </div>}
    <ManagementScroller busy={loading}>
      {error ? <ListStateMessage error={error} onRetry={reload} retryLabel="Tải lại" />
        : !data ? <div role="status" aria-label="Đang tải danh sách" className={styles.skeleton}>{[1, 2, 3, 4, 5].map((key) => <div key={key} />)}</div>
        : !data.items.length ? <ListStateMessage>{search || hasFilter ? "Không có nhà cung cấp phù hợp bộ lọc." : "Chưa có nhà cung cấp."}</ListStateMessage>
        : <table className={styles.table}><thead><tr>
          {canEdit && <th scope="col" className={styles.checkCell}><input type="checkbox" aria-label="Chọn tất cả trên trang" checked={allSelected} onChange={(event) => setSelected(event.target.checked ? new Set([...selected, ...pageIds]) : new Set([...selected].filter((id) => !pageIds.includes(id))))} /></th>}
          <th scope="col" className={styles.expandCell}><span className="sr-only">Mở dòng</span></th>
          {visible.map((column) => <SortableHeader key={column.key} label={column.label} sortKey={column.sort} sort={sort} onSort={changed<SortState>(setSort)} />)}
        </tr></thead><tbody>{data.items.map((row) => <Fragment key={row.id}>
          <OpenableTableRow data-selected={expanded === row.id || undefined} onOpen={() => setExpanded((value) => value === row.id ? undefined : row.id)}>
            {canEdit && <td className={styles.checkCell}><input type="checkbox" aria-label={`Chọn ${row.name}`} checked={selected.has(row.id)} onChange={(event) => toggle(row.id, event.target.checked)} /></td>}
            <td className={styles.expandCell}><button type="button" aria-expanded={expanded === row.id} aria-label={`${expanded === row.id ? "Thu gọn" : "Mở"} ${row.name}`} onClick={() => setExpanded((value) => value === row.id ? undefined : row.id)}><InterfaceIcon name={expanded === row.id ? "chevron-down" : "chevron-right"} /></button></td>
            {visible.map((column) => <td key={column.key}>{column.render(row)}</td>)}
          </OpenableTableRow>
          {expanded === row.id && <tr><td colSpan={visible.length + (canEdit ? 2 : 1)} className={styles.detailCell}><div className={managementStyles.viewWidth}><SupplierDetailPanel id={row.id} access={access} onEdit={setEditor} onChanged={reload} /></div></td></tr>}
        </Fragment>)}</tbody></table>}
    </ManagementScroller>
    {editor !== undefined && <SupplierFormDialog record={editor} onClose={() => setEditor(undefined)} onSaved={() => { setEditor(undefined); setNotice("Đã lưu nhà cung cấp."); setExpanded(undefined); reload(); }} />}
    {importing && <SupplierImportDialog onClose={() => setImporting(false)} onImported={(count) => { setImporting(false); setNotice(`Đã nhập ${count} nhà cung cấp.`); reload(); }} />}
  </ManagementLayout>;
}
