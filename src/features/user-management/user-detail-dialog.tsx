"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { StatusPill } from "@/components/ui/management-page";
import { useToast } from "@/components/ui/toast-provider";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { createWorkspaceRepository } from "@/features/api-workspace/workspace-repository";
import { UserGrantEditor } from "./user-grant-editor";
import { ErrorNotice, useMutation } from "@/features/operations/ui";
import { accountantUniquenessWarning } from "./accountant-uniqueness-warning";
import type { AccountCredential } from "./account-credential-contract";
import { accountStatusLabel, toUserAccount, type UserAccount } from "./user-account-model";
import type { EmployeeLookup } from "./use-user-accounts";
import { resetAccountPassword } from "./user-management-repository";
import { UserActionDialog } from "./user-action-dialog";
import { UserCredentialDialog } from "./user-credential-dialog";
import { UserInfoSection } from "./user-info-section";
import { UserZonesCompare } from "./user-zones-compare";
import { UserGrantChips } from "./user-grant-chips";
import { Subtabs } from "@/components/ui/management-screen/management-table";

type DetailTab = "info" | "grants" | "security";
const detailTabs = [{ key: "info", label: "Thông tin" }, { key: "grants", label: "Vai trò và vùng" }, { key: "security", label: "Bảo mật" }] satisfies readonly { key: DetailTab; label: string }[];
const RESET_LOCKED_REASON = "Tài khoản đang khóa: hãy mở khóa tài khoản trước khi đặt lại mật khẩu.";

/**
 * Detail of one user: contact info, lock/unlock, password reset, copy, the employee/account zones side by side, and the
 * zone-role grants (reusing the FARM-05 history, add and revoke). Any grant change refreshes the list and reminds the
 * Owner that the person must sign in again, because the permissions travel inside the session.
 */
export function UserDetailDialog({ accountId, accounts, employees, zoneNames, onClose, onChanged, onCopy }: {
  accountId: string; accounts: readonly UserAccount[]; employees: ReadonlyMap<string, EmployeeLookup>; zoneNames: ReadonlyMap<string, string>;
  onClose(): void; onChanged(): void; onCopy(account: UserAccount): void;
}) {
  const fromList = accounts.find((account) => account.id === accountId);
  // A saved record wins only until the refreshed list delivers a newer object, so row versions never go stale.
  const [override, setOverride] = useState<{ base?: UserAccount; value: UserAccount }>();
  const account = override && override.base === fromList ? override.value : fromList;
  const [tab, setTab] = useState<DetailTab>("info"), [credential, setCredential] = useState<AccountCredential>(), [action, setAction] = useState<"lock" | "reset">();
  const repository = useMemo(() => createWorkspaceRepository("accounts"), []);
  const status = useMutation(), reset = useMutation(), confirmation = useActionDialog(), { notify } = useToast();
  if (!account) return <Dialog open title="Người dùng" onOpenChange={(open) => { if (!open) onClose(); }}><p role="alert">Không tìm thấy người dùng trong danh sách hiện tại. Hãy tải lại danh sách.</p></Dialog>;
  const employee = account.employeeId ? employees.get(account.employeeId) : undefined;
  const locked = account.status !== "Active", busy = status.pending || reset.pending;
  const saved = (next: UserAccount) => { setOverride({ base: fromList, value: next }); onChanged(); };

  // The dialog stays open (pending) until the result is in; it closes only when the action succeeded.
  async function toggleLock(reason: string | undefined) {
    if (!account || !reason) return;
    const record = await status.run(() => repository.mutate(locked ? "unlock" : "lock", { reason }, account.id));
    if (record) { setAction(undefined); saved(toUserAccount(record)); notify({ tone: "success", title: `${locked ? "Đã mở khóa" : "Đã khóa"} tài khoản ${account.username}.` }); }
  }
  async function resetPassword() {
    if (!account) return;
    const issued = await reset.run(() => resetAccountPassword(account.id));
    if (issued) { setAction(undefined); setCredential(issued); onChanged(); }
  }
  // Decision D9: warn before a second Accountant, then let OK continue.
  const beforeGrant = async (role: string) => {
    const warning = accountantUniquenessWarning(accounts, [role], account.id);
    return !warning || confirmation.confirm(warning);
  };
  return <Dialog open title={`Người dùng · ${account.displayName}`} size="xl" onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
    {confirmation.dialog}
    {credential && <UserCredentialDialog title="Đã đặt lại mật khẩu" credential={credential} onClose={() => setCredential(undefined)} />}
    {action === "lock" && <UserActionDialog title={locked ? "Mở khóa tài khoản?" : "Khóa tài khoản?"} body={locked ? "Người dùng sẽ đăng nhập lại được." : "Người dùng sẽ bị đăng xuất và không đăng nhập được."}
      reasonLabel={locked ? "Lý do mở khóa" : "Lý do khóa"} confirmLabel={locked ? "Mở khóa tài khoản" : "Khóa tài khoản"} pendingLabel={locked ? "Đang mở khóa..." : "Đang khóa..."} error={status.error} onConfirm={toggleLock} onClose={() => setAction(undefined)} />}
    {action === "reset" && <UserActionDialog title="Đặt lại mật khẩu?" body={`Đặt lại mật khẩu của ${account.displayName}? Mật khẩu tạm mới chỉ hiển thị một lần và mọi phiên đăng nhập hiện tại của người dùng sẽ bị đăng xuất.`}
      confirmLabel="Đặt lại mật khẩu" pendingLabel="Đang đặt lại..." error={reset.error} onConfirm={resetPassword} onClose={() => setAction(undefined)} />}
    <div className="space-y-4">
      {/* Always visible: who this is, whether they can sign in, and which role and zones they hold right now. */}
      <div className="flex flex-wrap items-center gap-3"><StatusPill tone={locked ? "danger" : "success"}>{accountStatusLabel(account.status)}</StatusPill>
        <UserGrantChips pairs={account.pairs} limit={6} />
        {account.pairs.length === 0 && <span className="text-sm text-text-muted">Chưa đăng nhập được cho đến khi được phân quyền.</span>}</div>
      <Subtabs<DetailTab> label="Chi tiết người dùng" tabs={detailTabs} value={tab} onChange={setTab} idPrefix="user-detail" />
      <div role="tabpanel" id={`user-detail-panel-${tab}`} aria-labelledby={`user-detail-tab-${tab}`} className="space-y-4">
        {tab === "info" && <>
          <UserInfoSection key={account.rowVersion} account={account} disabled={busy} employeeLabel={employee ? `${employee.code} · ${employee.fullName}` : undefined} onSaved={saved} />
          <UserZonesCompare account={account} employee={employee} zoneNames={zoneNames} />
        </>}
        {tab === "grants" && <>
          <UserGrantEditor accountId={account.id} beforeGrant={beforeGrant} onChanged={onChanged} />
        </>}
        {tab === "security" && <section aria-label="Bảo mật" className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <Button className="w-auto" variant="secondary" disabled={busy || locked} title={locked ? RESET_LOCKED_REASON : undefined} aria-describedby={locked ? "user-reset-disabled-reason" : undefined} onClick={() => setAction("reset")}>Đặt lại mật khẩu</Button>
            <Button className="w-auto" variant="secondary" disabled={busy} onClick={() => setAction("lock")}>{locked ? "Mở khóa tài khoản" : "Khóa tài khoản"}</Button>
            <Button className="w-auto" variant="secondary" disabled={busy} onClick={() => onCopy(account)}>Sao chép người dùng</Button>
          </div>
          {locked && <p id="user-reset-disabled-reason" className="text-xs text-text-muted">{RESET_LOCKED_REASON}</p>}
          <ErrorNotice error={status.error || reset.error} />
        </section>}
      </div>
    </div>
  </Dialog>;
}
