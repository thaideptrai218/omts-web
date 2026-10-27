"use client";

import { useState } from "react";
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

type Props = Readonly<{
  employees: readonly EmployeeProfile[];
  onSelect(employeeId: string): void;
  selectedEmployeeId?: string;
}>;
const fieldStyles =
  "mt-2 min-h-11 w-full min-w-0 rounded-control border border-border bg-surface px-3 text-sm font-normal text-text";

export function EmployeeList({
  employees,
  onSelect,
  selectedEmployeeId,
}: Props) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | EmployeeStatus>("all");
  const [link, setLink] = useState("all");
  const normalizedQuery = query.trim().toLocaleLowerCase("vi");
  const visible = employees.filter(
    (employee) =>
      [employee.fullName, employee.phone].some((value) =>
        value.toLocaleLowerCase("vi").includes(normalizedQuery),
      ) &&
      (status === "all" || employee.status === status) &&
      (link === "all" ||
        (link === "linked" ? Boolean(employee.account) : !employee.account)),
  );
  const hasFilters =
    Boolean(query.trim()) || status !== "all" || link !== "all";

  return (
    <section
      className="min-w-0 overflow-hidden rounded-card border border-border bg-surface"
      aria-label="Danh sách nhân viên"
    >
      <div className="border-b border-border p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem_11rem]">
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
                type="search"
                placeholder="Họ tên hoặc số điện thoại"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
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
                setStatus(event.target.value as "all" | EmployeeStatus)
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
              onChange={(event) => setLink(event.target.value)}
              className={fieldStyles}
            >
              <option value="all">Tất cả hồ sơ</option>
              <option value="linked">Đã liên kết</option>
              <option value="unlinked">Chưa liên kết</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex min-h-8 items-center justify-between gap-3">
          <p aria-live="polite" className="text-sm text-text-muted">
            <strong className="font-semibold text-text">
              {visible.length}
            </strong>{" "}
            / {employees.length} nhân viên
          </p>
          {hasFilters && (
            <button
              type="button"
              className="min-h-11 rounded-control px-3 text-sm font-semibold text-primary hover:bg-primary-soft"
              onClick={() => {
                setQuery("");
                setStatus("all");
                setLink("all");
              }}
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>
      <div
        aria-hidden="true"
        className="hidden grid-cols-[minmax(0,1.5fr)_9rem_minmax(0,1fr)_1rem] gap-4 border-b border-border bg-surface-subtle px-6 py-3 text-xs font-medium text-text-muted sm:grid"
      >
        <span>Nhân viên và liên hệ</span>
        <span>Trạng thái</span>
        <span>Tài khoản đăng nhập</span>
        <span />
      </div>
      {visible.length === 0 ? (
        <DirectoryEmpty
          title="Không tìm thấy nhân viên"
          description="Thử tên hoặc số điện thoại khác, hoặc xóa bộ lọc để xem tất cả hồ sơ."
        />
      ) : (
        <ul className="divide-y divide-border">
          {visible.map((employee) => (
            <li key={employee.id}>
              <button
                type="button"
                onClick={() => onSelect(employee.id)}
                aria-current={
                  employee.id === selectedEmployeeId ? "true" : undefined
                }
                className={`${directoryRowStyles} grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:grid-cols-[minmax(0,1.5fr)_9rem_minmax(0,1fr)_1rem] ${employee.id === selectedEmployeeId ? "bg-primary-soft/50" : ""}`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <PersonAvatar name={employee.fullName} />
                  <span className="min-w-0">
                    <span className="block font-semibold text-text [overflow-wrap:anywhere]">
                      {employee.fullName}
                    </span>
                    <span className="mt-1 block text-sm text-text-muted">
                      {employee.phone}
                    </span>
                  </span>
                </span>
                <StatusPill
                  tone={employee.status === "employed" ? "success" : "neutral"}
                >
                  {employee.status === "employed" ? "Đang làm việc" : "Đã nghỉ"}
                </StatusPill>
                <span className="col-span-2 flex min-w-0 items-center gap-2 text-sm text-text-muted sm:col-auto">
                  <InterfaceIcon
                    name={employee.account ? "link" : "account"}
                    className="size-4 shrink-0"
                  />
                  <span className="[overflow-wrap:anywhere]">
                    {employee.account
                      ? `@${employee.account.username}`
                      : "Chưa liên kết tài khoản"}
                  </span>
                </span>
                <InterfaceIcon
                  name="arrow"
                  className="hidden size-4 text-text-muted transition-transform motion-safe:group-hover:translate-x-1 sm:block"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
