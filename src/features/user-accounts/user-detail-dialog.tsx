"use client";
import { useCallback, useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { StatusPill } from "@/components/ui/management-page";
import { Subtabs } from "@/components/ui/management-screen/management-table";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { createWorkspaceRepository } from "@/features/api-workspace/workspace-repository";
import { accountantWarningFromServer } from "@/features/account-access/accountant-uniqueness-warning";
import { accountState, accountStateLabel } from "@/features/account-access/user-account-list-model";
import { toUserAccount } from "@/features/account-access/user-account-model";
import { UserGrantLineChips } from "@/features/account-access/user-grant-chips";
import { UserGrantEditor } from "@/features/account-access/user-grant-editor";
import { UserInfoSection, type LinkedEmployee } from "@/features/account-access/user-info-section";
import { UserSecurityTab } from "@/features/account-access/user-security-tab";
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";

type Tab = "info" | "grants" | "security";
const tabs = [{ key: "info", label: "Thông tin" }, { key: "grants", label: "Phân quyền" }, { key: "security", label: "Bảo mật" }] as const;
const stateTone = { active: "success", pending: "warning", locked: "danger", deleted: "neutral" } as const;

/**
 * One account in a dialog with three tabs: Thông tin (contact details, note, linked employee), Phân quyền (role and zones with the diff
 * editor) and Bảo mật (password, lock, delete). The record is read from the server when it opens, so a link with `?accountId=` works
 * even for an account that is not on the current page. `selfId` is the signed-in account, which can never be locked or deleted here.
 */
export function UserDetailDialog({ accountId, selfId, employee, onChanged, onClose }: {
  accountId: string; selfId: string; employee?: LinkedEmployee; onChanged(): void; onClose(): void;
}) {
  const detail = useRemote(useCallback((signal: AbortSignal) => createWorkspaceRepository("accounts").detail(accountId, signal), [accountId]));
  const account = useMemo(() => detail.data ? toUserAccount(detail.data) : undefined, [detail.data]);
  const [tab, setTab] = useState<Tab>("info"), prefix = useId(), confirmation = useActionDialog();
  const changed = () => { detail.refresh(); onChanged(); };
  // A second Accountant only warns (decision D9): OK continues.
  const beforeGrant = async (role: string) => {
    const warning = role === "ACCOUNTANT" ? await accountantWarningFromServer(accountId) : undefined;
    return !warning || confirmation.confirm(warning);
  };
  const state = account ? accountState(account) : undefined;
  return <Dialog open title={account ? `Tài khoản ${account.displayName}` : "Tài khoản người dùng"} size="lg" onOpenChange={(open) => { if (!open) onClose(); }}>
    {confirmation.dialog}
    {detail.loading && !account && <Skeleton />}
    <ErrorNotice error={detail.error} />{detail.error && <Button className="w-auto" variant="secondary" onClick={detail.reload}>Tải lại</Button>}
    {account && state && <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="break-all font-semibold">@{account.username}</span><StatusPill tone={stateTone[state]}>{accountStateLabel[state]}</StatusPill>
        {!account.deleted && <UserGrantLineChips pairs={account.pairs} />}
      </div>
      <Subtabs<Tab> label="Chi tiết tài khoản" tabs={tabs} value={tab} onChange={setTab} idPrefix={prefix} />
      <div role="tabpanel" id={`${prefix}-panel-${tab}`} aria-labelledby={`${prefix}-tab-${tab}`} tabIndex={0}>
        {tab === "info" && <UserInfoSection key={account.rowVersion} account={account} employee={employee} onSaved={changed} />}
        {tab === "grants" && (account.deleted
          ? <p className="text-sm text-text-muted">Tài khoản đã xóa nên không còn vai trò và vùng nào.</p>
          : <UserGrantEditor accountId={account.id} beforeGrant={beforeGrant} onChanged={changed} />)}
        {tab === "security" && <UserSecurityTab account={account} isSelf={account.id === selfId} onChanged={changed} onDeleted={onClose} />}
      </div>
    </div>}
  </Dialog>;
}
