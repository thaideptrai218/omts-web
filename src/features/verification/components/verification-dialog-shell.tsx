"use client";

import type { ReactNode, RefObject } from "react";

import { Dialog } from "@/components/ui/dialog";
import type {
  MaskedVerificationRecipient,
  VerificationPurpose,
} from "@/features/verification/domain/verification-types";

const titleByPurpose: Record<VerificationPurpose, string> = {
  "email-change": "Xác minh email mới",
  "password-change-by-email": "Xác minh để đổi mật khẩu",
  "phone-after-login": "Xác minh số điện thoại",
  "phone-change": "Xác minh số điện thoại mới",
  recovery: "Xác minh để khôi phục tài khoản",
  registration: "Xác minh thông tin đăng ký",
};

type VerificationDialogShellProps = Readonly<{
  children: ReactNode;
  initialFocusRef?: RefObject<HTMLElement | null>;
  onOpenChange(open: boolean): void;
  open: boolean;
  purpose: VerificationPurpose;
  recipient: MaskedVerificationRecipient;
}>;

export function VerificationDialogShell({
  children,
  initialFocusRef,
  onOpenChange,
  open,
  purpose,
  recipient,
}: VerificationDialogShellProps) {
  const channelLabel = recipient.channel === "email" ? "email" : "số điện thoại";

  return (
    <Dialog
      description="Nhập mã gồm 6 chữ số để tiếp tục."
      initialFocusRef={initialFocusRef}
      onOpenChange={onOpenChange}
      open={open}
      title={titleByPurpose[purpose]}
    >
      <div className="rounded-card border border-info/20 bg-info-soft p-4">
        <p className="text-sm font-medium text-text-muted">
          Mã xác minh đã được gửi tới {channelLabel}
        </p>
        <p className="mt-1 break-all text-base font-semibold text-text">
          {recipient.maskedValue}
        </p>
      </div>

      <div className="mt-5">{children}</div>
    </Dialog>
  );
}
