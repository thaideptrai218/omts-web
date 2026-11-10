"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmployeeDirectoryFilters, EmployeeDirectoryReset } from "./employee-directory-filters";
import { FilterWorkspace } from "@/components/ui/filter-workspace";
import { ManagementHeading } from "@/components/ui/management-page";
import { loadOptions } from "@/features/operations/lookups";
import { createOperationsRepository } from "@/features/operations/repository";
import { readSelectionPages } from "@/features/operations/selection-pages";
import { ErrorNotice, Field, Skeleton, useMutation, useRemote } from "@/features/operations/ui";
import {
  employeePageSchema,
  employeeViewSchema,
  jobTypeOptionsSchema,
  type Employee,
} from "./contracts";
import { EmployeeDirectoryPaging } from "./employee-directory-paging";
import { EmployeeDirectoryTable } from "./employee-directory-table";
import { EmployeeApiEditor } from "./employee-editor";
import styles from "./employee-screen.module.css";

/** Employment status filter codes: 401 employed, 402 left. */
function statusFilterLabel(statusId: string) {
  if (statusId === "401") return "Đang làm việc";
  if (statusId === "402") return "Đã nghỉ việc";
  if (statusId === "-") return "Chưa chọn tình trạng";
  return "Tất cả tình trạng";
}

/** Owner's searchable, filterable list of seasonal employees with the profile editor. */
export function EmployeeDirectory() {
  const repository = useMemo(() => createOperationsRepository("employees"), []);
  const [search, setSearch] = useState("");
  // Debounced copy of `search` that actually drives the query.
  const [term, setTerm] = useState("");
  const [statusId, setStatusId] = useState("401");
  const [zoneId, setZoneId] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  // undefined = editor closed, null = creating a new employee.
  const [selected, setSelected] = useState<Employee | null>();
  // Bumped to remount the editor with fresh state.
  const [serial, setSerial] = useState(0);
  const [notice, setNotice] = useState<string>();
  const opening = useMutation();

  useEffect(() => {
    const timer = setTimeout(() => {
      setTerm(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const list = useRemote(
    useCallback(
      (signal: AbortSignal) =>
        readSelectionPages(
          (query, signal) => repository.read("list", query, employeePageSchema, signal),
          { search: term, zoneId, page: String(page), pageSize: String(pageSize) },
          { statusId },
          signal,
        ),
      [repository, term, statusId, zoneId, page, pageSize],
    ),
  );
  const zones = useRemote(useCallback((signal: AbortSignal) => loadOptions("zones", signal), []));
  const jobTypes = useRemote(
    useCallback(
      (signal: AbortSignal) => repository.read("job-types", {}, jobTypeOptionsSchema, signal),
      [repository],
    ),
  );

  async function open(id: string) {
    const result = await opening.run(() => repository.read("detail", { id }, employeeViewSchema), true);
    if (result) {
      setSelected(result);
      setSerial((value) => value + 1);
    }
  }

  function refresh() {
    list.reload();
    jobTypes.reload();
  }

  function showEditor(employee: Employee) {
    setSelected(employee);
    setSerial((value) => value + 1);
    refresh();
  }

  const zoneSummary = zoneId
    ? ` · ${String(zones.data?.find((zone) => zone.id === zoneId)?.name ?? "Vùng đã chọn")}`
    : " · Tất cả vùng";

  return (
    <section>
      <ManagementHeading
        title="Nhân viên"
        description="Tra cứu hồ sơ, vùng làm việc và tài khoản liên kết."
        icon="users"
      >
        <Button
          className="sm:w-auto"
          disabled={opening.pending || zones.loading || jobTypes.loading || !zones.data || !jobTypes.data}
          onClick={() => {
            setSelected(null);
            setSerial((value) => value + 1);
          }}
        >
          Thêm nhân viên
        </Button>
      </ManagementHeading>
      <FilterWorkspace
        label="Lọc nhân viên"
        filters={<EmployeeDirectoryFilters statusId={statusId} setStatusId={setStatusId} zoneId={zoneId} setZoneId={setZoneId} setPage={setPage} zones={zones.data ?? []} />}
        reset={<EmployeeDirectoryReset search={search} zoneId={zoneId} statusId={statusId} setSearch={setSearch} setStatusId={setStatusId} setZoneId={setZoneId} setPage={setPage} />}
      >
        <div className={styles.directory}>
          <div className="mb-5 max-w-xl">
            <Field
              label="Tìm theo tên hoặc số điện thoại"
              type="search"
              placeholder="Tên hoặc số điện thoại…"
              value={search}
              maxLength={200}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className={styles.resultHeading}>
            <div>
              <h2>Danh sách nhân viên</h2>
              <p>
                {statusFilterLabel(statusId)}
                {zoneSummary}
              </p>
            </div>
            <span>
              {list.loading ? "Đang tải…" : list.data ? `${list.data.total} nhân viên` : "Chưa tải được dữ liệu"}
            </span>
          </div>

          {notice && (
            <p role="status" className="mt-4 text-primary">
              {notice}
            </p>
          )}
          <ErrorNotice error={list.error || zones.error || jobTypes.error || opening.error} />
          {(list.error || zones.error || jobTypes.error) && (
            <Button
              className="w-auto"
              variant="secondary"
              onClick={() => {
                refresh();
                zones.reload();
              }}
            >
              Tải lại danh mục
            </Button>
          )}
          {list.loading ? (
            <Skeleton />
          ) : (
            list.data && (
              <>
                <div className="my-4">
                  <EmployeeDirectoryTable
                    items={list.data.items}
                    disabled={opening.pending}
                    onOpen={(id) => void open(id)}
                  />
                </div>
                <EmployeeDirectoryPaging list={{data: list.data, loading: list.loading}} pageSize={pageSize} setPageSize={setPageSize} setPage={setPage} />
              </>
            )
          )}
        </div>
      </FilterWorkspace>
      {selected !== undefined && (
        <EmployeeApiEditor
          key={serial}
          record={selected}
          zones={zones.data ?? []}
          jobTypes={jobTypes.data ?? []}
          lookupsReady={!!zones.data && !!jobTypes.data && !jobTypes.loading}
          onClose={() => setSelected(undefined)}
          onAdopt={(employee) => {
            showEditor(employee);
            setNotice(undefined);
          }}
          onSaved={(employee) => {
            showEditor(employee);
            setNotice("Đã lưu hồ sơ nhân viên.");
          }}

        />
      )}

    </section>
  );
}
