"use client";

import { useMemo, useState } from "react";
import type { ManagedAccount } from "@/features/account-management/domain/account-management";

type AccountListProps = Readonly<{
  accounts: readonly ManagedAccount[];
  onSelect(accountId: string): void;
  selectedAccountId?: string;
}>;

function accountTypeLabel(account: ManagedAccount) {
  if (account.accountType === "cooperative-owner") return "Chủ HTX";
  if (account.accountType === "system-administrator") return "Quản trị hệ thống";
  return "Nội bộ";
}

export function AccountList({ accounts, onSelect, selectedAccountId }: AccountListProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("vi");
  const filteredAccounts = useMemo(
    () =>
      accounts.filter((account) =>
        [account.displayName, account.username, account.phone].some((value) =>
          value.toLocaleLowerCase("vi").includes(normalizedQuery),
        ),
      ),
    [accounts, normalizedQuery],
  );

  return (
    <aside className="min-w-0 rounded-card border border-border bg-surface p-4 shadow-card">
      <label className="text-sm font-semibold text-text" htmlFor="account-search">
        Tìm tài khoản
      </label>
      <input
        className="mt-2 min-h-12 w-full rounded-control border border-border-strong bg-surface px-3 text-text placeholder:text-text-muted"
        id="account-search"
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Tên, username hoặc số điện thoại"
        type="search"
        value={query}
      />
      <p className="mt-3 text-sm text-text-muted">{filteredAccounts.length} tài khoản</p>

      {filteredAccounts.length === 0 ? (
        <p className="mt-4 rounded-control bg-surface-subtle p-4 text-sm leading-6 text-text-muted">
          Không tìm thấy tài khoản phù hợp.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {filteredAccounts.map((account) => {
            const effectiveCount = account.grants.filter(
              (grant) => grant.status === "effective",
            ).length;
            const isSelected = account.id === selectedAccountId;
            return (
              <li key={account.id}>
                <button
                  aria-current={isSelected ? "true" : undefined}
                  className={`min-h-16 w-full rounded-control border p-3 text-left transition ${
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
                        @{account.username} · {effectiveCount} quyền truy cập
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
                  <span className="mt-2 block text-xs font-medium text-text-muted">
                    {accountTypeLabel(account)}
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
