"use client";

import { useRef, useState } from "react";

import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast-provider";
import { ChangePasswordForm } from "@/features/account-security/components/change-password-form";
import type { AccountSecurityService } from "@/features/account-security/services/account-security-service";
import { formatMessage } from "@/shared/messages/message-catalog";
import { sessionExpiryChannel } from "@/shared/session/session-expiry-channel";

type ChangePasswordDialogProps = Readonly<{
  onOpenChange(open: boolean): void;
  open: boolean;
  service: AccountSecurityService;
}>;

export function ChangePasswordDialog({
  open,
  ...props
}: ChangePasswordDialogProps) {
  if (!open) return null;
  return <ChangePasswordSession {...props} />;
}

function ChangePasswordSession({
  onOpenChange,
  service,
}: Omit<ChangePasswordDialogProps, "open">) {
  const { notify } = useToast();
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);

  return (
    <Dialog
      description="Mật khẩu mới phải có ít nhất 8 ký tự, gồm chữ và số. Không chia sẻ mật khẩu với người khác."
      dismissible={!pending}
      onOpenChange={(next) => { if (!pendingRef.current) onOpenChange(next); }}
      open
      title="Đổi mật khẩu"
    >
      <ChangePasswordForm
        changePassword={(input) => service.changeWithCurrentPassword(input)}
        mode="standard"
        onPendingChange={(next) => { pendingRef.current = next; setPending(next); }}
        onChanged={(message) => {
          onOpenChange(false);
          notify({
            description: "Mật khẩu mới đã được áp dụng cho tài khoản này.",
            title: formatMessage(message),
            tone: "success",
          });
        }}
        onSessionExpired={(message) => sessionExpiryChannel.publish(message)}
      />
    </Dialog>
  );
}
