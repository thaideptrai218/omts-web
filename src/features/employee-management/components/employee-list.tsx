"use client";

import { useRef, useState } from "react";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import {
  DirectoryEmpty,
  PersonAvatar,
  StatusPill,
  directoryRowStyles,
} from "@/components/ui/management-page";
import type {
  EmployeeProfile,
  EmployeeStatus,
} from "../domain/employee-management";
import type { EmployeeZoneOption } from "../domain/employee-working-details";
import { selectEmployeePage, type EmployeeDirectoryFilters } from "../state/select-employee-page";
import { EmployeeZoneSummary } from "./employee-zone-summary";
import { EmployeeListPagination } from "./employee-list-pagination";
import { useEmployeeSearch } from "./use-employee-search";

type Props = Readonly<{
  employees: readonly EmployeeProfile[];
  zones: readonly EmployeeZoneOption[];
  onSelect(employeeId: string): void;
  selectedEmployeeId?: string;
}>;
const fieldStyles =
  "mt-2 min-h-11 w-full min-w-0 rounded-control border border-border bg-surface px-3 text-sm font-normal text-text";

export function EmployeeList({
  employees,
  zones,
  onSelect,
  selectedEmployeeId,
}: Props) {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"all" | EmployeeStatus>("employed");
  const [link, setLink] = useState<EmployeeDirectoryFilters["link"]>("all");
  const [zoneId, setZoneId] = useState("");
  const [requestedPage, setRequestedPage] = useState(1);
  const settledQuery = useEmployeeSearch(query);
  const selection = selectEmployeePage(employees, { query: settledQuery, status, link, zoneId }, requestedPage);
  const isSearching = query.trim() !== settledQuery.trim();
  const hasFilters =
    Boolean(query.trim()) || status !== "all" || link !== "all" || Boolean(zoneId);

  return (
    <section
      className="min-w-0 overflow-hidden rounded-card border border-border bg-surface"
      aria-label="Danh sách nhân viên"
    >
      <div className="border-b border-border p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <label
              htmlFor="employee-search"
              className="text-sm font-medium text-text"
            >
              Tìm nhân viên
            </label>
            <div className="relative">
              <InterfaceIcon
                name="search"
                className="pointer-events-none absolute left-3 top-5 size-5 text-text-muted"
              />
              <input
                id="employee-search"
                ref={searchRef}
                type="search"
                placeholder="Họ tên hoặc số điện thoại"
                value={query}
                onChange={(event) => { setQuery(event.target.value); setRequestedPage(1); }}
                className={`${fieldStyles} pl-10`}
              />
            </div>
          </div>
          <div className="min-w-0">
            <label
              htmlFor="employee-status"
              className="text-sm font-medium text-text"
            >
              Tình trạng làm việc
            </label>
            <select
              id="employee-status"
              value={status}
              onChange={(event) =>
                { setStatus(event.target.value as "all" | EmployeeStatus); setRequestedPage(1); }
              }
              className={fieldStyles}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="employed">Đang làm việc</option>
              <option value="left">Đã nghỉ</option>
            </select>
          </div>
          <div className="min-w-0">
            <label
              htmlFor="employee-account-filter"
              className="text-sm font-medium text-text"
            >
              Liên kết tài khoản
            </label>
            <select
              id="employee-account-filter"
              value={link}
              onChange={(event) => { setLink(event.target.value as EmployeeDirectoryFilters["link"]); setRequestedPage(1); }}
              className={fieldStyles}
            >
              <option value="all">Tất cả hồ sơ</option>
              <option value="linked">Đã liên kết</option>
              <option value="unlinked">Chưa liên kết</option>
            </select>
          </div>
          <div className="min-w-0">
            <label htmlFor="employee-zone-filter" className="text-sm font-medium text-text">Vùng làm việc</label>
            <select id="employee-zone-filter" value={zoneId} className={fieldStyles}
              onChange={(event) => { setZoneId(event.target.value); setRequestedPage(1); }}>
              <option value="">Tất cả vùng</option>
              {zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.label}</option>)}
              {zoneId && !zones.some((zone) => zone.id === zoneId) && <option value={zoneId}>Vùng không còn trong danh mục</option>}
            </select>
          </div>
        </div>
        <div className="mt-4 flex min-h-8 items-center justify-between gap-3">
          <p aria-live="polite" className="text-sm text-text-muted">
            <strong className="font-semibold text-text">
              {selection.total}
            </strong>{" "}
            / {employees.length} nhân viên
            {isSearching && <span className="ml-2">Đang tìm…</span>}
          </p>
          {hasFilters && (
            <button
              type="button"
              className="min-h-11 rounded-control px-3 text-sm font-semibold text-primary hover:bg-primary-soft"
              onClick={() => {
                searchRef.current?.focus();
                setQuery("");
                setStatus("all");
                setLink("all");
                setZoneId("");
                setRequestedPage(1);
              }}
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>
      <div
        aria-hidden="true"
        className="hidden grid-cols-[minmax(0,1.4fr)_8rem_minmax(0,1fr)_minmax(0,1fr)_1rem] gap-4 border-b border-border bg-surface-subtle px-6 py-3 text-xs font-medium text-text-muted lg:grid"
      >
        <span>Nhân viên và liên hệ</span>
        <span>Trạng thái</span>
        <span>Vùng làm việc</span>
        <span>Tài khoản đăng nhập</span>
        <span />
      </div>
      {selection.total === 0 ? (
        <DirectoryEmpty
          title="Không tìm thấy nhân viên"
          description="Thử tên, số điện thoại hoặc vùng khác; hoặc xóa bộ lọc để xem tất cả hồ sơ."
        />
      ) : (
        <ul aria-busy={isSearching} className="divide-y divide-border">
          {selection.rows.map((employee) => (
            <li key={employee.id}>
              <button
                type="button"
                onClick={() => onSelect(employee.id)}
                aria-current={
                  employee.id === selectedEmployeeId ? "true" : undefined
                }
                className={`${directoryRowStyles} grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary active:bg-primary-soft lg:grid-cols-[minmax(0,1.4fr)_8rem_minmax(0,1fr)_minmax(0,1fr)_1rem] ${employee.id === selectedEmployeeId ? "bg-primary-soft/50" : ""}`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <PersonAvatar name={employee.fullName} />
                  <span className="min-w-0">
                    <span className="block font-semibold text-text [overflow-wrap:anywhere]">
                      {employee.fullName}
                    </span>{" "}
                    <span className="mt-1 block text-sm text-text-muted">
                      {employee.phone}
                    </span>
                  </span>
                </span>{" "}
                <StatusPill
                  tone={employee.status === "employed" ? "success" : "neutral"}
                >
                  {employee.status === "employed" ? "Đang làm việc" : "Đã nghỉ"}
                </StatusPill>{" "}
                <span className="col-span-2 min-w-0 lg:col-auto">
                  <EmployeeZoneSummary ids={employee.workingZoneIds} zones={zones} />
                </span>{" "}
                <span className="col-span-2 flex min-w-0 flex-wrap items-center gap-2 text-sm text-text-muted lg:col-auto">
                  <InterfaceIcon
                    name={employee.account ? "link" : "account"}
                    className="size-4 shrink-0"
                  />
                  <span className="[overflow-wrap:anywhere]">
                    {employee.account
                      ? `@${employee.account.username}`
                      : "Chưa liên kết tài khoản"}
                  </span>{" "}
                  {employee.account && <StatusPill tone={employee.account.status === "active" ? "success" : "danger"}>
                    {employee.account.status === "active" ? "Tài khoản hoạt động" : "Tài khoản bị khóa"}
                  </StatusPill>}
                </span>
                <InterfaceIcon
                  name="arrow"
                  className="hidden size-4 text-text-muted transition-transform motion-safe:group-hover:translate-x-1 lg:block"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
      <EmployeeListPagination {...selection} isSearching={isSearching} onPageChange={setRequestedPage} />
    </section>
  );
}
