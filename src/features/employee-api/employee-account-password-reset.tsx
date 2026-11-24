"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { ErrorNotice, useMutation } from "@/features/operations/ui";
import type { AccountCredential } from "@/features/user-management/account-credential-contract";
import { UserActionDialog } from "@/features/user-management/user-action-dialog";
import { UserCredentialDialog } from "@/features/user-management/user-credential-dialog";
import { resetAccountPassword } from "@/features/user-management/user-management-repository";

const LOCKED_REASON = "Tài khoản đang khóa: hãy mở khóa tài khoản trước khi đặt lại mật khẩu.";

/**
 * Owner-only quick hand-over of a login: copy the username and issue a NEW temporary password in one click. Passwords are stored
 * only as a hash, so the old one can never be shown; the temporary one lives in this component's state until the dialog closes.
 */
export function EmployeeAccountPasswordReset({ account, displayName }: { account: { id: string; username: string; status: string }; displayName: string }) {
  const [confirming, setConfirming] = useState(false), [credential, setCredential] = useState<AccountCredential>(), [notice, setNotice] = useState("");
  const mutation = useMutation(), alive = useRef(true), locked = account.status !== "Active";
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  async function copyUsername() {
    try { await navigator.clipboard.writeText(account.username); if (alive.current) setNotice("Đã sao chép tên tài khoản."); }
    catch { if (alive.current) setNotice("Không thể sao chép tự động. Hãy chọn tên tài khoản để sao chép thủ công."); }
  }
  async function reset() {
    const issued = await mutation.run(() => resetAccountPassword(account.id));
    if (issued) { setConfirming(false); setCredential(issued); }
  }
  return <section aria-label="Bàn giao đăng nhập" className="space-y-2 rounded-control border border-border p-3 text-sm">
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-semibold break-all">@{account.username}</span>
      <Button type="button" className="w-auto" variant="secondary" onClick={() => void copyUsername()} aria-label="Sao chép tên tài khoản">Sao chép</Button>
      <Button type="button" className="w-auto" variant="secondary" disabled={locked || mutation.pending} title={locked ? LOCKED_REASON : undefined} onClick={() => setConfirming(true)}>Đặt lại mật khẩu</Button>
    </div>
    <p className="text-xs text-text-muted">Mật khẩu chỉ hiện lúc này; bấm Đặt lại bất cứ khi nào cần lấy mật khẩu mới.</p>
    {locked && <p className="text-xs text-text-muted">{LOCKED_REASON}</p>}
    <p aria-live="polite" className="text-xs">{notice}</p>
    <ErrorNotice error={confirming ? undefined : mutation.error} />
    {/* The tab sits inside the profile <form>: the dialogs go to <body> (no nested form) and their submit never reaches the profile form. */}
    {(confirming || credential) && createPortal(<div onSubmit={event => event.stopPropagation()}>
      {confirming && <UserActionDialog title="Đặt lại mật khẩu?" body={`Đặt lại mật khẩu của ${displayName}? Mật khẩu tạm mới chỉ hiển thị một lần và mọi phiên đăng nhập hiện tại của họ sẽ bị đăng xuất.`}
        confirmLabel="Đặt lại mật khẩu" pendingLabel="Đang đặt lại..." error={mutation.error} onConfirm={reset} onClose={() => setConfirming(false)} />}
      {credential && <UserCredentialDialog title="Đã đặt lại mật khẩu" credential={credential} onClose={() => setCredential(undefined)} />}
    </div>, document.body)}
  </section>;
}
