"use client";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { HelpLink, ManagementLayout } from "@/components/ui/management-screen/management-layout";
import { BulkBar, ColumnPicker, ListStateMessage, ManagementScroller, type SortState } from "@/components/ui/management-screen/management-table";
import { useStoredValue } from "@/components/ui/management-screen/use-stored-value";
import { loadOptions } from "@/features/operations/lookups";
import { createOperationsRepository } from "@/features/operations/repository";
import { readSelectionPages } from "@/features/operations/selection-pages";
import { ErrorNotice, useRemote } from "@/features/operations/ui";
import { employeePageSchema, jobTypeOptionsSchema, type Employee } from "./contracts";
import { EmployeeDirectoryFilters } from "./employee-directory-filters";
import { EmployeeDirectoryPaging } from "./employee-directory-paging";
import { defaultEmployeeColumns, employeeColumns, EmployeeDirectoryTable, type EmployeeLeaveGuard } from "./employee-directory-table";
import { EmployeeApiEditor } from "./employee-editor";
import { employeeFileRepository } from "./employee-file-repository";
import { EmployeeImportDialog } from "./employee-import-dialog";
import { useEmployeeDirectoryList } from "./use-employee-directory-list";
import { exportLimitMessage, useEmployeeFileAction } from "./use-employee-file-action";
import styles from "./employee-directory.module.css";

/** Owner directory shares the same fixed management frame and data contracts as the other production lists. */
export function EmployeeDirectory() {
  const repository = useMemo(() => createOperationsRepository("employees"), []);
  // Replaced (not cleared) on refresh so the cached Map is never mutated after render.
  const [cache, setCache] = useState(() => new Map<string, Employee>());
  const [detailRevision, setDetailRevision] = useState(0);
  // A link from another screen (for example a zone's staff tab) opens one employee: ?recordId=<id>&search=<name>.
  const params = useSearchParams(), linkedSearch = params?.get("search") ?? "", linkedId = params?.get("recordId") ?? undefined;
  const [search, setSearch] = useState(linkedSearch), [term, setTerm] = useState(linkedSearch.trim());
  const [statusId, setStatusId] = useState(linkedId ? "" : "401"), [zoneId, setZoneId] = useState("");
  const [employeeType, setEmployeeType] = useState(""), [jobTypeId, setJobTypeId] = useState("");
  // No header chosen: the backend keeps its own default order.
  const [sort, setSort] = useState<SortState>();
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(15);
  const [creating, setCreating] = useState(false), [importing, setImporting] = useState(false), [serial, setSerial] = useState(0);
  const [notice, setNotice] = useState<string>();
  const [storedColumns, storeColumns] = useStoredValue("omts-columns-employees", defaultEmployeeColumns.join(","));
  const offered = employeeColumns.filter(column => storedColumns.split(",").includes(column.key)).map(column => column.key);
  const visible = offered.length ? offered : defaultEmployeeColumns;
  const guard = useRef<EmployeeLeaveGuard | undefined>(undefined);
  const registerGuard = useCallback((next: EmployeeLeaveGuard | undefined) => { guard.current = next; }, []);
  function leave(apply: () => void) { if (guard.current) guard.current(apply); else apply(); }
  // A filter, search, sort or page change starts a new result set: back to page 1 and nothing stays selected.
  function filter(apply: () => void) { leave(() => { apply(); setPage(1); setSelected(new Set()); }); }
  const goToPage = (value: number) => leave(() => { setPage(value); setSelected(new Set()); });

  useEffect(() => {
    const timer = setTimeout(() => { setTerm(search.trim()); setPage(1); setSelected(new Set()); }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  const order = { sortBy: sort?.key, sortDir: sort?.direction };
  const list = useEmployeeDirectoryList(useCallback((signal: AbortSignal) => readSelectionPages(
    (query, signal) => repository.read("list", query, employeePageSchema, signal),
    { search: term, zoneId, employeeType, jobTypeId, sortBy: sort?.key, sortDir: sort?.direction, page: String(page), pageSize: String(pageSize) }, { statusId }, signal,
  ), [repository, term, statusId, zoneId, employeeType, jobTypeId, sort, page, pageSize]));
  const zones = useRemote(useCallback((signal: AbortSignal) => loadOptions("zones", signal), []));
  const jobTypes = useRemote(useCallback((signal: AbortSignal) => repository.read("job-types", {}, jobTypeOptionsSchema, signal), [repository]));
  const lookupsReady = !!zones.data && !!jobTypes.data && !zones.loading && !jobTypes.loading;
  // Export of the current filters and sort (no paging) or of the ticked rows only (ids replace the filters).
  const exportAll = useEmployeeFileAction(() => employeeFileRepository.exportFile({ search: term, statusId, zoneId, employeeType, jobTypeId, ...order }), exportLimitMessage);
  const exportSelected = useEmployeeFileAction(() => employeeFileRepository.exportFile(order, [...selected]), exportLimitMessage);
  function refresh() { setCache(new Map()); setDetailRevision(value => value + 1); list.reload(); jobTypes.reload(); }
  function saved() { refresh(); setNotice("Đã cập nhật hồ sơ nhân viên."); }
  function retry() { refresh(); zones.reload(); }
  const hasFilters = !!search || !!zoneId || statusId !== "401" || !!employeeType || !!jobTypeId;
  const filters = <EmployeeDirectoryFilters employeeType={employeeType} setEmployeeType={value => filter(() => setEmployeeType(value))} statusId={statusId} setStatusId={value => filter(() => setStatusId(value))}
    zoneId={zoneId} setZoneId={value => filter(() => setZoneId(value))} zones={zones.data ?? []} jobTypeId={jobTypeId} setJobTypeId={value => filter(() => setJobTypeId(value))} jobTypes={jobTypes.data ?? []}
    hasFilters={hasFilters} onReset={() => filter(() => { setSearch(""); setTerm(""); setStatusId("401"); setZoneId(""); setEmployeeType(""); setJobTypeId(""); })} />;
  const selection = { selected, onToggle: (id: string, on: boolean) => setSelected(current => { const next = new Set(current); if (on) next.add(id); else next.delete(id); return next; }),
    onToggleAll: (on: boolean) => setSelected(on ? new Set(list.data?.items.map(row => row.id)) : new Set()) };
  const fileError = exportAll.error || exportSelected.error;

  return <ManagementLayout storageKey="employees" icon="users" title="Nhân viên" filters={filters} filterLabel="Bộ lọc nhân viên"
    search={<input type="search" aria-label="Tìm nhân viên" placeholder="Theo mã, tên hoặc số điện thoại" maxLength={200} value={search} onChange={event => { const value = event.target.value; filter(() => setSearch(value)); }} />}
    actions={<>
      <Button className="w-auto" disabled={!lookupsReady} onClick={() => leave(() => { setCreating(true); setSerial(value => value + 1); })}><InterfaceIcon name="add" className="mr-1 size-4" />Thêm nhân viên</Button>
      <Button className="w-auto" variant="secondary" onClick={() => leave(() => setImporting(true))}><InterfaceIcon name="upload" className="mr-1 size-4" />Import file</Button>
      <Button className="w-auto" variant="secondary" isPending={exportAll.pending} onClick={() => void exportAll.run()}><InterfaceIcon name="download" className="mr-1 size-4" />Xuất file</Button>
      <ColumnPicker columns={employeeColumns} visible={visible} onChange={keys => storeColumns(keys.join(","))} /><HelpLink />
    </>}
    footer={<EmployeeDirectoryPaging page={list.data?.page ?? page} total={list.data?.total ?? 0} loading={list.loading} pageSize={pageSize} setPage={goToPage} setPageSize={value => filter(() => setPageSize(value))} />}>
    {(notice || fileError || zones.error || jobTypes.error) && <div className={styles.feedback}>{notice && <p role="status">{notice}</p>}<ErrorNotice error={fileError || zones.error || jobTypes.error} />{(zones.error || jobTypes.error) && <button type="button" onClick={retry}>Tải lại danh mục</button>}</div>}
    <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
      <Button className="w-auto" variant="secondary" aria-label="Xuất file các dòng đã chọn" isPending={exportSelected.pending} onClick={() => void exportSelected.run()}><InterfaceIcon name="download" className="mr-1 size-4" />Xuất file</Button>
    </BulkBar>
    <ManagementScroller busy={list.loading}>
      {list.error ? <ListStateMessage error={list.error} onRetry={retry} retryLabel="Tải lại" />
        : !list.data ? <div role="status" aria-label="Đang tải danh sách" className={styles.skeleton}>{[1, 2, 3, 4, 5].map(key => <div key={key} />)}</div>
        : !list.data.items.length ? <ListStateMessage>{hasFilters ? "Không có nhân viên phù hợp bộ lọc." : "Chưa có nhân viên."}</ListStateMessage>
        : <EmployeeDirectoryTable items={list.data.items} disabled={list.loading} cache={cache} detailRevision={detailRevision} onSaved={saved} visible={visible} zones={zones.data ?? []} jobTypes={jobTypes.data ?? []} lookupsReady={lookupsReady} onGuardChange={registerGuard} initialExpandedId={linkedId}
          sort={sort ?? { key: "", direction: "asc" }} onSort={next => filter(() => setSort(next))} selection={selection} />}
    </ManagementScroller>
    {creating && <EmployeeApiEditor key={serial} record={null} zones={zones.data ?? []} jobTypes={jobTypes.data ?? []} lookupsReady={lookupsReady} onClose={() => setCreating(false)} onAdopt={() => {}} onSaved={employee => {
      setCreating(false); setSearch(employee.fullName); setTerm(employee.fullName); setStatusId(employee.status === "Employed" ? "401" : "402"); setZoneId(""); setEmployeeType(""); setJobTypeId(""); setPage(1); setSelected(new Set()); refresh(); setNotice("Đã lưu hồ sơ nhân viên.");
    }} />}
    {importing && <EmployeeImportDialog onClose={() => setImporting(false)} onImported={count => { setNotice(`Đã nhập ${count} nhân viên.`); setPage(1); setSelected(new Set()); refresh(); }} />}
  </ManagementLayout>;
}
