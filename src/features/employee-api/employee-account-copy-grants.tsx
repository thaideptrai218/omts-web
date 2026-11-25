"use client";
import { useCallback, useMemo, useState } from "react";
import { loadOptions } from "@/features/operations/lookups";
import { ErrorNotice, useRemote } from "@/features/operations/ui";
import { SelectBox } from "@/components/ui/select-box";
import { copyUserGrants, roleLabel, toUserAccount, type UserAccount } from "@/features/account-access/user-account-model";
import { grantsToSelection, type GrantSelection } from "@/features/account-access/user-grant-selection";

/** "Quản lý vùng, 2 vùng" / "Kế toán" / "Quản lý vùng, tất cả vùng": what a login holds, in a few words for the choice list. */
function holdsLabel(account: UserAccount): string {
  const roles = [...new Set(account.pairs.map(pair => roleLabel(pair.role, pair.roleName)))].join(" và ");
  const zones = account.pairs.filter(pair => pair.role === "ZONE_MANAGER");
  return zones.some(pair => pair.allZones) ? `${roles}, tất cả vùng` : zones.length ? `${roles}, ${new Set(zones.map(pair => pair.zoneId)).size} vùng` : roles;
}

function CopyChoice({ onPick }: { onPick(selection: GrantSelection): void }) {
  const remote = useRemote(useCallback((signal: AbortSignal) => loadOptions("accounts", signal), []));
  const accounts = useMemo(() => (remote.data ?? []).map(toUserAccount).filter(account => copyUserGrants(account).length > 0), [remote.data]);
  if (remote.loading) return <p role="status" className="text-sm text-text-muted">Đang tải danh sách tài khoản...</p>;
  if (remote.error) return <ErrorNotice error={remote.error} />;
  if (!accounts.length) return <p className="text-sm text-text-muted">Chưa có tài khoản nào có vai trò để lấy theo.</p>;
  return <SelectBox aria-label="Lấy theo tài khoản" className="h-[34px] w-full rounded-md border border-border-strong bg-surface px-2 text-sm" value="" onChange={event => {
    const picked = accounts.find(account => account.id === event.target.value);
    if (picked) onPick(grantsToSelection(copyUserGrants(picked)));
  }}>
    <option value="">Chọn một tài khoản</option>
    {accounts.map(account => <option key={account.id} value={account.id}>{account.displayName} (@{account.username}) · {holdsLabel(account)}</option>)}
  </SelectBox>;
}

/** Lets the Owner start the role and zones from another login instead of ticking them again; the list is read only when it is opened. */
export function EmployeeAccountCopyGrants({ onPick, disabled }: { onPick(selection: GrantSelection): void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  return <div className="space-y-2">
    {!open && <button type="button" className="text-sm font-semibold underline disabled:opacity-60" disabled={disabled} onClick={() => setOpen(true)}>Lấy vai trò và vùng của người khác</button>}
    {open && <CopyChoice onPick={selection => { onPick(selection); setOpen(false); }} />}
  </div>;
}
