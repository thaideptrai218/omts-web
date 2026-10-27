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
      {visible.length === 0 ? (
        <div className="rounded-card border border-border bg-surface">
          <DirectoryEmpty
            title="Không tìm thấy vai trò"
            description="Thử tên khác hoặc chuyển sang trạng thái Tất cả."
          />
        </div>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-3">
          {visible.map((role) => (
            <li key={role.id} className="min-w-0">
              <button
                type="button"
                onClick={() => onSelect(role.id)}
                aria-current={selectedRoleId === role.id ? "true" : undefined}
                className={`group flex h-full w-full min-w-0 flex-col rounded-card border bg-surface p-5 text-left transition-colors sm:p-6 ${selectedRoleId === role.id ? "border-primary" : "border-border hover:border-primary/50"}`}
              >
                <span className="flex w-full items-center justify-between gap-3">
                  <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
                    <InterfaceIcon
                      name={
                        role.id === "role-staff"
                          ? "account"
                          : role.id === "role-accountant"
                            ? "roles"
                            : "zone"
                      }
                      className="size-6"
                    />
                  </span>
                  <StatusPill
                    tone={role.status === "in-use" ? "success" : "neutral"}
                  >
                    {role.status === "in-use" ? "Đang dùng" : "Đã ngừng"}
                  </StatusPill>
                </span>
                <span className="mt-5 block text-xl font-semibold text-text">
                  {role.name}
                </span>
                <span className="mt-2 block flex-1 text-sm leading-6 text-text-muted">
                  {role.description || "Chưa có mô tả vai trò."}
                </span>
                <span className="mt-5 grid w-full grid-cols-2 gap-3 border-t border-border pt-4">
                  <span>
                    <strong className="block text-2xl font-semibold tabular-nums text-text">
                      {role.activeAccountCount}
                    </strong>
                    <span className="text-xs text-text-muted">
                      tài khoản đang giữ
                    </span>
                  </span>
                  <span>
                    <strong className="block text-2xl font-semibold tabular-nums text-text">
                      {
                        role.permissions.filter(
                          (permission) => permission.actionKeys.length,
                        ).length
                      }
                    </strong>
                    <span className="text-xs text-text-muted">
                      chức năng đã cấp
                    </span>
                  </span>
                </span>
                <span className="mt-5 flex w-full items-center justify-between gap-2 text-sm font-semibold text-primary">
                  <span>
                    {role.status === "in-use"
                      ? "Xem và điều chỉnh quyền"
                      : "Xem quyền và khôi phục"}
                  </span>
                  <InterfaceIcon
                    name="arrow"
                    className="size-4 shrink-0 transition-transform motion-safe:group-hover:translate-x-1"
                  />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
