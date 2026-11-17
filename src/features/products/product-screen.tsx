"use client";
import { useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { StatusPill } from "@/components/ui/management-page";
import { FilterGroup, FilterPills, HelpLink, ManagementLayout } from "@/components/ui/management-screen/management-layout";
import layoutStyles from "@/components/ui/management-screen/management-screen.module.css";
import { ColumnPicker, ListStateMessage, ManagementPagination, ManagementScroller, SortableHeader, managementStyles, type SortState } from "@/components/ui/management-screen/management-table";
import { useStoredValue } from "@/components/ui/management-screen/use-stored-value";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import { SelectBox } from "@/components/ui/select-box";
import { useToast } from "@/components/ui/toast-provider";
import inputStyles from "@/features/input-items/input-items.module.css";
import { groupLabel, groupTree } from "@/features/input-items/item-helpers";
import { ErrorNotice, useMutation, useRemote } from "@/features/operations/ui";
import { fmt, viDateTime } from "@/features/purchase-documents/document-parts";
import listStyles from "@/features/suppliers-api/suppliers.module.css";
import { DISCONTINUED, type ProductGroup, type ProductPage, type ProductRow, type ProductView } from "./contracts";
import { ProductDetailPanel } from "./product-detail";
import { useProductAccess } from "./product-access";
import { ProductFormDialog } from "./product-form-dialog";
import { chosenUnit, inUnitQuantity, unitSalePrice } from "./product-helpers";
import { ProductImportDialog } from "./product-import-dialog";
import { errorText, productRepository } from "./repository";
import type { ListQuery } from "@/features/input-items/repository";

type Column = { key: string; label: string; sort?: string; numeric?: boolean; defaultHidden?: boolean; render(row: ProductRow, unitId: string | undefined, setUnit: (unitId: string) => void): ReactNode };
const dash = (value: string | null | undefined) => value || "—";
/** The quantity of the row in the unit picked for it: kg divided by the factor. */
const perUnit = (value: number | null | undefined, factor: number) => {
  const shown = inUnitQuantity(value, factor);
  return shown == null ? "—" : fmt(shown);
};
const columns: readonly Column[] = [
  // The code follows the unit picked under the name: each unit has its own code (SP000001-L for a lồng).
  { key: "code", label: "Mã sản phẩm", sort: "code", render: (row, unitId) => { const unit = chosenUnit(row, unitId); return <span className="font-mono tabular-nums">{!unit.isBase && unit.code ? unit.code : row.code}</span>; } },
  // The unit is picked under the name ("- Lồng ⌄", like KiotViet); the code, price and quantity of the row follow it.
  { key: "name", label: "Tên sản phẩm", sort: "name", render: (row, unitId, setUnit) => <span className={inputStyles.name}>{row.name}
    {row.units.length > 1 && <span className={inputStyles.unitPick} onClick={(event) => event.stopPropagation()}>
      <SelectBox aria-label={`Đơn vị ${row.code}`} className={inputStyles.unitLink} value={chosenUnit(row, unitId).id} onChange={(event) => setUnit(event.target.value)}>{row.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</SelectBox>
    </span>}</span> },
  { key: "category", label: "Nhóm sản phẩm", sort: "category", render: (row) => dash(row.categoryName) },
  { key: "price", label: "Giá bán", sort: "unitPrice", numeric: true, render: (row, unitId) => { const unit = chosenUnit(row, unitId); return row.unitPrice == null ? "—" : <>{fmt(unitSalePrice(row.unitPrice, unit))}<span className={inputStyles.muted}> /{unit.name}</span></>; } },
  { key: "onHand", label: "Còn lại", sort: "onHand", numeric: true, render: (row, unitId) => { const unit = chosenUnit(row, unitId); return <span className={(row.onHandKg ?? 0) < 0 ? inputStyles.neg : undefined}>{perUnit(row.onHandKg, unit.factor)}<span className={inputStyles.muted}> {unit.name}</span></span>; } },
  { key: "min", label: "Định mức tối thiểu (kg)", numeric: true, defaultHidden: true, render: (row) => fmt(row.minKg) },
  { key: "max", label: "Định mức tối đa (kg)", numeric: true, defaultHidden: true, render: (row) => fmt(row.maxKg) },
  { key: "createdBy", label: "Người tạo", defaultHidden: true, render: (row) => dash(row.createdBy) },
  { key: "createdAt", label: "Ngày tạo", sort: "createdAt", defaultHidden: true, render: (row) => viDateTime(row.createdAt) },
  { key: "status", label: "Trạng thái", sort: "status", render: (row) => <StatusPill tone={row.statusId === DISCONTINUED ? "neutral" : "success"}>{row.statusId === DISCONTINUED ? "Ngừng bán" : "Đang bán"}</StatusPill> },
];
const emptyFilters = { categoryId: "", stock: "", status: "InUse" };
const stocks = [["InStock", "Còn hàng"], ["OutOfStock", "Hết hàng"], ["BelowMin", "Dưới định mức"], ["AboveMax", "Vượt định mức"]] as const;
const statuses = [["InUse", "Đang bán"], ["Discontinued", "Ngừng bán"], ["All", "Tất cả"]] as const;

/**
 * A link opens this list on one product by its code (`?code=SP000001`). The list is keyed by that code so a link followed while the
 * list is already open starts it again: the search box shows the code and that product's row opens.
 */
export function ProductScreen(props: { helpHref?: string }) {
  const linkedCode = useSearchParams().get("code") ?? "";
  return <ProductList key={linkedCode} linkedCode={linkedCode} {...props} />;
}

function ProductList({ helpHref, linkedCode }: { helpHref?: string; linkedCode: string }) {
  const access = useProductAccess(), { owner } = access, canView = access.view;
  const linkPending = useRef(linkedCode);
  // A linked code is looked for among every status, so that a discontinued product opens too.
  const [search, setSearch] = useState(linkedCode), [filters, setFilters] = useState({ ...emptyFilters, status: linkedCode ? "All" : "InUse" });
  const [sort, setSort] = useState<SortState>({ key: "code", direction: "desc" }), [page, setPage] = useState(1), [pageSize, setPageSize] = useState(15), [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<ProductPage>(), [loading, setLoading] = useState(true), [error, setError] = useState<string>();
  const [expanded, setExpanded] = useState<string>(), [units, setUnits] = useState<Record<string, string>>({});
  const [editor, setEditor] = useState<{ record: ProductView | null; copy: boolean }>(), [importing, setImporting] = useState(false), { notify } = useToast(), exportFile = useMutation();
  const groups = useRemote<ProductGroup[]>(useCallback((signal: AbortSignal) => canView ? productRepository.groups(signal) : Promise.resolve({ status: "success" as const, data: [] }), [canView]));

  const defaults = useMemo(() => columns.filter((column) => !column.defaultHidden).map((column) => column.key).join(","), []);
  const [storedColumns, storeColumns] = useStoredValue("omts-columns-products", defaults);
  const visible = useMemo(() => { const keys = storedColumns.split(","), shown = columns.filter((column) => keys.includes(column.key)); return shown.length ? shown : columns; }, [storedColumns]);

  const query = useMemo<ListQuery>(() => {
    const values: Record<string, string> = { search: search.trim(), categoryId: filters.categoryId, stock: filters.stock, status: filters.status, sortBy: sort.key, sortDir: sort.direction };
    return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== ""));
  }, [search, filters, sort]);

  useEffect(() => {
    if (!canView) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true); setError(undefined);
      void productRepository.list({ ...query, page: String(page), pageSize: String(pageSize) }, controller.signal).then((result) => {
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
  const hasFilter = Object.entries(filters).some(([key, value]) => key === "status" ? value !== "InUse" : value !== "");
  if (!canView) return <p role="alert" className="rounded-card border border-border bg-surface p-6">Bạn không có quyền xem chức năng này.</p>;

  const filterRail = <>
    <div className={inputStyles.railHead}><strong>Bộ lọc</strong><button type="button" className={managementStyles.linkButton} disabled={!hasFilter} onClick={() => changed<void>(() => setFilters(emptyFilters))()}>Đặt lại</button></div>
    {!!groups.data?.length && <FilterGroup legend="Nhóm sản phẩm"><SelectBox aria-label="Nhóm sản phẩm" className={inputStyles.railSelect} value={filters.categoryId} onChange={(event) => setFilter("categoryId")(event.target.value)}>
      <option value="">Tất cả nhóm</option>{groupTree(groups.data).map((group) => <option key={group.id} value={group.id}>{groupLabel(group)} ({group.itemCount})</option>)}</SelectBox></FilterGroup>}
    <FilterPills legend="Còn lại" name="product-stock" value={filters.stock} options={stocks} onChange={setFilter("stock")} />
    <FilterGroup legend="Trạng thái"><div className={layoutStyles.pills}>{statuses.map(([key, label]) => <label key={key} className={layoutStyles.pill}><input type="radio" className="sr-only" name="product-status" checked={filters.status === key} onChange={() => setFilter("status")(key)} />{label}</label>)}</div></FilterGroup>
  </>;
  const columnCount = visible.length + 1;

  return <ManagementLayout storageKey="products" icon="product" title="Sản phẩm" filters={filterRail} filterLabel="Bộ lọc sản phẩm"
    footer={<ManagementPagination page={data?.page ?? page} pageSize={pageSize} total={data?.total ?? 0} unit="sản phẩm" disabled={loading} onPage={(next) => { setPage(next); setExpanded(undefined); }} onPageSize={changed<number>(setPageSize)} />}
    search={<input type="search" aria-label="Tìm sản phẩm" placeholder="Theo mã, tên sản phẩm hoặc mã đơn vị" maxLength={200} value={search} onChange={(event) => changed<string>(setSearch)(event.target.value)} />}
    actions={<>
      {owner && <Button className="w-auto" onClick={() => setEditor({ record: null, copy: false })}><InterfaceIcon name="add" className="mr-1 size-4" />Tạo mới</Button>}
      {owner && <Button className="w-auto" variant="secondary" onClick={() => setImporting(true)}><InterfaceIcon name="upload" className="mr-1 size-4" />Import file</Button>}
      <Button className="w-auto" variant="secondary" isPending={exportFile.pending} onClick={() => void exportFile.run(() => productRepository.exportList(query), true)}><InterfaceIcon name="download" className="mr-1 size-4" />Xuất file</Button>
      <ColumnPicker columns={columns} visible={visible.map((column) => column.key)} onChange={(keys) => storeColumns(keys.join(","))} />
      <HelpLink helpHref={helpHref} />
    </>}>
    {exportFile.error && <div className={listStyles.feedback}><ErrorNotice error={exportFile.error} /></div>}
    <ManagementScroller busy={loading}>
      {error ? <ListStateMessage error={error} onRetry={reload} retryLabel="Tải lại" />
        : !data ? <div role="status" aria-label="Đang tải danh sách" className={listStyles.skeleton}>{[1, 2, 3, 4, 5].map((key) => <div key={key} />)}</div>
        : !data.items.length ? <ListStateMessage>{search || hasFilter ? "Không có sản phẩm phù hợp bộ lọc." : "Chưa có sản phẩm nào."}</ListStateMessage>
        : <table className={listStyles.table}><thead><tr>
          <th scope="col" className={listStyles.expandCell}><span className="sr-only">Mở dòng</span></th>
          {visible.map((column) => <SortableHeader key={column.key} label={column.label} sortKey={column.sort} sort={sort} onSort={changed<SortState>(setSort)} className={column.numeric ? inputStyles.num : undefined} />)}
        </tr></thead><tbody>
          {data.summary && <tr className={inputStyles.totalRow} aria-label="Tổng hợp theo bộ lọc">
            <td />{visible.map((column, index) => <td key={column.key} className={column.numeric ? inputStyles.num : undefined}>{column.key === "onHand" ? `${fmt(data.summary!.totalOnHandKg)} kg` : index === 0 ? "Tổng" : null}</td>)}
          </tr>}
          {data.items.map((row) => <Fragment key={row.id}>
            <OpenableTableRow data-selected={expanded === row.id || undefined} onOpen={() => setExpanded((value) => value === row.id ? undefined : row.id)}>
              <td className={listStyles.expandCell}><button type="button" aria-expanded={expanded === row.id} aria-label={`${expanded === row.id ? "Thu gọn" : "Mở"} ${row.name}`} onClick={() => setExpanded((value) => value === row.id ? undefined : row.id)}><InterfaceIcon name={expanded === row.id ? "chevron-down" : "chevron-right"} /></button></td>
              {visible.map((column) => <td key={column.key} className={column.numeric ? inputStyles.num : undefined}>{column.render(row, units[row.id], (unitId) => setUnits((current) => ({ ...current, [row.id]: unitId })))}</td>)}
            </OpenableTableRow>
            {expanded === row.id && <tr><td colSpan={columnCount} className={listStyles.detailCell}><div className={managementStyles.viewWidth}>
              <ProductDetailPanel id={row.id} unit={row.units.find((unit) => unit.id === units[row.id])} access={{ owner }} onEdit={(record, copy) => setEditor({ record, copy })} onChanged={reload} onRemoved={() => { setExpanded(undefined); reload(); }} />
            </div></td></tr>}
          </Fragment>)}
        </tbody></table>}
    </ManagementScroller>
    {editor && <ProductFormDialog record={editor.record} copy={editor.copy} onClose={() => setEditor(undefined)} onSaved={(saved, again) => {
      const edited = editor.record !== null && !editor.copy;
      if (!again) setEditor(undefined);
      notify({ tone: "success", title: `Đã ${edited ? "lưu" : "tạo"} sản phẩm ${saved.code}.` });
      if (!edited) setExpanded(undefined);
      reload();
    }} />}
    {importing && <ProductImportDialog onClose={() => setImporting(false)} onImported={(count) => { notify({ tone: "success", title: `Đã nhập ${count} sản phẩm.` }); reload(); }} />}
  </ManagementLayout>;
}
