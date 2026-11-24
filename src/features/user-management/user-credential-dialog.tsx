"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { displayTime } from "@/features/operations/ui";
import type { AccountCredential } from "./account-credential-contract";

/**
 * Shows a temporary password exactly once (new user or password reset). The caller keeps it in component state only and
 * drops it when this dialog closes; the backend never returns it again.
 */
export function UserCredentialDialog({ title, credential, onClose }: { title: string; credential: AccountCredential; onClose(): void }) {
  const [notice, setNotice] = useState("");
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  async function copy(value: string, label: string) {
    try { await navigator.clipboard.writeText(value); if (alive.current) setNotice(`Đã sao chép ${label}.`); }
    catch { if (alive.current) setNotice("Không thể sao chép tự động. Hãy chọn nội dung để sao chép thủ công."); }
  }
  return <Dialog open title={title} onOpenChange={(open) => { if (!open) onClose(); }}>
    <div className="min-w-0 space-y-4">
      <p role="status">Mật khẩu tạm chỉ hiển thị lần này và sẽ không hiển thị lại sau khi đóng. Hãy bàn giao cho người dùng ngay; họ phải đổi mật khẩu khi đăng nhập.</p>
      <dl className="space-y-3">
        <div><dt className="font-semibold">Tên đăng nhập</dt><dd className="break-all">{credential.account.username}</dd></div>
        <div><dt className="font-semibold">Mật khẩu tạm</dt><dd><output className="block break-all rounded-control border border-border p-3 font-mono" aria-label="Mật khẩu tạm">{credential.temporaryPassword}</output></dd></div>
        <div><dt className="font-semibold">Hết hạn</dt><dd>{displayTime(credential.temporaryPasswordExpiresAt)}</dd></div>
      </dl>
      <div className="flex flex-wrap gap-3">
        <Button className="w-auto" variant="secondary" onClick={() => void copy(credential.account.username, "tên đăng nhập")}>Sao chép tên đăng nhập</Button>
        <Button className="w-auto" variant="secondary" onClick={() => void copy(credential.temporaryPassword, "mật khẩu tạm")}>Sao chép mật khẩu tạm</Button>
      </div>
      <p className="text-sm text-text-muted">Mật khẩu chỉ hiện lúc này; bấm Đặt lại bất cứ khi nào cần lấy mật khẩu mới.</p>
      <p aria-live="polite" className="text-sm">{notice}</p>
      <Button onClick={onClose}>Đã bàn giao, đóng</Button>
    </div>
  </Dialog>;
}
