"use client";
import { useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/management-page";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { createWorkspaceRepository } from "@/features/api-workspace/workspace-repository";
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import { accountantWarningFromServer } from "./accountant-uniqueness-warning";
import { AccountLoginActions } from "./account-login-actions";
import { accountStatusLabel, missingWorkingZones, pairZoneLabel, toUserAccount } from "./user-account-model";
import { UserGrantChips } from "./user-grant-chips";
import { UserGrantEditor } from "./user-grant-editor";
import { UserInfoSection } from "./user-info-section";

export type AccountSummary = { id: string; username: string; displayName: string; status: string };

/**
 * Everything the Owner does with one staff account, in one place: the role and zones it holds (one editor, one save),
 * its login (copy name, new temporary password, lock or unlock) and its contact details. Used in an employee's "Tài khoản đăng nhập"
 * tab and, for an account no employee holds, in a dialog. `account` comes from the screen that opened it, so the header shows at once;
 * the saved role, zones and row version are read from the server. `workingZoneIds` (given for an employee) adds a hint when a zone is
 * granted that the employee does not work in. `onChanged` tells the screen to refresh its list.
 */
export function AccountAccessPanel({ account, employeeLabel, workingZoneIds, onOpenWork, onChanged }: {
  account: AccountSummary; employeeLabel?: string; workingZoneIds?: readonly string[]; onOpenWork?(): void; onChanged(): void;
}) {
  const detail = useRemote(useCallback((signal: AbortSignal) => createWorkspaceRepository("accounts").detail(account.id, signal), [account.id]));
  const saved = useMemo(() => detail.data ? toUserAccount(detail.data) : undefined, [detail.data]);
  const confirmation = useActionDialog();
  const status = saved?.status ?? account.status, locked = status !== "Active";
  const missing = saved && workingZoneIds ? missingWorkingZones(saved.pairs, workingZoneIds) : [];
  // A second Accountant only warns (decision D9): OK continues.
  const beforeGrant = async (role: string) => {
    const warning = role === "ACCOUNTANT" ? await accountantWarningFromServer(account.id) : undefined;
    return !warning || confirmation.confirm(warning);
  };
  const changed = () => { detail.refresh(); onChanged(); };
  return <div className="space-y-5">
    {confirmation.dialog}
    <section aria-label="Vai trò hiện tại" className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill tone={locked ? "danger" : "success"}>{accountStatusLabel(status)}</StatusPill>
        {saved ? <UserGrantChips pairs={saved.pairs} limit={6} /> : detail.loading ? <span className="text-sm text-text-muted">Đang đọc vai trò và vùng...</span> : null}
      </div>
      {saved && !saved.pairs.length && <p className="text-sm text-text-muted">Chưa có vai trò nên chưa đăng nhập được.</p>}
      {missing.length > 0 && <p role="note" className="rounded-control bg-surface-subtle p-2 text-sm">
        Quản lý vùng được giao {missing.map(pairZoneLabel).join(", ")} nhưng nhân viên chưa ghi vùng này ở mục Vùng làm việc.{" "}
        {onOpenWork && <button type="button" className="font-semibold underline" onClick={onOpenWork}>Mở mục Công việc</button>}
      </p>}
      <ErrorNotice error={detail.error} />{detail.error && <Button className="w-auto" variant="secondary" onClick={detail.reload}>Tải lại</Button>}
    </section>
    <section aria-label="Chọn vai trò và vùng" className="space-y-2">
      <h4 className="font-semibold">Vai trò và vùng phụ trách</h4>
      <UserGrantEditor accountId={account.id} beforeGrant={beforeGrant} onChanged={changed} />
    </section>
    <section aria-label="Đăng nhập và thông tin" className="space-y-3">
      <h4 className="font-semibold">Đăng nhập</h4>
      <AccountLoginActions account={account} status={status} onStatusChanged={changed} />
      {detail.loading && !saved && <Skeleton />}
      {saved && <UserInfoSection key={saved.rowVersion} account={saved} employeeLabel={employeeLabel} onSaved={changed} />}
    </section>
  </div>;
}
