"use client";

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
  onOpenChange,
  open,
  service,
}: ChangePasswordDialogProps) {
  const { notify } = useToast();

  return (
    <Dialog
      description="Mật khẩu mới phải có ít nhất 8 ký tự, gồm chữ và số. Không chia sẻ mật khẩu với người khác."
      onOpenChange={onOpenChange}
      open={open}
      title="Đổi mật khẩu"
    >
      <ChangePasswordForm
        changePassword={(input) => service.changeWithCurrentPassword(input)}
        mode="standard"
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
