"use client";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { HelpLink, ManagementLayout } from "@/components/ui/management-screen/management-layout";
import { BulkBar, ColumnPicker, ListStateMessage, ManagementScroller, type SortState } from "@/components/ui/management-screen/management-table";
import { useStoredValue } from "@/components/ui/management-screen/use-stored-value";
import { ScreenGuide, type GuideStep } from "@/components/ui/screen-guide";
import { useToast } from "@/components/ui/toast-provider";
import { ALL_ZONES, useZoneFilter } from "@/features/api-workspace/zone-filter";
import { useLinkedZone } from "@/features/farming-management/use-linked-zone";
import { loadInUseZones } from "@/features/zones-api/in-use-zones";
import { createOperationsRepository } from "@/features/operations/repository";
import { readSelectionPages } from "@/features/operations/selection-pages";
import { ErrorNotice, useRemote } from "@/features/operations/ui";
import { employeePageSchema, type Employee } from "./contracts";
import { filterNeedsAccounts, readWithAccountFilter, type AccountFilter } from "./employee-account-filter";
import { searchWithAccountNames } from "./employee-account-name-search";
import { EmployeeDirectoryFilters } from "./employee-directory-filters";
import { EmployeeDirectoryPaging } from "./employee-directory-paging";
import { EmployeeDetailPanel } from "./employee-detail-panel";
import { defaultEmployeeColumns, employeeColumns, EmployeeDirectoryTable } from "./employee-directory-table";
import { EmployeeFormDialog } from "./employee-form-dialog";
import { employeeFileRepository } from "./employee-file-repository";
import { EmployeeImportDialog } from "./employee-import-dialog";
import { payrollColumnKeys, type EmployeeViewerAccess } from "./employee-viewer-access";
import { isPermissionDenied, PermissionDeniedNotice } from "./permission-denied-notice";
import { useEmployeeDirectoryList } from "./use-employee-directory-list";
import { exportLimitMessage, useEmployeeFileAction } from "./use-employee-file-action";
import styles from "./employee-directory.module.css";

/** v5: the columns follow the KiotViet list (photo, code, name, phone, ID number, type, zones, salary type, debt, notes, status). */
export const EMPLOYEE_COLUMNS_STORAGE = "omts-columns-employees-v5";
const noAccess: EmployeeViewerAccess = { read: true, manage: true, payroll: true, salary: true, salaryEdit: true };
/** Employee list: the same fixed management frame and data contracts as the other production lists. Editing is the "Cập nhật nhân viên" dialog. */
export function EmployeeDirectory({ readOnly = false, access = noAccess }: { readOnly?: boolean; access?: EmployeeViewerAccess }) {
  const repository = useMemo(() => createOperationsRepository("employees"), []);
  const { notify } = useToast();
  // Replaced (not cleared) on refresh so the cached Map is never mutated after render.
  const [cache, setCache] = useState(() => new Map<string, Employee>());
  const [detailRevision, setDetailRevision] = useState(0);
  // A link from another screen (for example a zone's staff tab) opens one employee: ?recordId=<id>&search=<name>.
  const params = useSearchParams(), linkedSearch = params?.get("search") ?? "", linkedId = params?.get("recordId") ?? undefined;
  const [search, setSearch] = useState(linkedSearch), [term, setTerm] = useState(linkedSearch.trim());
  const [statusId, setStatusId] = useState(linkedId ? "" : "401");
  // The zone filter is the header selection. A link to a zone the header does not list (a discontinued one) is read-only: it filters by that zone until the rail is set back to the header.
  const zoneFilter = useZoneFilter(), [linkCleared, setLinkCleared] = useState(false);
  const [employeeType, setEmployeeType] = useState("");
  // Simple account filter (Owner only): ?account=has|none. Role, zones and the account itself are managed on the Tài khoản người dùng screen.
  const accountParam = params?.get("account") ?? "";
  const [accountFilter, setAccountFilter] = useState<AccountFilter>(() => access.manage && (accountParam === "has" || accountParam === "none") ? accountParam : "");
  // No header chosen: the backend keeps its own default order.
  const [sort, setSort] = useState<SortState>();
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(10);
  // `record` null: a new employee. `serial` remounts the dialog so a second open starts from a clean form.
  const [form, setForm] = useState<{ record: Employee | null; serial: number; tab: "info" | "salary" }>(), [importing, setImporting] = useState(false);
  const [storedColumns, storeColumns] = useStoredValue(EMPLOYEE_COLUMNS_STORAGE, defaultEmployeeColumns.join(","));
  // Pay columns (salary type, wage debt) exist only for a viewer with payroll access; for others they are not even offered in the picker.
  const columns = employeeColumns.filter(column => access.payroll || !payrollColumnKeys.includes(column.key));
  // Name and status are the row's identity: a saved column choice can never hide them. Both are pinned and not offered in the picker.
  const pinned = ["name", "status"], pickable = columns.filter(column => !pinned.includes(column.key));
  const offered = columns.filter(column => pinned.includes(column.key) || storedColumns.split(",").includes(column.key)).map(column => column.key);
  const visible = offered.length ? offered : defaultEmployeeColumns.filter(key => columns.some(column => column.key === key));

  // A filter, search, sort or page change starts a new result set: back to page 1 and nothing stays selected.
  function filter(apply: () => void) { apply(); setPage(1); setSelected(new Set()); }
  const goToPage = (value: number) => { setPage(value); setSelected(new Set()); };
  useEffect(() => {
    const timer = setTimeout(() => { setTerm(search.trim()); setPage(1); setSelected(new Set()); }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  const linkedZone = useLinkedZone(linkCleared ? "" : params?.get("zoneId") ?? "", id => !zoneFilter.zones.length || zoneFilter.zones.some(zone => zone.id === id));
  const zoneIds = linkedZone.zone?.id ?? zoneFilter.apiZoneIds ?? "";
  // A zone change made in the header (not only in the rail) starts the list again at page 1 (state adjusted while rendering).
  const [seenZones, setSeenZones] = useState(zoneIds);
  if (seenZones !== zoneIds) { setSeenZones(zoneIds); setPage(1); setSelected(new Set()); }
  const order = { sortBy: sort?.key, sortDir: sort?.direction };
  const list = useEmployeeDirectoryList(useCallback((signal: AbortSignal) => {
    const read = (query: Record<string, string | undefined>, signal: AbortSignal) => repository.read("list", query, employeePageSchema, signal);
    const base = { zoneIds, employeeType, sortBy: sort?.key, sortDir: sort?.direction };
    if (filterNeedsAccounts(accountFilter)) return readWithAccountFilter(index => readSelectionPages(read, { ...base, search: "", page: String(index), pageSize: "100" }, { statusId }, signal), accountFilter, term, page, pageSize);
    // The backend searches name, code and phone only; a typed login name is matched web-side on top of it.
    return searchWithAccountNames(term, pageSize,
      () => readSelectionPages(read, { ...base, search: term, page: String(page), pageSize: String(pageSize) }, { statusId }, signal),
      accountPage => readSelectionPages(read, { ...base, search: "", page: String(accountPage), pageSize: "100" }, { statusId }, signal));
  }, [repository, term, statusId, zoneIds, employeeType, accountFilter, sort, page, pageSize]));
  const zones = useRemote(useCallback((signal: AbortSignal) => loadInUseZones(signal), []));
  const lookupsReady = !!zones.data && !zones.loading;
  // Export of the current filters and sort (no paging) or of the ticked rows only (ids replace the filters).
  // The server knows nothing of the account filter, so with it on the rows are read here and exported by id: the file holds what the list shows.
  const exportAll = useEmployeeFileAction(async () => {
    if (!filterNeedsAccounts(accountFilter)) return employeeFileRepository.exportFile({ search: term, statusId, zoneIds, employeeType, ...order });
    const read = (query: Record<string, string | undefined>, signal: AbortSignal) => repository.read("list", query, employeePageSchema, signal);
    const signal = AbortSignal.timeout(60_000), base = { zoneIds, employeeType, sortBy: sort?.key, sortDir: sort?.direction };
    const matched = await readWithAccountFilter(index => readSelectionPages(read, { ...base, search: "", page: String(index), pageSize: "100" }, { statusId }, signal), accountFilter, term, 1, 5000);
    if (matched.status !== "success") return matched;
    if (!matched.data.items.length) return { status: "error" as const, httpStatus: 400, uncertain: false };
    return employeeFileRepository.exportFile(order, matched.data.items.map(row => row.id));
  }, exportLimitMessage);
  const exportSelected = useEmployeeFileAction(() => employeeFileRepository.exportFile(order, [...selected]), exportLimitMessage);
  function refresh() { setCache(new Map()); setDetailRevision(value => value + 1); list.reload(); }
  const label = (employee: Employee) => `${employee.fullName} (${employee.code})`;
  /** The backend saves a profile whose ID number another profile already holds, and says so: show that next to the confirmation. */
  const duplicateNote = (employee: Employee) => employee.duplicateIdNumber ? `Cảnh báo: số CCCD này trùng với ${employee.duplicateIdNumber.fullName} (${employee.duplicateIdNumber.code}).` : undefined;
  /** Toast after a save; the steps after the profile that failed (photo, account) and the ID warning make it a warning. */
  function saved(employee: Employee, verb: "tạo" | "cập nhật", problems: string[] = []) {
    refresh();
    const notes = [...problems.map(problem => problem.charAt(0).toUpperCase() + problem.slice(1)), duplicateNote(employee)].filter(Boolean).join(" ");
    notify({ tone: notes ? "warning" : "success", title: `Đã ${verb} nhân viên ${label(employee)}.`, ...(notes ? { description: notes } : {}) });
  }
  function retry() { refresh(); zones.reload(); }
  const hasFilters = !!search || !!linkedZone.zone || statusId !== "401" || !!employeeType || !!accountFilter;
  const resetFilters = () => { setSearch(""); setTerm(""); setStatusId("401"); setLinkCleared(true); setEmployeeType(""); setAccountFilter(""); };
  const openForm = (record: Employee | null, tab: "info" | "salary" = "info") => setForm(current => ({ record, tab, serial: (current?.serial ?? 0) + 1 }));
  const filters = <EmployeeDirectoryFilters employeeType={employeeType} setEmployeeType={value => filter(() => setEmployeeType(value))} statusId={statusId} setStatusId={value => filter(() => setStatusId(value))}
    zoneFilter={zoneFilter} onZoneChange={filter} pinnedZone={linkedZone.zone} onClearPinnedZone={() => filter(() => setLinkCleared(true))}
    hasFilters={hasFilters} onReset={() => filter(resetFilters)}
    accountFilter={access.manage ? accountFilter : undefined} setAccountFilter={value => filter(() => setAccountFilter(value))} />;
  const selection = { selected, onToggle: (id: string, on: boolean) => setSelected(current => { const next = new Set(current); if (on) next.add(id); else next.delete(id); return next; }),
    onToggleAll: (on: boolean) => setSelected(on ? new Set(list.data?.items.map(row => row.id)) : new Set()) };
  const fileError = exportAll.error || exportSelected.error;
  const panelProps = { cache, revision: detailRevision, access, onEdit: (employee: Employee) => openForm(employee), onEditSalary: (employee: Employee) => openForm(employee, "salary"), onChanged: (employee: Employee, note?: string) => { refresh(); notify({ tone: "success", title: `Đã cập nhật nhân viên ${label(employee)}.`, ...(note ? { description: note } : {}) }); } };

  return <><ScreenGuide id="employee-screen-v3" steps={guideSteps(access.manage)} />
  <ManagementLayout storageKey="employees" icon="users" title="Danh sách nhân viên" filters={filters} filterLabel="Bộ lọc nhân viên"
    search={<input type="search" aria-label="Tìm nhân viên" placeholder="Tìm theo mã, tên nhân viên" maxLength={200} value={search} onChange={event => { const value = event.target.value; filter(() => setSearch(value)); }} />}
    actions={<>
      {!readOnly && <>
        <Button className="w-auto" disabled={!lookupsReady} onClick={() => openForm(null)}><InterfaceIcon name="add" className="mr-1 size-4" />Nhân viên</Button>
        <Button className="w-auto" variant="secondary" onClick={() => setImporting(true)}><InterfaceIcon name="upload" className="mr-1 size-4" />Import file</Button>
        <Button className="w-auto" variant="secondary" isPending={exportAll.pending} onClick={() => void exportAll.run()}><InterfaceIcon name="download" className="mr-1 size-4" />Xuất file</Button>
      </>}
      <ColumnPicker columns={pickable} visible={visible} onChange={keys => storeColumns(keys.join(","))} /><HelpLink />
    </>}
    footer={<EmployeeDirectoryPaging page={list.data?.page ?? page} total={list.data?.total ?? 0} loading={list.loading} pageSize={pageSize} setPage={goToPage} setPageSize={value => filter(() => setPageSize(value))} />}>
    {(fileError || zones.error) && <div className={styles.feedback}><ErrorNotice error={fileError || zones.error} />{zones.error && <button type="button" onClick={retry}>Tải lại danh mục</button>}</div>}
    {!readOnly && <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
      <Button className="w-auto" variant="secondary" aria-label="Xuất file các dòng đã chọn" isPending={exportSelected.pending} onClick={() => void exportSelected.run()}><InterfaceIcon name="download" className="mr-1 size-4" />Xuất file</Button>
    </BulkBar>}
    <ManagementScroller busy={list.loading}>
      {isPermissionDenied(list.error) ? <PermissionDeniedNotice message={list.error} />
        : list.error ? <ListStateMessage error={list.error} onRetry={retry} retryLabel="Tải lại" />
        : !list.data ? <div role="status" aria-label="Đang tải danh sách" className={styles.skeleton}>{[1, 2, 3, 4, 5].map(key => <div key={key} />)}</div>
        : linkedId && !list.data.items.some(item => item.id === linkedId) ? <EmployeeDetailPanel key={linkedId} id={linkedId} {...panelProps} />
        : !list.data.items.length ? <ListStateMessage>{hasFilters ? "Không có nhân viên phù hợp bộ lọc." : "Chưa có nhân viên."}
          {hasFilters && <button type="button" className="ml-2 font-semibold underline" onClick={() => filter(resetFilters)}>Xóa bộ lọc</button>}
          {!hasFilters && !readOnly && <button type="button" className="ml-2 font-semibold underline" disabled={!lookupsReady} onClick={() => openForm(null)}>Thêm nhân viên</button>}</ListStateMessage>
        : <EmployeeDirectoryTable items={list.data.items} disabled={list.loading} cache={cache} detailRevision={detailRevision} visible={visible} initialExpandedId={linkedId} access={access}
          sort={sort ?? { key: "", direction: "asc" }} onSort={next => filter(() => setSort(next))} selection={readOnly ? undefined : selection} onEdit={panelProps.onEdit} onChanged={panelProps.onChanged} onEditSalary={panelProps.onEditSalary} />}
    </ManagementScroller>
    {form && <EmployeeFormDialog key={form.serial} record={form.record} zones={zones.data ?? []} lookupsReady={lookupsReady} canAccount={access.manage} salaryAccess={{ view: access.salary, edit: access.salaryEdit }} initialTab={form.tab} onClose={() => setForm(undefined)}
      onAdopt={() => { setForm(undefined); refresh(); }}
      onSaved={(employee, problems) => {
        const creating = form.record === null;
        setForm(undefined);
        // A new employee is searched by name, so it shows even when the current filters would hide it.
        if (creating) { setSearch(employee.fullName); setTerm(employee.fullName); setStatusId(employee.status === "Employed" ? "401" : "402"); setLinkCleared(true); zoneFilter.set(ALL_ZONES); setEmployeeType(""); setAccountFilter(""); setPage(1); setSelected(new Set()); }
        saved(employee, creating ? "tạo" : "cập nhật", problems);
      }} />}
    {importing && <EmployeeImportDialog onClose={() => setImporting(false)} onImported={count => { notify({ tone: "success", title: `Đã nhập ${count} nhân viên.` }); setPage(1); setSelected(new Set()); refresh(); }} />}
  </ManagementLayout></>;
}

/** Each step points at a real control. */
function guideSteps(manage: boolean): GuideStep[] {
  return [
    { title: "Tìm nhân viên", text: "Gõ mã hoặc tên nhân viên.", target: 'input[aria-label="Tìm nhân viên"]' },
    { title: "Mở một nhân viên", text: manage ? "Bấm vào nhân viên để xem thông tin, thiết lập lương, phiếu lương và nợ. Bấm Cập nhật để sửa hồ sơ." : "Xem thông tin công việc của nhân viên.", target: '[aria-controls^="employee-preview-"]' },
    ...(manage ? [{ title: "Thêm nhân viên", text: "Nhập tên, số điện thoại, loại nhân viên và vùng làm việc. Có thể thêm ảnh, tài khoản đăng nhập và các thông tin khác trong các mục bên dưới.", target: "text:Nhân viên" }] : []),
  ];
}
