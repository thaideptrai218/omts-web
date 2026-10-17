"use client";

import { useMemo, useState } from "react";
import type { EmployeeProfile } from "@/features/employee-management/domain/employee-management";

type EmployeeListProps = Readonly<{
  employees: readonly EmployeeProfile[];
  onSelect(employeeId: string): void;
  selectedEmployeeId?: string;
}>;

export function EmployeeList({
  employees,
  onSelect,
  selectedEmployeeId,
}: EmployeeListProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("vi");
  const filteredEmployees = useMemo(
    () =>
      employees.filter((employee) =>
        [employee.fullName, employee.phone].some((value) =>
          value.toLocaleLowerCase("vi").includes(normalizedQuery),
        ),
      ),
    [employees, normalizedQuery],
  );

  return (
    <aside className="min-w-0 rounded-card border border-border bg-surface p-4 shadow-card">
      <label className="text-sm font-semibold text-text" htmlFor="employee-search">
        Tìm nhân viên
      </label>
      <input
        className="mt-2 min-h-12 w-full rounded-control border border-border-strong bg-surface px-3 text-text placeholder:text-text-muted"
        id="employee-search"
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Nhập họ tên hoặc số điện thoại"
        type="search"
        value={query}
      />
      <p className="mt-3 text-sm text-text-muted">
        {filteredEmployees.length} hồ sơ phù hợp
      </p>

      {filteredEmployees.length === 0 ? (
        <p className="mt-4 rounded-control bg-surface-subtle p-4 text-sm leading-6 text-text-muted">
          Không tìm thấy nhân viên. Hãy kiểm tra từ khóa hoặc thêm hồ sơ mới.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {filteredEmployees.map((employee) => {
            const isSelected = employee.id === selectedEmployeeId;

            return (
              <li key={employee.id}>
                <button
                  aria-current={isSelected ? "true" : undefined}
                  className={`min-h-20 w-full rounded-control border p-3 text-left transition ${
                    isSelected
                      ? "border-primary bg-primary-soft"
                      : "border-border bg-surface hover:border-primary/60 hover:bg-surface-subtle"
                  }`}
                  onClick={() => onSelect(employee.id)}
                  type="button"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-text">
                        {employee.fullName}
                      </span>
                      <span className="mt-1 block text-sm text-text-muted">
                        {employee.phone}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${
                        employee.status === "employed"
                          ? "bg-emerald-100 text-success"
                          : "bg-slate-100 text-text-muted"
                      }`}
                    >
                      {employee.status === "employed" ? "Đang làm việc" : "Đã nghỉ"}
                    </span>
                  </span>
                  <span className="mt-2 block truncate text-xs font-medium text-text-muted">
                    {employee.account
                      ? `Tài khoản: @${employee.account.username}`
                      : "Chưa liên kết tài khoản"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
