"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/management-page";
import { createWorkspaceRepository } from "@/features/api-workspace/workspace-repository";
import { displayTime, ErrorNotice, useMutation } from "@/features/operations/ui";
import type { AccountCredential } from "./account-credential-contract";
import { accountState, accountStateLabel } from "./user-account-list-model";
import { toUserAccount, type UserAccount } from "./user-account-model";
import { UserActionDialog } from "./user-action-dialog";
import { UserCredentialDialog } from "./user-credential-dialog";
import { resetAccountPassword } from "./user-management-repository";

type Action = "reset" | "lock" | "delete";
const LOCKED_REASON = "Tài khoản đang khóa. Hãy mở khóa rồi mới đặt lại mật khẩu được.";
const tone = { active: "success", pending: "warning", locked: "danger", deleted: "neutral" } as const;

/**
 * "Bảo mật" of one account, Owner only: reset the password (a new temporary one, shown once), lock or unlock with a written reason, and
 * "Xóa người dùng" (soft delete, with a reason). The Owner account and the account you are signed in with are never locked or deleted here
 * (the backend refuses both too). `onChanged` gets the saved account so the screen shows the new status; `onDeleted` closes the detail.
 */
export function UserSecurityTab({ account, isSelf, onChanged, onDeleted }: { account: UserAccount; isSelf: boolean; onChanged(saved: UserAccount): void; onDeleted(): void }) {
  const [action, setAction] = useState<Action>(), [credential, setCredential] = useState<AccountCredential>(), [recent, setRecent] = useState<{ text: string; at: string }>();
  const repository = useMemo(() => createWorkspaceRepository("accounts"), []);
  const reset = useMutation(), change = useMutation(), alive = useRef(true), state = accountState(account);
  const locked = state === "locked", deleted = state === "deleted", protectedAccount = isSelf || (!!account.subjectType && account.subjectType !== "Staff");
  const busy = reset.pending || change.pending;
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const note = (text: string) => setRecent({ text, at: new Date().toISOString() });
  async function resetPassword() {
    const issued = await reset.run(() => resetAccountPassword(account.id));
    if (issued) { setAction(undefined); setCredential(issued); note("Đã đặt lại mật khẩu"); }
  }
  async function toggleLock(reason: string | undefined) {
    if (!reason) return;
    const record = await change.run(() => repository.mutate(locked ? "unlock" : "lock", { reason }, account.id));
    if (record) { setAction(undefined); note(`${locked ? "Đã mở khóa" : "Đã khóa"}. Lý do: ${reason}`); onChanged(toUserAccount(record)); }
  }
  async function remove(reason: string | undefined) {
    if (!reason) return;
    const record = await change.run(() => repository.mutate("delete", { reason, rowVersion: account.rowVersion }, account.id));
    if (record) { setAction(undefined); onChanged(toUserAccount(record)); onDeleted(); }
  }
  return <section aria-label="Bảo mật" className="space-y-4 text-sm">
    <div className="flex flex-wrap items-center gap-2"><span className="text-text-muted">Trạng thái:</span><StatusPill tone={tone[state]}>{accountStateLabel[state]}</StatusPill></div>
    {state === "pending" && <p className="text-xs text-text-muted">Người này chưa đổi mật khẩu tạm lần nào, lần đăng nhập đầu sẽ phải đổi.</p>}
    {recent && <p role="status" className="rounded-control bg-surface-subtle p-2">Thay đổi gần nhất: {recent.text} ({displayTime(recent.at)}).</p>}
    {deleted ? <p className="text-text-muted">Tài khoản đã xóa: không đăng nhập được và không còn vai trò hay vùng nào. Tên đăng nhập, số điện thoại và email vẫn được giữ, không dùng lại cho tài khoản khác.</p> : <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button className="w-auto" variant="secondary" disabled={locked || busy} title={locked ? LOCKED_REASON : undefined} onClick={() => setAction("reset")}>Đặt lại mật khẩu</Button>
        {!protectedAccount && <Button className="w-auto" variant="secondary" disabled={busy} onClick={() => setAction("lock")}>{locked ? "Mở khóa" : "Khóa tài khoản"}</Button>}
        {!protectedAccount && <Button className="w-auto" variant="danger" disabled={busy} onClick={() => setAction("delete")}>Xóa người dùng</Button>}
      </div>
      {locked && <p className="text-xs text-text-muted">{LOCKED_REASON}</p>}
      {protectedAccount && <p className="text-xs text-text-muted">{isSelf ? "Đây là tài khoản bạn đang đăng nhập nên không khóa hay xóa được." : "Đây là tài khoản chủ hợp tác xã nên không khóa hay xóa được."}</p>}
    </div>}
    <ErrorNotice error={action ? undefined : reset.error || change.error} />
    {action === "reset" && <UserActionDialog title="Đặt lại mật khẩu?" body={`Đặt lại mật khẩu của ${account.displayName}? Mật khẩu tạm mới chỉ hiện một lần và mọi lần đăng nhập hiện tại của họ sẽ bị đăng xuất.`}
      confirmLabel="Đặt lại mật khẩu" pendingLabel="Đang đặt lại..." error={reset.error} onConfirm={resetPassword} onClose={() => setAction(undefined)} />}
    {action === "lock" && <UserActionDialog title={locked ? "Mở khóa tài khoản?" : "Khóa tài khoản?"} body={locked ? "Người này sẽ đăng nhập lại được." : "Người này sẽ bị đăng xuất và không đăng nhập được cho đến khi bạn mở khóa."}
      reasonLabel={locked ? "Lý do mở khóa" : "Lý do khóa"} confirmLabel={locked ? "Mở khóa" : "Khóa tài khoản"} pendingLabel={locked ? "Đang mở khóa..." : "Đang khóa..."} error={change.error} onConfirm={toggleLock} onClose={() => setAction(undefined)} />}
    {action === "delete" && <UserActionDialog title="Xóa người dùng?" body={`Xóa tài khoản ${account.displayName}? Người này bị đăng xuất, mất mọi vai trò và vùng, và không đăng nhập được nữa. Nhân viên đã gắn (nếu có) được gỡ ra để cấp tài khoản mới. Tên đăng nhập, số điện thoại và email vẫn được giữ.`}
      reasonLabel="Lý do xóa" confirmLabel="Xóa người dùng" pendingLabel="Đang xóa..." error={change.error} onConfirm={remove} onClose={() => setAction(undefined)} />}
    {credential && <UserCredentialDialog title="Đã đặt lại mật khẩu" credential={credential} onClose={() => setCredential(undefined)} />}
  </section>;
}
