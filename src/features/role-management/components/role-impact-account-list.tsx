import type { RoleImpactAccount } from "@/features/role-management/domain/role-management";

/** Accounts (with their zones) that currently hold the role being changed. */
export function RoleImpactAccountList({
  accounts,
}: {
  accounts: readonly RoleImpactAccount[];
}) {
  return (
    <ul
      className="max-h-60 space-y-2 overflow-y-auto"
      aria-label="Tài khoản bị ảnh hưởng"
    >
      {accounts.map((account) => (
        <li
          className="rounded-control border border-border bg-surface-subtle p-3"
          key={account.accountId}
        >
          <p className="font-semibold text-text">{account.displayName}</p>
          <p className="mt-1 text-sm text-text-muted">@{account.username}</p>
          <p className="mt-1 text-sm leading-6 text-text-muted">
            {account.zoneLabels.join(", ")}
          </p>
        </li>
      ))}
    </ul>
  );
}
