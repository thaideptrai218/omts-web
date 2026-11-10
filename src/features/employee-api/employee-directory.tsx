"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FilterChecks } from "@/components/ui/filter-checks";
import { FilterWorkspace } from "@/components/ui/filter-workspace";
import { ManagementHeading } from "@/components/ui/management-page";
import { loadOptions } from "@/features/operations/lookups";
import { createOperationsRepository } from "@/features/operations/repository";
import { readSelectionPages } from "@/features/operations/selection-pages";
import { ErrorNotice, Field, Paging, Select, Skeleton, useMutation, useRemote } from "@/features/operations/ui";
import {
  employeePageSchema,
  employeeViewSchema,
  linkableEmployeeAccountsSchema,
  type Employee,
  type EmploymentChange,
} from "./contracts";
import { EmployeeDirectoryTable } from "./employee-directory-table";
import { EmployeeApiEditor } from "./employee-editor";
import { EmployeeFollowUpDialog } from "./employee-follow-up-dialog";
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
  const [followUp, setFollowUp] = useState<EmploymentChange>();
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
  const accounts = useRemote(
    useCallback(
      (signal: AbortSignal) => repository.read("linkable-accounts", {}, linkableEmployeeAccountsSchema, signal),
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
    accounts.reload();
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
        title="Nhân viên thời vụ"
        description="Tra cứu hồ sơ, vùng làm việc và tài khoản liên kết."
        icon="users"
      >
        <Button
          className="sm:w-auto"
          disabled={opening.pending || zones.loading || accounts.loading || !zones.data || !accounts.data}
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
        filters={
          <>
            <FilterChecks
              label="Tình trạng làm việc"
              value={statusId}
              options={[
                ["401", "Đang làm việc"],
                ["402", "Đã nghỉ việc"],
              ]}
              onChange={(value) => {
                setStatusId(value);
                setPage(1);
              }}
            />
            <Select
              label="Vùng làm việc"
              value={zoneId}
              onChange={(event) => {
                setZoneId(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả vùng</option>
              {zones.data?.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {String(zone.code)} · {String(zone.name)}
                </option>
              ))}
            </Select>
          </>
        }
        reset={
          <button
            type="button"
            className={styles.reset}
            disabled={!search && !zoneId && statusId === "401"}
            onClick={() => {
              setSearch("");
              setStatusId("401");
              setZoneId("");
              setPage(1);
            }}
          >
            Đặt lại
          </button>
        }
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
              <h2>Danh sách nhân viên thời vụ</h2>
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
          <ErrorNotice error={list.error || zones.error || accounts.error || opening.error} />
          {(list.error || zones.error || accounts.error) && (
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
                <div className={styles.paging}>
                  <Select
                    label="Số dòng/trang"
                    value={String(pageSize)}
                    onChange={(event) => {
                      setPageSize(Number(event.target.value));
                      setPage(1);
                    }}
                  >
                    {[10, 20, 50, 100].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </Select>
                  <Paging
                    page={list.data.page}
                    pageSize={list.data.pageSize}
                    total={list.data.total}
                    disabled={list.loading}
                    onChange={setPage}
                  />
                </div>
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
          accounts={accounts.data ?? []}
          lookupsReady={!!zones.data && !!accounts.data && !accounts.loading}
          onClose={() => setSelected(undefined)}
          onReloadAccounts={accounts.reload}
          onAdopt={(employee) => {
            showEditor(employee);
            setNotice(undefined);
          }}
          onSaved={(employee, follow) => {
            showEditor(employee);
            setNotice("Đã lưu hồ sơ nhân viên.");
            if (follow?.followUp) setFollowUp(follow);
          }}
          onUnlinked={() => {
            refresh();
            setNotice("Đã bỏ liên kết tài khoản.");
          }}
        />
      )}
      {followUp?.followUp && (
        <EmployeeFollowUpDialog change={followUp} followUp={followUp.followUp} onClose={() => setFollowUp(undefined)} />
      )}
    </section>
  );
}
