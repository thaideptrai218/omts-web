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
      description="Bàn giao trực tiếp thông tin này cho Chủ nhiệm HTX. Sau khi đóng, mật khẩu sẽ không được hiển thị lại."
      onAcknowledge={onAcknowledge}
      title="Tài khoản Chủ nhiệm HTX đã được tạo"
    />
  );
}
