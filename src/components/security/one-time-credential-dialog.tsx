"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

export type OneTimeCredential = Readonly<{
  accountIdentifier: string;
  temporaryPassword: string;
}>;

type OneTimeCredentialDialogProps = Readonly<{
  credential: OneTimeCredential;
  description: string;
  onAcknowledge(): void;
  title: string;
}>;

export function OneTimeCredentialDialog({
  credential,
  description,
  onAcknowledge,
  title,
}: OneTimeCredentialDialogProps) {
  const [copyStatus, setCopyStatus] = useState<"copied" | "failed" | "idle">("idle");

  async function copyTemporaryPassword() {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard API is unavailable");
      await navigator.clipboard.writeText(credential.temporaryPassword);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  }

  return (
    <Dialog
      description={description}
      dismissible={false}
      onOpenChange={() => undefined}
      open
      title={title}
    >
      <div className="space-y-5">
        <div className="rounded-card border border-warning/30 bg-warning-soft p-4 text-sm leading-6 text-text">
          <p className="font-semibold text-warning">Mật khẩu chỉ hiển thị một lần</p>
          <p className="mt-1">
            Mật khẩu tạm thời có hiệu lực trong 24 giờ và phải được đổi ở lần đăng
            nhập đầu tiên. OMTS không gửi mật khẩu này qua email, SMS hay kênh khác.
          </p>
        </div>

        <dl className="space-y-4">
          <div>
            <dt className="text-sm font-semibold text-text-muted">Tài khoản đăng nhập</dt>
            <dd className="mt-1 break-all text-base font-semibold text-text">
              {credential.accountIdentifier}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-text-muted">Mật khẩu tạm thời</dt>
            <dd className="mt-2 flex flex-col gap-3 sm:flex-row">
              <input
                aria-label="Mật khẩu tạm thời"
                className="min-h-12 min-w-0 flex-1 rounded-control border border-border-strong bg-surface px-3 font-mono text-lg font-bold tracking-[0.18em] text-text"
                onFocus={(event) => event.currentTarget.select()}
                readOnly
                value={credential.temporaryPassword}
              />
              <Button
                className="sm:w-auto"
                data-dialog-initial-focus
                onClick={() => void copyTemporaryPassword()}
                variant="secondary"
              >
                {copyStatus === "copied" ? "Đã sao chép" : "Sao chép mật khẩu"}
              </Button>
            </dd>
            <p aria-live="polite" className="mt-2 min-h-5 text-sm text-text-muted">
              {copyStatus === "copied" && "Mật khẩu đã được sao chép."}
              {copyStatus === "failed" &&
                "Không thể sao chép tự động. Hãy chọn nội dung trong ô để sao chép thủ công."}
            </p>
          </div>
        </dl>

        <div className="border-t border-border pt-5">
          <Button onClick={onAcknowledge}>Tôi đã bàn giao thông tin</Button>
        </div>
      </div>
    </Dialog>
  );
}
