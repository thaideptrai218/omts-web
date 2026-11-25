"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { createWorkspaceRepository } from "@/features/api-workspace/workspace-repository";
import { ErrorNotice, useMutation } from "@/features/operations/ui";
import type { AccountCredential } from "./account-credential-contract";
import { toUserAccount, type UserAccount } from "./user-account-model";
import { UserActionDialog } from "./user-action-dialog";
import { UserCredentialDialog } from "./user-credential-dialog";
import { resetAccountPassword } from "./user-management-repository";

const LOCKED_REASON = "Tài khoản đang khóa. Hãy mở khóa rồi mới đặt lại mật khẩu được.";

/**
 * Owner-only hand-over of a login: copy the username, issue a NEW temporary password, lock or unlock the account.
 * Passwords are stored only as a hash, so the old one can never be shown; the temporary one lives in this component's
 * state until its dialog closes. A lock or unlock reports the saved account back so the caller shows the new status.
 */
export function AccountLoginActions({ account, status, disabled = false, onStatusChanged }: {
  account: { id: string; username: string; displayName: string }; status: string; disabled?: boolean; onStatusChanged(saved: UserAccount): void;
}) {
  const [action, setAction] = useState<"reset" | "lock">(), [credential, setCredential] = useState<AccountCredential>(), [notice, setNotice] = useState("");
  const repository = useMemo(() => createWorkspaceRepository("accounts"), []);
  const reset = useMutation(), lock = useMutation(), alive = useRef(true), locked = status !== "Active", busy = disabled || reset.pending || lock.pending;
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  async function copyUsername() {
    try { await navigator.clipboard.writeText(account.username); if (alive.current) setNotice("Đã sao chép tên đăng nhập."); }
    catch { if (alive.current) setNotice("Không sao chép tự động được. Hãy chọn tên đăng nhập rồi sao chép."); }
  }
  async function resetPassword() {
    const issued = await reset.run(() => resetAccountPassword(account.id));
    if (issued) { setAction(undefined); setCredential(issued); }
  }
  // The dialog stays open (pending) until the result is in; it closes only when the action worked.
  async function toggleLock(reason: string | undefined) {
    if (!reason) return;
    const record = await lock.run(() => repository.mutate(locked ? "unlock" : "lock", { reason }, account.id));
    if (record) { setAction(undefined); setNotice(locked ? "Đã mở khóa tài khoản." : "Đã khóa tài khoản."); onStatusChanged(toUserAccount(record)); }
  }
  return <section aria-label="Đăng nhập" className="space-y-2 text-sm">
    <div className="flex flex-wrap items-center gap-2">
      <span className="break-all font-semibold">@{account.username}</span>
      <Button type="button" className="w-auto" variant="secondary" onClick={() => void copyUsername()} aria-label="Sao chép tên đăng nhập">Sao chép</Button>
      <Button type="button" className="w-auto" variant="secondary" disabled={locked || busy} title={locked ? LOCKED_REASON : undefined} onClick={() => setAction("reset")}>Đặt lại mật khẩu</Button>
      <Button type="button" className="w-auto" variant="secondary" disabled={busy} onClick={() => setAction("lock")}>{locked ? "Mở khóa tài khoản" : "Khóa tài khoản"}</Button>
    </div>
    <p className="text-xs text-text-muted">Mật khẩu tạm chỉ hiện một lần. Cần mật khẩu mới thì bấm Đặt lại mật khẩu.</p>
    {locked && <p className="text-xs text-text-muted">{LOCKED_REASON}</p>}
    <p aria-live="polite" className="text-xs">{notice}</p>
    <ErrorNotice error={action ? undefined : reset.error || lock.error} />
    {action === "reset" && <UserActionDialog title="Đặt lại mật khẩu?" body={`Đặt lại mật khẩu của ${account.displayName}? Mật khẩu tạm mới chỉ hiện một lần và mọi lần đăng nhập hiện tại của họ sẽ bị đăng xuất.`}
      confirmLabel="Đặt lại mật khẩu" pendingLabel="Đang đặt lại..." error={reset.error} onConfirm={resetPassword} onClose={() => setAction(undefined)} />}
    {action === "lock" && <UserActionDialog title={locked ? "Mở khóa tài khoản?" : "Khóa tài khoản?"} body={locked ? "Nhân viên sẽ đăng nhập lại được." : "Nhân viên sẽ bị đăng xuất và không đăng nhập được cho đến khi bạn mở khóa."}
      reasonLabel={locked ? "Lý do mở khóa" : "Lý do khóa"} confirmLabel={locked ? "Mở khóa tài khoản" : "Khóa tài khoản"} pendingLabel={locked ? "Đang mở khóa..." : "Đang khóa..."} error={lock.error} onConfirm={toggleLock} onClose={() => setAction(undefined)} />}
    {credential && <UserCredentialDialog title="Đã đặt lại mật khẩu" credential={credential} onClose={() => setCredential(undefined)} />}
  </section>;
}
