"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { displayTime } from "@/features/operations/ui";

/** The caller owns this one-time value and destroys it on acknowledgement. */
export function EmployeeCredentialDialog({ username, password, expiresAt, onClose }: {
  username: string; password: string; expiresAt: string; onClose(): void;
}) {
  const [notice, setNotice] = useState("");
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  function close() { alive.current = false; onClose(); }
  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      if (alive.current) setNotice(`Đã sao chép ${label}.`);
    } catch { if (alive.current) setNotice("Không thể sao chép tự động. Hãy chọn nội dung để sao chép thủ công."); }
  }
  return <Dialog open title="Đã cấp tài khoản đăng nhập" onOpenChange={open => { if (!open) close(); }}>
    <div className="min-w-0 space-y-4">
      <p role="status">Mật khẩu tạm chỉ hiển thị lần này và sẽ không được hiển thị lại sau khi đóng. Hãy bàn giao cho nhân viên ngay.</p>
      <dl className="space-y-3">
        <div><dt className="font-semibold">Tên tài khoản</dt><dd className="break-all">{username}</dd></div>
        <div><dt className="font-semibold">Mật khẩu tạm</dt><dd><output className="block break-all rounded-control border border-border p-3 font-mono" aria-label="Mật khẩu tạm">{password}</output></dd></div>
        <div><dt className="font-semibold">Hết hạn</dt><dd>{displayTime(expiresAt)}</dd></div>
      </dl>
      <div className="flex flex-wrap gap-3">
        <Button className="w-auto" variant="secondary" onClick={() => void copy(username, "tên tài khoản")}>Sao chép tên tài khoản</Button>
        <Button className="w-auto" variant="secondary" onClick={() => void copy(password, "mật khẩu tạm")}>Sao chép mật khẩu tạm</Button>
      </div>
      <p aria-live="polite" className="text-sm">{notice}</p>
      <Button onClick={close}>Đã bàn giao, đóng</Button>
    </div>
  </Dialog>;
}
