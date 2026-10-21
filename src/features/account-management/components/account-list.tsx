"use client";

import { useMemo, useState } from "react";
import {
  getEffectiveAssignments,
  matchesAccountListFilters,
} from "@/features/account-management/components/account-list-view";
import type {
  AssignableRole,
  FarmingZoneOption,
  ManagedAccount,
} from "@/features/account-management/domain/account-management";

type AccountListProps = Readonly<{
  accounts: readonly ManagedAccount[];
  onSelect(accountId: string): void;
  roles: readonly AssignableRole[];
  selectedAccountId?: string;
  zones: readonly FarmingZoneOption[];
}>;

function accountTypeLabel(account: ManagedAccount) {
  if (account.accountType === "cooperative-owner") return "Chủ HTX";
  if (account.accountType === "system-administrator") return "Quản trị hệ thống";
  return "Nội bộ";
}

export function AccountList({
  accounts,
  onSelect,
  roles,
  selectedAccountId,
  zones,
}: AccountListProps) {
  const [query, setQuery] = useState("");
  const [roleId, setRoleId] = useState("all");
  const [zoneId, setZoneId] = useState("all");
  const accountRows = useMemo(
    () =>
      accounts.map((account) => ({
        account,
        assignments: getEffectiveAssignments(account, roles, zones),
      })),
    [accounts, roles, zones],
  );
  const filteredAccounts = useMemo(
    () =>
      accountRows.filter(({ account, assignments }) =>
        matchesAccountListFilters(account, assignments, {
          query,
          roleId,
          zoneId,
        }),
      ),
    [accountRows, query, roleId, zoneId],
  );
  const activeRoles = roles.filter((role) => role.status === "in-use");
  const activeZones = zones.filter((zone) => zone.status === "in-use");
  const hasActiveFilters = Boolean(query.trim()) || roleId !== "all" || zoneId !== "all";

  return (
    <section className="min-w-0 rounded-card border border-border bg-surface p-4 shadow-card sm:p-5">
      <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_14rem_14rem]">
        <label className="min-w-0 text-sm font-semibold text-text" htmlFor="account-search">
          Tìm tài khoản
          <input
            className="mt-2 min-h-12 w-full rounded-control border border-border-strong bg-surface px-3 font-normal text-text placeholder:text-text-muted"
            id="account-search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tên, username, vai trò hoặc vùng"
            type="search"
            value={query}
          />
        </label>

        <label className="min-w-0 text-sm font-semibold text-text" htmlFor="account-zone-filter">
          Vùng phụ trách
          <select
            className="mt-2 min-h-12 w-full rounded-control border border-border-strong bg-surface px-3 font-normal text-text"
            id="account-zone-filter"
            onChange={(event) => setZoneId(event.target.value)}
            value={zoneId}
          >
            <option value="all">Tất cả vùng</option>
            <option value="all-zones">Được phân công toàn HTX</option>
            {activeZones.map((zone) => (
              <option key={zone.id} value={zone.id}>{zone.label}</option>
            ))}
          </select>
        </label>

        <label className="min-w-0 text-sm font-semibold text-text" htmlFor="account-role-filter">
          Vai trò đảm nhiệm
          <select
            className="mt-2 min-h-12 w-full rounded-control border border-border-strong bg-surface px-3 font-normal text-text"
            id="account-role-filter"
            onChange={(event) => setRoleId(event.target.value)}
            value={roleId}
          >
            <option value="all">Tất cả vai trò</option>
            {activeRoles.map((role) => (
              <option key={role.id} value={role.id}>{role.name}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-text-muted">{filteredAccounts.length} tài khoản phù hợp</p>
        {hasActiveFilters && (
          <button
            className="min-h-11 rounded-control px-3 text-sm font-semibold text-primary transition hover:bg-primary-soft"
            onClick={() => {
              setQuery("");
              setRoleId("all");
              setZoneId("all");
            }}
            type="button"
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      {filteredAccounts.length === 0 ? (
        <p className="mt-4 rounded-control bg-surface-subtle p-4 text-sm leading-6 text-text-muted">
          Không tìm thấy tài khoản phù hợp.
        </p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredAccounts.map(({ account, assignments }) => {
            const isSelected = account.id === selectedAccountId;
            return (
              <li key={account.id}>
                <button
                  aria-current={isSelected ? "true" : undefined}
                  className={`min-h-16 w-full rounded-control border p-3 text-left transition duration-200 motion-safe:hover:-translate-y-0.5 ${
                    isSelected
                      ? "border-primary bg-primary-soft"
                      : "border-border bg-surface hover:border-primary/60 hover:bg-surface-subtle"
                  }`}
                  onClick={() => onSelect(account.id)}
                  type="button"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-text">
                        {account.displayName}
                      </span>
                      <span className="mt-1 block truncate text-sm text-text-muted">
                        @{account.username} · {accountTypeLabel(account)}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${
                        account.status === "active"
                          ? "bg-emerald-100 text-success"
                          : "bg-rose-100 text-danger"
                      }`}
                    >
                      {account.status === "active" ? "Hoạt động" : "Đã khóa"}
                    </span>
                  </span>
                  {account.accountType === "cooperative-owner" ? (
                    <span className="mt-3 inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-info">
                      Chủ hợp tác xã · Toàn HTX
                    </span>
                  ) : assignments.length > 0 ? (
                    <span className="mt-3 flex flex-wrap gap-1.5">
                      {assignments.map((assignment) => (
                        <span
                          className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary-hover"
                          key={assignment.grantId}
                        >
                          {assignment.roleName} · {assignment.zoneLabel}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span className="mt-3 inline-flex rounded-full bg-warning-soft px-2.5 py-1 text-xs font-semibold text-amber-800">
                      Chưa được phân quyền
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
