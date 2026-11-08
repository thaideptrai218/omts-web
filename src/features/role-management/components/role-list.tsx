"use client";

import { useState } from "react";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { DirectoryEmpty, StatusPill } from "@/components/ui/management-page";
import type { RoleDetails, RoleStatus } from "../domain/role-management";

export function RoleList({
  roles,
  onSelect,
  selectedRoleId,
}: Readonly<{
  roles: readonly RoleDetails[];
  onSelect(id: string): void;
  selectedRoleId?: string;
}>) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | RoleStatus>("all");
  const normalizedQuery = query.trim().toLocaleLowerCase("vi");
  const visible = roles.filter(
    (role) =>
      (status === "all" || status === role.status) &&
      [role.name, role.description].some((value) =>
        value.toLocaleLowerCase("vi").includes(normalizedQuery),
      ),
  );
  return (
    <section aria-label="Danh sách vai trò" className="min-w-0 space-y-5">
      <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4 sm:p-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 lg:w-80">
          <label
            htmlFor="role-search"
            className="text-sm font-medium text-text"
          >
            Tìm vai trò
          </label>
          <div className="relative">
            <InterfaceIcon
              name="search"
              className="pointer-events-none absolute left-3 top-5 size-5 text-text-muted"
            />
            <input
              id="role-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tên hoặc mô tả vai trò"
              className="mt-2 min-h-11 w-full rounded-control border border-border bg-surface pl-10 pr-3 text-sm text-text"
            />
          </div>
        </div>
        <div
          role="group"
          aria-label="Lọc trạng thái vai trò"
          className="grid grid-cols-3 gap-1 rounded-control bg-surface-subtle p-1"
        >
          {(
            [
              { id: "all", label: "Tất cả" },
              { id: "in-use", label: "Đang dùng" },
              { id: "discontinued", label: "Đã ngừng" },
            ] as const
          ).map((filter) => (
            <button
              key={filter.id}
              type="button"
              aria-pressed={status === filter.id}
              onClick={() => setStatus(filter.id)}
              className={`min-h-11 rounded-control px-3 text-sm font-medium transition-colors ${status === filter.id ? "bg-surface text-primary shadow-sm" : "text-text-muted hover:text-text"}`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-hidden rounded-card border border-border bg-surface">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <h2 className="text-sm font-semibold text-text">Danh mục vai trò</h2>
          <span className="text-xs font-medium text-text-muted" aria-live="polite">{visible.length} vai trò</span>
        </div>
        <div aria-hidden="true" className="hidden grid-cols-[minmax(0,1.5fr)_minmax(0,1.5fr)_7rem_7rem_8rem_1rem] gap-4 border-b border-border bg-surface-subtle px-5 py-3 text-[.7rem] font-bold uppercase tracking-[.08em] text-text-muted lg:grid">
          <span>Vai trò</span><span>Phạm vi</span><span className="text-right">Tài khoản</span><span className="text-right">Chức năng</span><span>Trạng thái</span><span />
        </div>
      {visible.length === 0 ? (
          <DirectoryEmpty
            title="Không tìm thấy vai trò"
            description="Thử tên khác hoặc chuyển sang trạng thái Tất cả."
          />
      ) : (
        <ul className="divide-y divide-border">
          {visible.map((role) => (
            <li key={role.id}>
              <button
                type="button"
                onClick={() => onSelect(role.id)}
                aria-current={selectedRoleId === role.id ? "true" : undefined}
                className={`group grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 px-4 py-4 text-left transition-colors hover:bg-primary-soft/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary sm:px-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1.5fr)_7rem_7rem_8rem_1rem] ${selectedRoleId === role.id ? "bg-primary-soft/50" : ""}`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-control bg-primary-soft text-primary">
                    <InterfaceIcon
                      name={
                        role.id === "role-staff"
                          ? "account"
                          : role.id === "role-accountant"
                            ? "roles"
                            : "zone"
                      }
                      className="size-5"
                    />
                  </span>
                  <span className="min-w-0 break-words font-semibold text-text group-hover:text-primary">{role.name}</span>
                </span>
                <span className="lg:hidden"><StatusPill tone={role.status === "in-use" ? "success" : "neutral"}>{role.status === "in-use" ? "Đang dùng" : "Đã ngừng"}</StatusPill></span>
                <span className="col-span-2 min-w-0 break-words text-sm leading-5 text-text-muted lg:col-auto">
                  {role.description || "Chưa có mô tả vai trò."}
                </span>
                <span className="text-sm text-text-muted lg:text-right">
                  <span className="lg:hidden">Tài khoản · </span><strong className="font-mono text-base font-semibold tabular-nums text-text">{role.activeAccountCount}</strong>
                </span>
                <span className="text-right text-sm text-text-muted lg:text-right">
                  <span className="lg:hidden">Chức năng · </span><strong className="font-mono text-base font-semibold tabular-nums text-text">{role.permissions.filter((permission) => permission.actionKeys.length).length}</strong>
                </span>
                <span className="hidden lg:block"><StatusPill tone={role.status === "in-use" ? "success" : "neutral"}>{role.status === "in-use" ? "Đang dùng" : "Đã ngừng"}</StatusPill></span>
                <InterfaceIcon name="arrow" className="hidden size-4 text-text-muted lg:block" />
                <span className="sr-only">{role.status === "in-use" ? "Xem và điều chỉnh quyền" : "Xem quyền và khôi phục"}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      </div>
    </section>
  );
}
