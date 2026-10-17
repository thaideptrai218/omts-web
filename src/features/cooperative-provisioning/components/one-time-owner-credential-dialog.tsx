import { OneTimeCredentialDialog } from "@/components/security/one-time-credential-dialog";
import type { ProvisionedOwnerCredential } from "@/features/cooperative-provisioning/domain/provisioned-owner-credential";

type OneTimeOwnerCredentialDialogProps = Readonly<{
  credential: ProvisionedOwnerCredential;
  onAcknowledge(): void;
}>;

export function OneTimeOwnerCredentialDialog({
  credential,
  onAcknowledge,
}: OneTimeOwnerCredentialDialogProps) {
  return (
    <OneTimeCredentialDialog
      credential={credential}
      description="Bàn giao trực tiếp thông tin này cho Chủ hợp tác xã. Sau khi đóng, mật khẩu sẽ không được hiển thị lại."
      onAcknowledge={onAcknowledge}
      title="Tài khoản Chủ hợp tác xã đã được tạo"
    />
  );
}
