"use client";

import { useMemo, useState } from "react";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import {
  DirectoryEmpty,
  PersonAvatar,
  StatusPill,
  directoryRowStyles,
} from "@/components/ui/management-page";
import {
  getEffectiveAssignments,
  matchesAccountListFilters,
} from "./account-list-view";
import type {
  AssignableRole,
  FarmingZoneOption,
  ManagedAccount,
} from "../domain/account-management";

type Props = Readonly<{
  accounts: readonly ManagedAccount[];
  onSelect(accountId: string): void;
  roles: readonly AssignableRole[];
  selectedAccountId?: string;
  zones: readonly FarmingZoneOption[];
}>;
const fieldStyles =
  "mt-2 min-h-11 w-full min-w-0 rounded-control border border-border bg-surface px-3 text-sm font-normal text-text";

export function AccountList({
  accounts,
  onSelect,
  roles,
  selectedAccountId,
  zones,
}: Props) {
  const [query, setQuery] = useState("");
  const [roleId, setRoleId] = useState("all");
  const [zoneId, setZoneId] = useState("all");
  const [status, setStatus] = useState("all");
  const rows = useMemo(
    () =>
      accounts.map((account) => ({
        account,
        assignments: getEffectiveAssignments(account, roles, zones),
      })),
    [accounts, roles, zones],
  );
  const visible = rows.filter(
    ({ account, assignments }) =>
      (status === "all" || account.status === status) &&
      matchesAccountListFilters(account, assignments, {
        query,
        roleId,
        zoneId,
      }),
  );
  const hasFilters =
    Boolean(query.trim()) ||
    roleId !== "all" ||
    zoneId !== "all" ||
    status !== "all";

  return (
    <section
      aria-label="Danh sách tài khoản nội bộ"
      className="min-w-0 overflow-hidden rounded-card border border-border bg-surface"
    >
      <div className="border-b border-border p-4 sm:p-6">
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_11rem_11rem_10rem]">
          <div className="min-w-0">
            <label
              htmlFor="account-search"
              className="text-sm font-medium text-text"
            >
              Tìm tài khoản
            </label>
            <div className="relative">
              <InterfaceIcon
                name="search"
                className="pointer-events-none absolute left-3 top-5 size-5 text-text-muted"
              />
              <input
                id="account-search"
                type="search"
                placeholder="Tên, username, điện thoại hoặc vùng"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className={`${fieldStyles} pl-10`}
              />
            </div>
          </div>
          <div className="min-w-0">
            <label
              htmlFor="account-zone-filter"
              className="text-sm font-medium text-text"
            >
              Vùng phụ trách
            </label>
            <select
              id="account-zone-filter"
              value={zoneId}
              onChange={(event) => setZoneId(event.target.value)}
              className={fieldStyles}
            >
              <option value="all">Tất cả vùng</option>
              <option value="all-zones">Được phân công toàn HTX</option>
              {zones
                .filter((zone) => zone.status === "in-use")
                .map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.label}
                  </option>
                ))}
            </select>
          </div>
          <div className="min-w-0">
            <label
              htmlFor="account-role-filter"
              className="text-sm font-medium text-text"
            >
              Vai trò đảm nhiệm
            </label>
            <select
              id="account-role-filter"
              value={roleId}
              onChange={(event) => setRoleId(event.target.value)}
              className={fieldStyles}
            >
              <option value="all">Tất cả vai trò</option>
              {roles
                .filter((role) => role.status === "in-use")
                .map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="min-w-0">
            <label
              htmlFor="account-status-filter"
              className="text-sm font-medium text-text"
            >
              Trạng thái tài khoản
            </label>
            <select
              id="account-status-filter"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className={fieldStyles}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Hoạt động</option>
              <option value="locked">Đã khóa</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex min-h-8 items-center justify-between gap-3">
          <p aria-live="polite" className="text-sm text-text-muted">
            <strong className="font-semibold text-text">
              {visible.length}
            </strong>{" "}
            / {accounts.length} tài khoản
          </p>
          {hasFilters && (
            <button
              className="min-h-11 rounded-control px-3 text-sm font-semibold text-primary hover:bg-primary-soft"
              type="button"
              onClick={() => {
                setQuery("");
                setRoleId("all");
                setZoneId("all");
                setStatus("all");
              }}
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>
      <div
        aria-hidden="true"
        className="hidden grid-cols-[minmax(0,1.2fr)_minmax(0,1.1fr)_8rem_1rem] gap-4 border-b border-border bg-surface-subtle px-6 py-3 text-xs font-medium text-text-muted lg:grid"
      >
        <span>Thông tin đăng nhập</span>
        <span>Vai trò và vùng phụ trách</span>
        <span>Trạng thái</span>
        <span />
      </div>
      {visible.length === 0 ? (
        <DirectoryEmpty
          title="Không tìm thấy tài khoản"
          description="Thử từ khóa khác hoặc xóa bộ lọc vùng, vai trò và trạng thái."
        />
      ) : (
        <ul className="divide-y divide-border">
          {visible.map(({ account, assignments }) => (
            <li key={account.id}>
              <button
                type="button"
                aria-current={
                  selectedAccountId === account.id ? "true" : undefined
                }
                onClick={() => onSelect(account.id)}
                className={`${directoryRowStyles} grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.1fr)_8rem_1rem] ${selectedAccountId === account.id ? "bg-primary-soft/50" : ""}`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <PersonAvatar name={account.displayName} />
                  <span className="min-w-0">
                    <span className="block font-semibold text-text [overflow-wrap:anywhere]">
                      {account.displayName}
                    </span>
                    <span className="mt-1 block text-sm text-text-muted [overflow-wrap:anywhere]">
                      @{account.username}
                    </span>
                    <span className="mt-1 block text-xs text-text-muted [overflow-wrap:anywhere]">
                      {account.phone ||
                        account.email ||
                        "Chưa có thông tin liên hệ"}
                    </span>
                  </span>
                </span>
                <span className="col-span-2 row-start-2 flex min-w-0 flex-wrap gap-2 lg:col-auto lg:row-auto">
                  {account.accountType === "cooperative-owner" ? (
                    <span className="text-sm font-medium text-primary">
                      Chủ hợp tác xã{" "}
                      <span className="block text-xs font-normal text-text-muted">
                        Toàn hợp tác xã
                      </span>
                    </span>
                  ) : assignments.length ? (
                    assignments.map((assignment) => (
                      <span
                        key={assignment.grantId}
                        className="rounded-control bg-primary-soft px-3 py-2 text-xs text-primary"
                      >
                        <strong className="block font-semibold">
                          {assignment.roleName}
                        </strong>
                        <span className="mt-0.5 block">
                          {assignment.zoneLabel}
                        </span>
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-warning">
                      Chưa được phân quyền
                    </span>
                  )}
                </span>
                <span className="col-start-2 row-start-1 lg:col-auto lg:row-auto">
                  <StatusPill
                    tone={account.status === "active" ? "success" : "danger"}
                  >
                    {account.status === "active" ? "Hoạt động" : "Đã khóa"}
                  </StatusPill>
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
    </section>
  );
}
