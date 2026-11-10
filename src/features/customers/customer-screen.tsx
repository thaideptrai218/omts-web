"use client";
import { SelectBox } from "@/components/ui/select-box";
import { useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { StatusPill } from "@/components/ui/management-page";
import { FilterGroup, FilterPills, HelpLink, ManagementLayout } from "@/components/ui/management-screen/management-layout";
import { BulkBar, ColumnPicker, ListStateMessage, ManagementPagination, ManagementScroller, SortableHeader, managementStyles, type SortState } from "@/components/ui/management-screen/management-table";
import layoutStyles from "@/components/ui/management-screen/management-screen.module.css";
import { NumberRangeFilter } from "@/components/ui/management-screen/number-range-filter";
import { TimeRangeFilter } from "@/components/ui/management-screen/time-range-filter";
import { allTime, isAllTime, type TimeRangeValue } from "@/components/ui/management-screen/time-range-model";
import { useStoredValue } from "@/components/ui/management-screen/use-stored-value";
import { useToast } from "@/components/ui/toast-provider";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { listCollectors } from "@/features/cash-book/repository";
import { ErrorNotice, Money, useMutation, useRemote } from "@/features/operations/ui";
import { viDate, viDateTime } from "@/features/purchase-documents/document-parts";
import { IN_USE, genderLabel, typeLabel, customerTypes, genders, type BulkResult, type CustomerDetail, type CustomerPage, type CustomerRow } from "./contracts";
import { CustomerDetailPanel, type CustomerAccess } from "./customer-detail";
import { CustomerFormDialog } from "./customer-form-dialog";
import { CustomerImportDialog } from "./customer-import-dialog";
import { customerRepository, errorText, type ListQuery } from "./repository";
import styles from "./customers.module.css";
import listStyles from "@/features/suppliers-api/suppliers.module.css";

type Column = { key: string; label: string; sort?: string; numeric?: boolean; gate?: "debt"; defaultHidden?: boolean; render(row: CustomerRow): ReactNode };
const dash = (value: string | null | undefined) => value || "—";
const columns: readonly Column[] = [
  { key: "code", label: "Mã khách hàng", sort: "code", render: (row) => <span className="font-mono tabular-nums">{row.code}</span> },
  { key: "name", label: "Tên khách hàng", sort: "name", render: (row) => <><span className={styles.name}>{row.name}</span>{row.hasTraderAccount && <span className={`${styles.badge} ${styles.badgeWarn}`}>Thương lái</span>}</> },
  { key: "type", label: "Loại khách", sort: "type", render: (row) => typeLabel(row.customerType) },
  { key: "phone", label: "Điện thoại", sort: "phone", render: (row) => dash(row.phoneNumber) },
  { key: "phone2", label: "Điện thoại 2", defaultHidden: true, render: (row) => dash(row.phoneNumber2) },
  { key: "email", label: "Email", defaultHidden: true, render: (row) => dash(row.email) },
  { key: "facebook", label: "Facebook", defaultHidden: true, render: (row) => dash(row.facebook) },
  { key: "gender", label: "Giới tính", defaultHidden: true, render: (row) => dash(genderLabel(row.gender)) },
  { key: "birthDate", label: "Sinh nhật", defaultHidden: true, render: (row) => row.birthDate ? viDate(row.birthDate) : "—" },
  { key: "address", label: "Địa chỉ", defaultHidden: true, render: (row) => dash(row.address) },
  { key: "province", label: "Tỉnh/thành", sort: "province", defaultHidden: true, render: (row) => dash(row.province) },
  { key: "ward", label: "Phường/xã", defaultHidden: true, render: (row) => dash(row.ward) },
  { key: "company", label: "Tên đơn vị", defaultHidden: true, render: (row) => dash(row.companyName) },
  { key: "taxCode", label: "Mã số thuế", defaultHidden: true, render: (row) => dash(row.taxCode) },
  { key: "last", label: "Ngày giao dịch cuối", sort: "lastTransaction", render: (row) => row.lastTransactionAt ? viDateTime(row.lastTransactionAt) : "—" },
  { key: "debt", label: "Nợ hiện tại", sort: "currentDebt", numeric: true, gate: "debt", render: (row) => <Figure value={row.currentDebt} /> },
  { key: "total", label: "Tổng bán", sort: "totalSales", numeric: true, gate: "debt", render: (row) => <Figure value={row.totalSales} /> },
  { key: "net", label: "Tổng bán trừ trả hàng", sort: "netSales", numeric: true, gate: "debt", render: (row) => <Figure value={row.netSales} /> },
  { key: "createdBy", label: "Người tạo", defaultHidden: true, render: (row) => dash(row.createdBy) },
  { key: "createdAt", label: "Ngày tạo", sort: "createdAt", defaultHidden: true, render: (row) => viDateTime(row.createdAt) },
  { key: "status", label: "Trạng thái", sort: "status", render: (row) => <StatusPill tone={row.statusId === IN_USE ? "success" : "neutral"}>{row.statusId === IN_USE ? "Đang hoạt động" : "Ngừng hoạt động"}</StatusPill> },
];
function Figure({ value }: { value: number | null | undefined }) { return <span className={value != null && value < 0 ? styles.neg : undefined}><Money value={value} /></span>; }
const emptyFilters = { type: "", gender: "", province: "", status: "InUse", createdById: "", totalFrom: "", totalTo: "", debtFrom: "", debtTo: "" };
const reversed = (from: string, to: string) => from !== "" && to !== "" && Number(from) > Number(to);
const statuses = [["InUse", "Đang hoạt động"], ["Discontinued", "Ngừng hoạt động"], ["All", "Tất cả"]] as const;

/**
 * A link opens this list on one customer by its code (`?code=KH000002`). The list is keyed by that code so a link followed while the list
 * is already open starts it again: the search box shows the code and that customer's row opens.
 */
export function CustomerScreen(props: { helpHref?: string }) {
  const linkedCode = useSearchParams().get("code") ?? "";
  return <CustomerList key={linkedCode} linkedCode={linkedCode} {...props} />;
}

function CustomerList({ helpHref, linkedCode }: { helpHref?: string; linkedCode: string }) {
  const context = useApiWorkspace();
  const can = (fn: string, action: string) => context.identity.subjectType === "CooperativeOwner" || context.permissions.functionPermissions.some((p) => p.functionCode === fn && p.action === action);
  const canView = can("CUSTOMERS", "View"), canCreate = can("CUSTOMERS", "Create"), canEdit = can("CUSTOMERS", "Edit"), canExport = can("CUSTOMERS", "Export"), canDebt = can("CUSTOMER_DEBTS", "View");
  const access: CustomerAccess = { edit: canEdit, remove: can("CUSTOMERS", "Delete"), history: can("SALES_INVOICES", "View"), requests: can("PURCHASE_REQUESTS", "View"), debt: canDebt,
    pay: can("CUSTOMER_PAYMENTS", "Create"), adjust: can("CUSTOMER_PAYMENTS", "Edit"), confirm: can("CUSTOMER_PAYMENTS", "Edit"), exportDebt: can("CUSTOMER_DEBTS", "Export") };
  const linkPending = useRef(linkedCode);
  // A linked code is looked for among every status, so that a discontinued customer opens too.
  const [search, setSearch] = useState(linkedCode), [filters, setFilters] = useState({ ...emptyFilters, status: linkedCode ? "All" : "InUse" });
  const [birthday, setBirthday] = useState<TimeRangeValue>(allTime), [lastTransaction, setLastTransaction] = useState<TimeRangeValue>(allTime), [salesTime, setSalesTime] = useState<TimeRangeValue>(allTime), [created, setCreated] = useState<TimeRangeValue>(allTime);
  const [sort, setSort] = useState<SortState>({ key: "code", direction: "desc" });
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(15), [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<CustomerPage>(), [loading, setLoading] = useState(true), [error, setError] = useState<string>();
  const [expanded, setExpanded] = useState<string>(), [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [editor, setEditor] = useState<CustomerDetail | null>(), [importing, setImporting] = useState(false), { notify } = useToast(), [bulkOutcome, setBulkOutcome] = useState<BulkResult>();
  const bulk = useMutation(), exportFile = useMutation(), confirmation = useActionDialog();
  // The people who may have made a customer come from the cash book's list of staff, which only its readers can see.
  const canPeople = can("CASH_BOOK", "View");
  const creators = useRemote(useCallback((signal: AbortSignal) => canPeople ? listCollectors(signal) : Promise.resolve({ status: "success" as const, data: undefined }), [canPeople]));

  const offered = useMemo(() => columns.filter((column) => column.gate === "debt" ? canDebt : true), [canDebt]);
  const defaults = useMemo(() => offered.filter((column) => !column.defaultHidden).map((column) => column.key).join(","), [offered]);
  const [storedColumns, storeColumns] = useStoredValue("omts-columns-customers", defaults);
  const visible = useMemo(() => { const keys = storedColumns.split(","), shown = offered.filter((column) => keys.includes(column.key)); return shown.length ? shown : offered; }, [storedColumns, offered]);

  const rangeError = reversed(filters.totalFrom, filters.totalTo) || reversed(filters.debtFrom, filters.debtTo);
  const query = useMemo<ListQuery>(() => {
    const values: Record<string, string> = { search: search.trim(), type: filters.type, gender: filters.gender, province: filters.province.trim(), status: filters.status, createdById: filters.createdById, sortBy: sort.key, sortDir: sort.direction,
      lastTransactionFrom: lastTransaction.from, lastTransactionTo: lastTransaction.to, createdFrom: created.from, createdTo: created.to, birthdayFrom: birthday.from, birthdayTo: birthday.to };
    // The debt and sales figures belong to the debt permission: without it neither their filters nor their sort are asked for.
    if (canDebt) Object.assign(values, { totalSalesFrom: filters.totalFrom, totalSalesTo: filters.totalTo, salesFrom: salesTime.from, salesTo: salesTime.to, currentDebtFrom: filters.debtFrom, currentDebtTo: filters.debtTo });
    return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== ""));
  }, [search, filters, birthday, lastTransaction, salesTime, created, sort, canDebt]);

  useEffect(() => {
    if (!canView || rangeError) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true); setError(undefined);
      void customerRepository.list({ ...query, page: String(page), pageSize: String(pageSize) }, controller.signal).then((result) => {
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
  }, [canView, query, page, pageSize, refresh, rangeError]);

  function changed<T>(apply: (value: T) => void) { return (value: T) => { apply(value); setPage(1); setExpanded(undefined); setSelected(new Set()); }; }
  const setFilter = (key: keyof typeof emptyFilters) => changed<string>((value) => setFilters((current) => ({ ...current, [key]: value })));
  const reload = () => setRefresh((value) => value + 1);
  const hasFilter = Object.entries(filters).some(([key, value]) => key === "status" ? value !== "InUse" : value !== "") || [birthday, lastTransaction, salesTime, created].some((value) => !isAllTime(value));
  const pageIds = data?.items.map((row) => row.id) ?? [];
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  function toggle(id: string, on: boolean) { setSelected((current) => { const next = new Set(current); if (on) next.add(id); else next.delete(id); return next; }); }
  async function runBulk(action: "Discontinue" | "Resume") {
    const ids = [...selected];
    if (!(await confirmation.confirm(action === "Discontinue" ? `Ngừng hoạt động ${ids.length} khách hàng?` : `Sử dụng lại ${ids.length} khách hàng?`))) return;
    const result = await bulk.run(() => customerRepository.bulk(action, ids));
    if (result) {
      setBulkOutcome(result); setSelected(new Set(result.outcomes.filter((o) => !o.succeeded).map((o) => o.id))); reload();
      if (result.succeeded > 0) notify({ tone: "success", title: `${action === "Discontinue" ? "Đã ngừng hoạt động" : "Đã sử dụng lại"} ${result.succeeded} khách hàng.` });
    }
  }

  if (!canView) return <p role="alert" className="rounded-card border border-border bg-surface p-6">Bạn không có quyền xem chức năng này.</p>;
  const failedOutcomes = bulkOutcome?.outcomes.filter((outcome) => !outcome.succeeded) ?? [];
  const summary = canDebt ? data?.summary : undefined;
  const filterRail = <>
    <div className={listStyles.railHead}><strong>Bộ lọc</strong><button type="button" className={managementStyles.linkButton} disabled={!hasFilter} onClick={() => changed<void>(() => { setFilters(emptyFilters); setBirthday(allTime); setLastTransaction(allTime); setSalesTime(allTime); setCreated(allTime); })()}>Đặt lại</button></div>
    <FilterPills legend="Loại khách" name="customer-type" value={filters.type} options={customerTypes} onChange={setFilter("type")} />
    <FilterPills legend="Giới tính" name="customer-gender" value={filters.gender} options={genders} onChange={setFilter("gender")} />
    <TimeRangeFilter legend="Sinh nhật" value={birthday} onChange={changed<TimeRangeValue>(setBirthday)} />
    <TimeRangeFilter legend="Ngày giao dịch cuối" value={lastTransaction} onChange={changed<TimeRangeValue>(setLastTransaction)} />
    {canDebt && <FilterGroup legend="Tổng bán"><NumberRangeFilter label="Tổng bán" from={filters.totalFrom} to={filters.totalTo} onFromChange={setFilter("totalFrom")} onToChange={setFilter("totalTo")} /></FilterGroup>}
    {canDebt && <TimeRangeFilter legend="Thời gian bán" value={salesTime} onChange={changed<TimeRangeValue>(setSalesTime)} />}
    {canDebt && <FilterGroup legend="Nợ hiện tại"><NumberRangeFilter label="Nợ hiện tại" allowNegative from={filters.debtFrom} to={filters.debtTo} onFromChange={setFilter("debtFrom")} onToChange={setFilter("debtTo")} /></FilterGroup>}
    {rangeError && <p role="alert" className={listStyles.rangeError}>Giá trị &quot;từ&quot; phải nhỏ hơn hoặc bằng giá trị &quot;đến&quot;.</p>}
    <FilterGroup legend="Tỉnh/thành"><input type="search" aria-label="Tỉnh/thành" className="h-[30px] w-full rounded-md border border-border-strong px-2 text-[13px]" maxLength={100} placeholder="Nhập tỉnh/thành" value={filters.province} onChange={(event) => setFilter("province")(event.target.value)} /></FilterGroup>
    <FilterGroup legend="Trạng thái"><div className={layoutStyles.pills}>{statuses.map(([key, label]) => <label key={key} className={layoutStyles.pill}><input type="radio" className="sr-only" name="customer-status" checked={filters.status === key} onChange={() => setFilter("status")(key)} />{label}</label>)}</div></FilterGroup>
    {creators.data && <FilterGroup legend="Người tạo"><SelectBox aria-label="Người tạo" className="h-[30px] w-full rounded-md border border-border-strong bg-surface px-2 text-[13px]" value={filters.createdById} onChange={(event) => setFilter("createdById")(event.target.value)}>
      <option value="">Tất cả</option>{creators.data.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</SelectBox></FilterGroup>}
    <TimeRangeFilter legend="Ngày tạo" value={created} onChange={changed<TimeRangeValue>(setCreated)} />
  </>;
  const columnCount = visible.length + (canEdit ? 2 : 1);

  return <ManagementLayout storageKey="customers" icon="users" title="Khách hàng" filters={filterRail} filterLabel="Bộ lọc khách hàng"
    footer={<ManagementPagination page={data?.page ?? page} pageSize={pageSize} total={data?.total ?? 0} unit="khách hàng" disabled={loading} onPage={(next) => { setPage(next); setExpanded(undefined); setSelected(new Set()); }} onPageSize={changed<number>(setPageSize)} />}
    search={<input type="search" aria-label="Tìm khách hàng" placeholder="Theo mã, tên hoặc điện thoại" maxLength={200} value={search} onChange={(event) => changed<string>(setSearch)(event.target.value)} />}
    actions={<>
      {canCreate && <Button className="w-auto" onClick={() => setEditor(null)}><InterfaceIcon name="add" className="mr-1 size-4" />Khách hàng</Button>}
      {canCreate && <Button className="w-auto" variant="secondary" onClick={() => setImporting(true)}><InterfaceIcon name="upload" className="mr-1 size-4" />Import file</Button>}
      {canExport && <Button className="w-auto" variant="secondary" isPending={exportFile.pending} disabled={rangeError} onClick={() => void exportFile.run(() => customerRepository.exportList(query), true)}><InterfaceIcon name="download" className="mr-1 size-4" />Xuất file</Button>}
      <ColumnPicker columns={offered} visible={visible.map((column) => column.key)} onChange={(keys) => storeColumns(keys.join(","))} />
      <HelpLink helpHref={helpHref} />
    </>}>
    {confirmation.dialog}
    <BulkBar count={canEdit ? selected.size : 0} onClear={() => setSelected(new Set())}>
      <Button className="w-auto" variant="danger" disabled={bulk.pending} onClick={() => void runBulk("Discontinue")}>Ngừng hoạt động</Button>
      <Button className="w-auto" variant="secondary" disabled={bulk.pending} onClick={() => void runBulk("Resume")}>Sử dụng lại</Button>
    </BulkBar>
    {(bulk.error || exportFile.error || bulkOutcome) && <div className={listStyles.feedback}>
      <ErrorNotice error={bulk.error || exportFile.error} />
      {bulkOutcome && <div role="status"><p>Thành công {bulkOutcome.succeeded}, không thực hiện được {bulkOutcome.failed}. <button type="button" className={managementStyles.linkButton} onClick={() => setBulkOutcome(undefined)}>Đóng</button></p>
        {failedOutcomes.length > 0 && <ul>{failedOutcomes.map((outcome) => <li key={outcome.id}>{data?.items.find((row) => row.id === outcome.id)?.name ?? outcome.id}: {outcome.code === "MSG-GEN-09" ? "Trạng thái hiện tại không cho phép." : "Không thực hiện được."}</li>)}</ul>}</div>}
    </div>}
    <ManagementScroller busy={loading}>
      {error ? <ListStateMessage error={error} onRetry={reload} retryLabel="Tải lại" />
        : !data ? <div role="status" aria-label="Đang tải danh sách" className={listStyles.skeleton}>{[1, 2, 3, 4, 5].map((key) => <div key={key} />)}</div>
        : !data.items.length ? <ListStateMessage>{search || hasFilter ? "Không có khách hàng phù hợp bộ lọc." : "Chưa có khách hàng."}</ListStateMessage>
        : <table className={listStyles.table}><thead><tr>
          {canEdit && <th scope="col" className={listStyles.checkCell}><input type="checkbox" aria-label="Chọn tất cả trên trang" checked={allSelected} onChange={(event) => setSelected(event.target.checked ? new Set([...selected, ...pageIds]) : new Set([...selected].filter((id) => !pageIds.includes(id))))} /></th>}
          <th scope="col" className={listStyles.expandCell}><span className="sr-only">Mở dòng</span></th>
          {visible.map((column) => <SortableHeader key={column.key} label={column.label} sortKey={column.sort} sort={sort} onSort={changed<SortState>(setSort)} className={column.numeric ? styles.num : undefined} />)}
        </tr></thead><tbody>
          {summary && <tr className={styles.totalRow} aria-label="Tổng hợp theo bộ lọc">
            {canEdit && <td />}<td />
            {visible.map((column, index) => <td key={column.key} className={column.numeric ? styles.num : undefined}>
              {column.key === "debt" ? <Figure value={summary.debt} /> : column.key === "total" ? <Figure value={summary.totalSales} /> : column.key === "net" ? <Figure value={summary.netSales} /> : index === 0 ? "Tổng" : null}</td>)}
          </tr>}
          {data.items.map((row) => <Fragment key={row.id}>
            <OpenableTableRow data-selected={expanded === row.id || undefined} onOpen={() => setExpanded((value) => value === row.id ? undefined : row.id)}>
              {canEdit && <td className={listStyles.checkCell}><input type="checkbox" aria-label={`Chọn ${row.name}`} checked={selected.has(row.id)} onChange={(event) => toggle(row.id, event.target.checked)} /></td>}
              <td className={listStyles.expandCell}><button type="button" aria-expanded={expanded === row.id} aria-label={`${expanded === row.id ? "Thu gọn" : "Mở"} ${row.name}`} onClick={() => setExpanded((value) => value === row.id ? undefined : row.id)}><InterfaceIcon name={expanded === row.id ? "chevron-down" : "chevron-right"} /></button></td>
              {visible.map((column) => <td key={column.key} className={column.numeric ? styles.num : undefined}>{column.render(row)}</td>)}
            </OpenableTableRow>
            {expanded === row.id && <tr><td colSpan={columnCount} className={listStyles.detailCell}><div className={managementStyles.viewWidth}>
              <CustomerDetailPanel id={row.id} access={access} onEdit={setEditor} onChanged={reload} onRemoved={() => { setExpanded(undefined); reload(); }} />
            </div></td></tr>}
          </Fragment>)}
        </tbody></table>}
    </ManagementScroller>
    {editor !== undefined && <CustomerFormDialog record={editor} onClose={() => setEditor(undefined)} onSaved={(saved) => { const created = editor === null; setEditor(undefined); notify({ tone: "success", title: `Đã ${created ? "tạo" : "lưu"} khách hàng ${saved.code}.` }); if (created) setExpanded(undefined); reload(); }} />}
    {importing && <CustomerImportDialog onClose={() => setImporting(false)} onImported={(count) => { setImporting(false); notify({ tone: "success", title: `Đã nhập ${count} khách hàng.` }); reload(); }} />}
  </ManagementLayout>;
}
