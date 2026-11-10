"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { HelpLink, ManagementLayout } from "@/components/ui/management-screen/management-layout";
import { ColumnPicker, ListStateMessage, ManagementScroller } from "@/components/ui/management-screen/management-table";
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
import { useEmployeeDirectoryList } from "./use-employee-directory-list";
import styles from "./employee-directory.module.css";

/** Owner directory shares the same fixed management frame and data contracts as the other production lists. */
export function EmployeeDirectory() {
  const repository = useMemo(() => createOperationsRepository("employees"), []);
  // Replaced (not cleared) on refresh so the cached Map is never mutated after render.
  const [cache, setCache] = useState(() => new Map<string, Employee>());
  const [detailRevision, setDetailRevision] = useState(0);
  const [search, setSearch] = useState(""), [term, setTerm] = useState("");
  const [statusId, setStatusId] = useState("401"), [zoneId, setZoneId] = useState("");
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(15);
  const [creating, setCreating] = useState(false), [serial, setSerial] = useState(0);
  const [notice, setNotice] = useState<string>();
  const [storedColumns, storeColumns] = useStoredValue("omts-columns-employees", defaultEmployeeColumns.join(","));
  const offered = employeeColumns.filter(column => storedColumns.split(",").includes(column.key)).map(column => column.key);
  const visible = offered.length ? offered : defaultEmployeeColumns;
  const guard = useRef<EmployeeLeaveGuard | undefined>(undefined);
  const registerGuard = useCallback((next: EmployeeLeaveGuard | undefined) => { guard.current = next; }, []);
  function leave(apply: () => void) { if (guard.current) guard.current(apply); else apply(); }
  function filter(apply: () => void) { leave(() => { apply(); setPage(1); }); }

  useEffect(() => {
    const timer = setTimeout(() => { setTerm(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  const list = useEmployeeDirectoryList(useCallback((signal: AbortSignal) => readSelectionPages(
    (query, signal) => repository.read("list", query, employeePageSchema, signal),
    { search: term, zoneId, page: String(page), pageSize: String(pageSize) }, { statusId }, signal,
  ), [repository, term, statusId, zoneId, page, pageSize]));
  const zones = useRemote(useCallback((signal: AbortSignal) => loadOptions("zones", signal), []));
  const jobTypes = useRemote(useCallback((signal: AbortSignal) => repository.read("job-types", {}, jobTypeOptionsSchema, signal), [repository]));
  const lookupsReady = !!zones.data && !!jobTypes.data && !zones.loading && !jobTypes.loading;
  function refresh() { setCache(new Map()); setDetailRevision(value => value + 1); list.reload(); jobTypes.reload(); }
  function saved() { refresh(); setNotice("Đã cập nhật hồ sơ nhân viên."); }
  function retry() { refresh(); zones.reload(); }
  const hasFilters = !!search || !!zoneId || statusId !== "401";
  const filters = <EmployeeDirectoryFilters statusId={statusId} setStatusId={value => filter(() => setStatusId(value))} zoneId={zoneId} setZoneId={value => filter(() => setZoneId(value))} zones={zones.data ?? []} hasFilters={hasFilters} onReset={() => filter(() => { setSearch(""); setTerm(""); setStatusId("401"); setZoneId(""); })} />;

  return <ManagementLayout storageKey="employees" icon="users" title="Nhân viên" filters={filters} filterLabel="Bộ lọc nhân viên"
    search={<input type="search" aria-label="Tìm nhân viên" placeholder="Theo tên hoặc số điện thoại" maxLength={200} value={search} onChange={event => { const value = event.target.value; filter(() => setSearch(value)); }} />}
    actions={<>
      <Button className="w-auto" disabled={!lookupsReady} onClick={() => leave(() => { setCreating(true); setSerial(value => value + 1); })}><InterfaceIcon name="add" className="mr-1 size-4" />Thêm nhân viên</Button>
      <ColumnPicker columns={employeeColumns} visible={visible} onChange={keys => storeColumns(keys.join(","))} /><HelpLink />
    </>}
    footer={<EmployeeDirectoryPaging page={list.data?.page ?? page} total={list.data?.total ?? 0} loading={list.loading} pageSize={pageSize} setPage={value => leave(() => setPage(value))} setPageSize={value => filter(() => setPageSize(value))} />}>
    {(notice || zones.error || jobTypes.error) && <div className={styles.feedback}>{notice && <p role="status">{notice}</p>}<ErrorNotice error={zones.error || jobTypes.error} />{(zones.error || jobTypes.error) && <button type="button" onClick={retry}>Tải lại danh mục</button>}</div>}
    <ManagementScroller busy={list.loading}>
      {list.error ? <ListStateMessage error={list.error} onRetry={retry} retryLabel="Tải lại" />
        : !list.data ? <div role="status" aria-label="Đang tải danh sách" className={styles.skeleton}>{[1, 2, 3, 4, 5].map(key => <div key={key} />)}</div>
        : !list.data.items.length ? <ListStateMessage>{hasFilters ? "Không có nhân viên phù hợp bộ lọc." : "Chưa có nhân viên."}</ListStateMessage>
        : <EmployeeDirectoryTable items={list.data.items} disabled={list.loading} cache={cache} detailRevision={detailRevision} onSaved={saved} visible={visible} zones={zones.data ?? []} jobTypes={jobTypes.data ?? []} lookupsReady={lookupsReady} onGuardChange={registerGuard} />}
    </ManagementScroller>
    {creating && <EmployeeApiEditor key={serial} record={null} zones={zones.data ?? []} jobTypes={jobTypes.data ?? []} lookupsReady={lookupsReady} onClose={() => setCreating(false)} onAdopt={() => {}} onSaved={employee => {
      setCreating(false); setSearch(employee.fullName); setTerm(employee.fullName); setStatusId(employee.status === "Employed" ? "401" : "402"); setZoneId(""); setPage(1); refresh(); setNotice("Đã lưu hồ sơ nhân viên.");
    }} />}
  </ManagementLayout>;
}
