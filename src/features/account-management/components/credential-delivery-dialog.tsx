"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { CredentialDeliveryReceipt } from "@/features/account-management/domain/account-management";

type CredentialDeliveryDialogProps = Readonly<{
  kind: "created" | "reset";
  onAcknowledge(): void;
  receipt: CredentialDeliveryReceipt;
}>;

function deliveryChannelLabel(channel: CredentialDeliveryReceipt["channel"]): string {
  return channel === "email" ? "email" : "SMS";
}

export function CredentialDeliveryDialog({
  kind,
  onAcknowledge,
  receipt,
}: CredentialDeliveryDialogProps) {
  const [copyStatus, setCopyStatus] = useState<"copied" | "failed" | "idle">(
    "idle",
  );
  const wasSent = receipt.deliveryStatus === "sent";

  async function copyUsername() {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard API is unavailable");
      await navigator.clipboard.writeText(receipt.username);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  }

  return (
    <Dialog
      description={
        wasSent
          ? `Thông tin đăng nhập đã được gửi trực tiếp cho nhân viên qua ${deliveryChannelLabel(receipt.channel)}.`
          : `Tài khoản đã được lưu nhưng chưa gửi được thông tin đăng nhập qua ${deliveryChannelLabel(receipt.channel)}.`
      }
      dismissible={false}
      onOpenChange={() => undefined}
      open
      title={kind === "created" ? "Đã tạo tài khoản" : "Đã cấp mật khẩu tạm mới"}
    >
      <div className="space-y-5">
        <div
          className={`rounded-card border p-4 text-sm leading-6 ${
            wasSent
              ? "border-emerald-200 bg-emerald-50 text-text"
              : "border-warning/30 bg-warning-soft text-text"
          }`}
          role="status"
        >
          <p className="font-semibold">
            {wasSent ? "Gửi thành công" : "Gửi chưa thành công"}
          </p>
          <p className="mt-1">
            {wasSent
              ? `Người nhận: ${receipt.maskedRecipient}. Mật khẩu tạm có hiệu lực 72 giờ.`
              : "Không có mật khẩu nào được hiển thị cho Chủ hợp tác xã. Hãy dùng chức năng gửi lại khi kết nối ổn định."}
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold text-text-muted">Tên đăng nhập</p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <output className="min-h-12 min-w-0 flex-1 rounded-control border border-border-strong bg-surface px-3 py-3 font-semibold text-text">
              {receipt.username}
            </output>
            <Button
              className="sm:w-auto"
              data-dialog-initial-focus
              onClick={() => void copyUsername()}
              variant="secondary"
            >
              {copyStatus === "copied" ? "Đã sao chép" : "Sao chép username"}
            </Button>
          </div>
          <p aria-live="polite" className="mt-2 min-h-5 text-sm text-text-muted">
            {copyStatus === "copied" && "Username đã được sao chép."}
            {copyStatus === "failed" &&
              "Không thể sao chép tự động. Hãy chọn username để sao chép thủ công."}
          </p>
        </div>

        <div className="border-t border-border pt-5">
          <Button onClick={onAcknowledge}>Đã hiểu</Button>
        </div>
      </div>
    </Dialog>
  );
}
