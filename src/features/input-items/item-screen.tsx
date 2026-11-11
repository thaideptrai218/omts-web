"use client";
import { useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { StatusPill } from "@/components/ui/management-page";
import { FilterGroup, FilterPills, HelpLink, ManagementLayout } from "@/components/ui/management-screen/management-layout";
import { ColumnPicker, ListStateMessage, ManagementPagination, ManagementScroller, SortableHeader, managementStyles, type SortState } from "@/components/ui/management-screen/management-table";
import layoutStyles from "@/components/ui/management-screen/management-screen.module.css";
import { TimeRangeFilter } from "@/components/ui/management-screen/time-range-filter";
import { allTime, isAllTime, type TimeRangeValue } from "@/components/ui/management-screen/time-range-model";
import { useStoredValue } from "@/components/ui/management-screen/use-stored-value";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import { SelectBox } from "@/components/ui/select-box";
import { useToast } from "@/components/ui/toast-provider";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { ErrorNotice, useMutation, useRemote } from "@/features/operations/ui";
import { fmt, viDateTime } from "@/features/purchase-documents/document-parts";
import { usePurchaseLookups } from "@/features/purchase-documents/repository";
import listStyles from "@/features/suppliers-api/suppliers.module.css";
import { DISCONTINUED, itemTypes, typeLabel, type InputGroup, type ItemPage, type ItemRow, type ItemType, type ItemView } from "./contracts";
import { ItemDetailPanel, type ItemAccess } from "./item-detail";
import { ItemFormDialog } from "./item-form-dialog";
import { chosenUnit, groupLabel, groupTree, inUnitPrice, inUnitQuantity } from "./item-helpers";
import { ItemImportDialog } from "./item-import-dialog";
import { errorText, inputRepository, type ListQuery } from "./repository";
import styles from "./input-items.module.css";

type Column = { key: string; label: string; sort?: string; numeric?: boolean; defaultHidden?: boolean; render(row: ItemRow, unitId: string | undefined, setUnit: (unitId: string) => void): ReactNode };
const dash = (value: string | null | undefined) => value || "—";
const perUnit = (value: number | null | undefined, factor: number, kind: "quantity" | "price") => {
  const shown = kind === "quantity" ? inUnitQuantity(value, factor) : inUnitPrice(value, factor);
  return shown == null ? "—" : fmt(shown);
};
const columns: readonly Column[] = [
  // The code follows the unit picked in the ĐVT column: each unit has its own code (VT000001-T for a thùng).
  { key: "code", label: "Mã hàng", sort: "code", render: (row, unitId) => { const unit = chosenUnit(row, unitId); return <span className="font-mono tabular-nums">{!unit.isBase && unit.code ? unit.code : row.code}</span>; } },
  // The unit is picked under the name ("- Hộp ⌄", like KiotViet); the code, cost, quantity and limits of the row follow it.
  { key: "name", label: "Tên hàng", sort: "name", render: (row, unitId, setUnit) => <span className={styles.name}>{row.name}
    {row.units.length > 1 && <span className={styles.unitPick} onClick={(event) => event.stopPropagation()}>
      <SelectBox aria-label={`Đơn vị ${row.code}`} className={styles.unitLink} value={chosenUnit(row, unitId).id} onChange={(event) => setUnit(event.target.value)}>{row.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</SelectBox>
    </span>}</span> },
  { key: "group", label: "Loại hàng", sort: "group", render: (row) => typeLabel(row.group) },
  { key: "itemGroup", label: "Nhóm hàng", defaultHidden: true, render: (row) => dash(row.itemGroupName) },
  { key: "cost", label: "Giá vốn", sort: "costPrice", numeric: true, render: (row, unitId) => perUnit(row.costPrice, chosenUnit(row, unitId).factor, "price") },
  { key: "last", label: "Giá nhập cuối", sort: "lastPurchasePrice", numeric: true, defaultHidden: true, render: (row, unitId) => perUnit(row.lastPurchasePrice, chosenUnit(row, unitId).factor, "price") },
  { key: "onHand", label: "Còn lại", sort: "onHand", numeric: true, render: (row, unitId) => <span className={row.onHand < 0 ? styles.neg : undefined}>{perUnit(row.onHand, chosenUnit(row, unitId).factor, "quantity")}</span> },
  { key: "value", label: "Giá trị còn lại", sort: "stockValue", numeric: true, render: (row) => fmt(row.stockValue) },
  { key: "min", label: "Định mức tối thiểu", numeric: true, defaultHidden: true, render: (row, unitId) => perUnit(row.minQuantity, chosenUnit(row, unitId).factor, "quantity") },
  { key: "max", label: "Định mức tối đa", numeric: true, defaultHidden: true, render: (row, unitId) => perUnit(row.maxQuantity, chosenUnit(row, unitId).factor, "quantity") },
  { key: "createdBy", label: "Người tạo", defaultHidden: true, render: (row) => dash(row.createdBy) },
  { key: "createdAt", label: "Ngày tạo", sort: "createdAt", defaultHidden: true, render: (row) => viDateTime(row.createdAt) },
  { key: "status", label: "Trạng thái", sort: "status", render: (row) => <StatusPill tone={row.statusId === DISCONTINUED ? "neutral" : "success"}>{row.statusId === DISCONTINUED ? "Ngừng sử dụng" : "Đang sử dụng"}</StatusPill> },
];
const emptyFilters = { group: "", itemGroupId: "", stock: "", supplierId: "", status: "InUse" };
const stocks = [["InStock", "Còn hàng"], ["OutOfStock", "Hết hàng"], ["BelowMin", "Dưới định mức"], ["AboveMax", "Vượt định mức"]] as const;
const statuses = [["InUse", "Đang sử dụng"], ["Discontinued", "Ngừng sử dụng"], ["All", "Tất cả"]] as const;
const viewFunctions = ["PURCHASE_RECEIPTS", "SUPPLIER_PAYMENTS", "CULTIVATION_CYCLES", "INPUT_ISSUES"];

/**
 * "+ Tạo mới": with a type filtered in the rail (Giống, Vật tư, Khác) it opens the form for that type at once; with "Tất cả"
 * it drops down the three types to pick from first.
 */
function NewItemMenu({ filtered, onPick }: { filtered?: ItemType; onPick(group: ItemType): void }) {
  const [open, setOpen] = useState(false), root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", escape); };
  }, [open]);
  return <div ref={root} className={styles.menuWrap}>
    <Button className="w-auto" aria-haspopup={filtered ? undefined : "menu"} aria-expanded={filtered ? undefined : open}
      onClick={() => filtered ? onPick(filtered) : setOpen((value) => !value)}>
      <InterfaceIcon name="add" className="mr-1 size-4" />Tạo mới{!filtered && <InterfaceIcon name="chevron-down" className="ml-1 size-4" />}
    </Button>
    {open && <div role="menu" className={styles.menu}>{itemTypes.map(([key, label]) =>
      <button key={key} type="button" role="menuitem" onClick={() => { setOpen(false); onPick(key); }}>{label}</button>)}</div>}
  </div>;
}

/**
 * A link opens this list on one item by its code (`?code=VT000001`). The list is keyed by that code so a link followed while the
 * list is already open starts it again: the search box shows the code and that item's row opens.
 */
export function ItemScreen(props: { helpHref?: string }) {
  const linkedCode = useSearchParams().get("code") ?? "";
  return <ItemList key={linkedCode} linkedCode={linkedCode} {...props} />;
}

function ItemList({ helpHref, linkedCode }: { helpHref?: string; linkedCode: string }) {
  const context = useApiWorkspace(), owner = context.identity.subjectType === "CooperativeOwner";
  const can = (fn: string, action: string) => owner || context.permissions.functionPermissions.some((p) => p.functionCode === fn && p.action === action);
  const canView = owner || viewFunctions.some((fn) => can(fn, "View"));
  const access: ItemAccess = { owner, receive: can("PURCHASE_RECEIPTS", "Create"), issue: can("INPUT_ISSUES", "Create"), exportFile: can("PURCHASE_RECEIPTS", "Export") };
  const linkPending = useRef(linkedCode);
  // A linked code is looked for among every status, so that a discontinued item opens too.
  const [search, setSearch] = useState(linkedCode), [filters, setFilters] = useState({ ...emptyFilters, status: linkedCode ? "All" : "InUse" }), [created, setCreated] = useState<TimeRangeValue>(allTime);
  const [sort, setSort] = useState<SortState>({ key: "code", direction: "desc" }), [page, setPage] = useState(1), [pageSize, setPageSize] = useState(15), [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<ItemPage>(), [loading, setLoading] = useState(true), [error, setError] = useState<string>();
  const [expanded, setExpanded] = useState<string>(), [units, setUnits] = useState<Record<string, string>>({});
  const [editor, setEditor] = useState<{ record: ItemView | null; copy: boolean; group?: ItemType }>(), [importing, setImporting] = useState(false), { notify } = useToast(), exportFile = useMutation();
  const groups = useRemote<InputGroup[]>(useCallback((signal: AbortSignal) => canView ? inputRepository.groups(signal) : Promise.resolve({ status: "success" as const, data: [] }), [canView]));
  const lookups = usePurchaseLookups();

  const defaults = useMemo(() => columns.filter((column) => !column.defaultHidden).map((column) => column.key).join(","), []);
  const [storedColumns, storeColumns] = useStoredValue("omts-columns-input-items", defaults);
  const visible = useMemo(() => { const keys = storedColumns.split(","), shown = columns.filter((column) => keys.includes(column.key)); return shown.length ? shown : columns; }, [storedColumns]);

  const query = useMemo<ListQuery>(() => {
    const values: Record<string, string> = { search: search.trim(), group: filters.group, itemGroupId: filters.itemGroupId, stock: filters.stock, supplierId: filters.supplierId, status: filters.status,
      createdFrom: created.from, createdTo: created.to, sortBy: sort.key, sortDir: sort.direction };
    return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== ""));
  }, [search, filters, created, sort]);

  useEffect(() => {
    if (!canView) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true); setError(undefined);
      void inputRepository.list({ ...query, page: String(page), pageSize: String(pageSize) }, controller.signal).then((result) => {
        if (controller.signal.aborted) return;
        setLoading(false);
        if (result.status === "success") {
          setData(result.data);
          if (linkPending.current) {
            const code = linkPending.current.toLowerCase(); linkPending.current = "";
            const linked = result.data.items.find((row) => row.code.toLowerCase() === code);
            if (linked) setExpanded(linked.id);
          }
          if (result.data.total > 0 && page > Math.ceil(result.data.total / pageSize)) setPage(Math.ceil(result.data.total / pageSize));
        } else { setData(undefined); setError(errorText(result)); }
      });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [canView, query, page, pageSize, refresh]);

  function changed<T>(apply: (value: T) => void) { return (value: T) => { apply(value); setPage(1); setExpanded(undefined); }; }
  const setFilter = (key: keyof typeof emptyFilters) => changed<string>((value) => setFilters((current) => ({ ...current, [key]: value })));
  const reload = () => setRefresh((value) => value + 1);
  const hasFilter = Object.entries(filters).some(([key, value]) => key === "status" ? value !== "InUse" : value !== "") || !isAllTime(created);
  if (!canView) return <p role="alert" className="rounded-card border border-border bg-surface p-6">Bạn không có quyền xem chức năng này.</p>;

  const supplierOptions = lookups.suppliers;
  const filterRail = <>
    <div className={styles.railHead}><strong>Bộ lọc</strong><button type="button" className={managementStyles.linkButton} disabled={!hasFilter} onClick={() => changed<void>(() => { setFilters(emptyFilters); setCreated(allTime); })()}>Đặt lại</button></div>
    <FilterPills legend="Loại hàng" name="item-type" value={filters.group} options={itemTypes} onChange={setFilter("group")} />
    {!!groups.data?.length && <FilterGroup legend="Nhóm hàng"><SelectBox aria-label="Nhóm hàng" className={styles.railSelect} value={filters.itemGroupId} onChange={(event) => setFilter("itemGroupId")(event.target.value)}>
      <option value="">Tất cả nhóm hàng</option>{groupTree(groups.data).map((group) => <option key={group.id} value={group.id}>{groupLabel(group)} ({group.itemCount})</option>)}</SelectBox></FilterGroup>}
    <FilterPills legend="Còn lại" name="item-stock" value={filters.stock} options={stocks} onChange={setFilter("stock")} />
    {supplierOptions.length > 0 && <FilterGroup legend="Nhà cung cấp"><SelectBox aria-label="Nhà cung cấp" className={styles.railSelect} value={filters.supplierId} onChange={(event) => setFilter("supplierId")(event.target.value)}>
      <option value="">Tất cả nhà cung cấp</option>{supplierOptions.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</SelectBox></FilterGroup>}
    <TimeRangeFilter legend="Ngày tạo" value={created} onChange={changed<TimeRangeValue>(setCreated)} />
    <FilterGroup legend="Trạng thái"><div className={layoutStyles.pills}>{statuses.map(([key, label]) => <label key={key} className={layoutStyles.pill}><input type="radio" className="sr-only" name="item-status" checked={filters.status === key} onChange={() => setFilter("status")(key)} />{label}</label>)}</div></FilterGroup>
  </>;
  const columnCount = visible.length + 1;

  return <ManagementLayout storageKey="input-items" icon="material" title="Danh mục" filters={filterRail} filterLabel="Bộ lọc danh mục"
    footer={<ManagementPagination page={data?.page ?? page} pageSize={pageSize} total={data?.total ?? 0} unit="mặt hàng" disabled={loading} onPage={(next) => { setPage(next); setExpanded(undefined); }} onPageSize={changed<number>(setPageSize)} />}
    search={<input type="search" aria-label="Tìm hàng" placeholder="Theo mã, tên hàng hoặc mã đơn vị" maxLength={200} value={search} onChange={(event) => changed<string>(setSearch)(event.target.value)} />}
    actions={<>
      {owner && <NewItemMenu filtered={itemTypes.find(([key]) => key === filters.group)?.[0]} onPick={(group) => setEditor({ record: null, copy: false, group })} />}
      {owner && <Button className="w-auto" variant="secondary" onClick={() => setImporting(true)}><InterfaceIcon name="upload" className="mr-1 size-4" />Import file</Button>}
      {access.exportFile && <Button className="w-auto" variant="secondary" isPending={exportFile.pending} onClick={() => void exportFile.run(() => inputRepository.exportList(query), true)}><InterfaceIcon name="download" className="mr-1 size-4" />Xuất file</Button>}
      <ColumnPicker columns={columns} visible={visible.map((column) => column.key)} onChange={(keys) => storeColumns(keys.join(","))} />
      <HelpLink helpHref={helpHref} />
    </>}>
    {exportFile.error && <div className={listStyles.feedback}><ErrorNotice error={exportFile.error} /></div>}
    <ManagementScroller busy={loading}>
      {error ? <ListStateMessage error={error} onRetry={reload} retryLabel="Tải lại" />
        : !data ? <div role="status" aria-label="Đang tải danh sách" className={listStyles.skeleton}>{[1, 2, 3, 4, 5].map((key) => <div key={key} />)}</div>
        : !data.items.length ? <ListStateMessage>{search || hasFilter ? "Không có hàng phù hợp bộ lọc." : "Chưa có vật tư hay giống nào."}</ListStateMessage>
        : <table className={listStyles.table}><thead><tr>
          <th scope="col" className={listStyles.expandCell}><span className="sr-only">Mở dòng</span></th>
          {visible.map((column) => <SortableHeader key={column.key} label={column.label} sortKey={column.sort} sort={sort} onSort={changed<SortState>(setSort)} className={column.numeric ? styles.num : undefined} />)}
        </tr></thead><tbody>
          {data.summary && <tr className={styles.totalRow} aria-label="Tổng hợp theo bộ lọc">
            <td />{visible.map((column, index) => <td key={column.key} className={column.numeric ? styles.num : undefined}>{column.key === "value" ? fmt(data.summary!.stockValue) : index === 0 ? "Tổng" : null}</td>)}
          </tr>}
          {data.items.map((row) => <Fragment key={row.id}>
            <OpenableTableRow data-selected={expanded === row.id || undefined} onOpen={() => setExpanded((value) => value === row.id ? undefined : row.id)}>
              <td className={listStyles.expandCell}><button type="button" aria-expanded={expanded === row.id} aria-label={`${expanded === row.id ? "Thu gọn" : "Mở"} ${row.name}`} onClick={() => setExpanded((value) => value === row.id ? undefined : row.id)}><InterfaceIcon name={expanded === row.id ? "chevron-down" : "chevron-right"} /></button></td>
              {visible.map((column) => <td key={column.key} className={column.numeric ? styles.num : undefined}>{column.render(row, units[row.id], (unitId) => setUnits((current) => ({ ...current, [row.id]: unitId })))}</td>)}
            </OpenableTableRow>
            {expanded === row.id && <tr><td colSpan={columnCount} className={listStyles.detailCell}><div className={managementStyles.viewWidth}>
              <ItemDetailPanel id={row.id} unit={row.units.find((unit) => unit.id === units[row.id])} access={access} onEdit={(record, copy) => setEditor({ record, copy })} onChanged={reload} onRemoved={() => { setExpanded(undefined); reload(); }} />
            </div></td></tr>}
          </Fragment>)}
        </tbody></table>}
    </ManagementScroller>
    {editor && <ItemFormDialog record={editor.record} copy={editor.copy} group={editor.group} onClose={() => setEditor(undefined)} onSaved={(saved, again) => {
      const edited = editor.record !== null && !editor.copy;
      if (!again) setEditor(undefined);
      notify({ tone: "success", title: `Đã ${edited ? "lưu" : "tạo"} vật tư ${saved.code}.` });
      if (!edited) setExpanded(undefined);
      reload();
    }} />}
    {importing && <ItemImportDialog onClose={() => setImporting(false)} onImported={(count) => { notify({ tone: "success", title: `Đã nhập ${count} mặt hàng.` }); reload(); }} />}
  </ManagementLayout>;
}
