"use client";

import { useMemo, useState } from "react";
import type {
  RoleDetails,
  RoleStatus,
} from "@/features/role-management/domain/role-management";

type RoleFilter = "all" | RoleStatus;

export function RoleList({
  onSelect,
  roles,
  selectedRoleId,
}: Readonly<{
  onSelect(roleId: string): void;
  roles: readonly RoleDetails[];
  selectedRoleId?: string;
}>) {
  const [filter, setFilter] = useState<RoleFilter>("all");
  const visibleRoles = useMemo(
    () => roles.filter((role) => filter === "all" || role.status === filter),
    [filter, roles],
  );

  return (
    <section className="min-w-0 rounded-card border border-border bg-surface p-4 shadow-card xl:sticky xl:top-24">
      <div>
        <h2 className="text-lg font-semibold text-text">Danh sách vai trò</h2>
        <p className="mt-1 text-sm text-text-muted">{roles.length} vai trò trong hợp tác xã</p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-1 rounded-control bg-surface-subtle p-1" role="group" aria-label="Lọc trạng thái vai trò">
        {[
          { id: "all", label: "Tất cả" },
          { id: "in-use", label: "Đang dùng" },
          { id: "discontinued", label: "Đã ngừng" },
        ].map((item) => (
          <button
            aria-pressed={filter === item.id}
            className={`min-h-11 rounded-control px-2 text-xs font-semibold transition sm:text-sm ${
              filter === item.id
                ? "bg-surface text-primary-hover shadow-sm"
                : "text-text-muted hover:text-text"
            }`}
            key={item.id}
            onClick={() => setFilter(item.id as RoleFilter)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      {visibleRoles.length === 0 ? (
        <p className="mt-4 rounded-control border border-dashed border-border p-4 text-sm leading-6 text-text-muted">
          Không có vai trò ở trạng thái này.
        </p>
      ) : (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
          {visibleRoles.map((role) => {
            const isSelected = selectedRoleId === role.id;
            return (
              <li key={role.id}>
                <button
                  aria-current={isSelected ? "true" : undefined}
                  className={`min-h-20 w-full min-w-0 rounded-control border p-3 text-left transition ${
                    isSelected
                      ? "border-primary bg-primary-soft shadow-sm"
                      : "border-border bg-surface hover:border-primary/50 hover:bg-surface-subtle"
                  }`}
                  onClick={() => onSelect(role.id)}
                  type="button"
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="min-w-0 font-semibold text-text">{role.name}</span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                        role.status === "in-use"
                          ? "bg-emerald-50 text-success"
                          : "bg-surface-subtle text-text-muted"
                      }`}
                    >
                      {role.status === "in-use" ? "Đang dùng" : "Đã ngừng"}
                    </span>
                  </span>
                  <span className="mt-2 block text-sm text-text-muted">
                    {role.activeAccountCount > 0
                      ? `${role.activeAccountCount} tài khoản · ${role.activeZoneCount} khu`
                      : "Chưa có tài khoản sử dụng"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
