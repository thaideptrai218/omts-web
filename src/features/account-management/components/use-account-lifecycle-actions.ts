"use client";

import { useState } from "react";
import type { AccountEditorFeedback } from "@/features/account-management/components/account-editor-model";
import type {
  AccessGrant,
  AccountAction,
  CredentialDeliveryReceipt,
  ManagedAccount,
} from "@/features/account-management/domain/account-management";
import { accountManagementService } from "@/features/account-management/services/account-management-service.instance";
import { formatMessage } from "@/shared/messages/message-catalog";
import { sessionExpiryChannel } from "@/shared/session/session-expiry-channel";

type UseAccountLifecycleActionsInput = Readonly<{
  account?: ManagedAccount;
  onDelivery(receipt: CredentialDeliveryReceipt, kind: "created" | "reset"): void;
  onPendingChange?(pending: boolean): void;
  onSaved(account: ManagedAccount): void;
  setFeedback(feedback: AccountEditorFeedback | undefined): void;
}>;

/**
 * Lock/unlock, revoke-grant and reset-password flows of an existing account.
 * Owns the confirmation dialog state and a shared pending flag.
 */
export function useAccountLifecycleActions({
  account,
  onDelivery,
  onPendingChange,
  onSaved,
  setFeedback,
}: UseAccountLifecycleActionsInput) {
  const [action, setAction] = useState<AccountAction>();
  const [grantToRevoke, setGrantToRevoke] = useState<AccessGrant>();
  const [isActionPending, setIsActionPending] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  /** Wraps a mutation with pending flags; unexpected errors show `failureText`. */
  async function runPendingAction(
    failureText: string,
    work: () => Promise<void>,
  ) {
    onPendingChange?.(true);
    setIsActionPending(true);
    try {
      await work();
    } catch {
      setFeedback({ text: failureText, tone: "danger" });
    } finally {
      setIsActionPending(false);
      onPendingChange?.(false);
    }
  }

  async function confirmStatusChange(reason: string) {
    if (!account || !action) return;
    await runPendingAction("Chưa thể thay đổi trạng thái tài khoản.", async () => {
      const result = await accountManagementService.changeStatus({
        accountId: account.id,
        action,
        confirmed: true,
        reason,
      });
      if (result.status === "session-expired") {
        sessionExpiryChannel.publish(result.message);
        return;
      }
      if (result.status === "changed") {
        onSaved(result.account);
        setAction(undefined);
        setFeedback({
          text:
            action === "lock"
              ? "Tài khoản đã được khóa."
              : "Tài khoản đã được mở khóa.",
          tone: "success",
        });
        return;
      }
      setFeedback({ text: formatMessage(result.message), tone: "danger" });
    });
  }

  async function confirmRevoke(reason: string) {
    if (!account || !grantToRevoke) return;
    await runPendingAction("Chưa thể thu hồi quyền truy cập.", async () => {
      const result = await accountManagementService.revokeGrant({
        accountId: account.id,
        confirmed: true,
        grantId: grantToRevoke.id,
        reason,
      });
      if (result.status === "session-expired") {
        sessionExpiryChannel.publish(result.message);
        return;
      }
      if (result.status === "revoked") {
        onSaved(result.account);
        setGrantToRevoke(undefined);
        setFeedback({
          text: "Quyền truy cập đã được thu hồi và giữ trong lịch sử.",
          tone: "success",
        });
        return;
      }
      setFeedback({ text: formatMessage(result.message), tone: "danger" });
    });
  }

  async function resetPassword() {
    if (!account) return;
    await runPendingAction("Chưa thể đặt lại mật khẩu.", async () => {
      const result = await accountManagementService.resetPassword({
        accountId: account.id,
        confirmed: true,
      });
      if (result.status === "session-expired") {
        sessionExpiryChannel.publish(result.message);
        return;
      }
      if (result.status === "reset") {
        setResetDialogOpen(false);
        onDelivery(result.delivery, "reset");
        return;
      }
      setFeedback({ text: formatMessage(result.message), tone: "danger" });
    });
  }

  return {
    action,
    confirmRevoke,
    confirmStatusChange,
    grantToRevoke,
    isActionPending,
    resetDialogOpen,
    resetPassword,
    setAction,
    setGrantToRevoke,
    setResetDialogOpen,
  };
}

export type AccountLifecycleActions = ReturnType<typeof useAccountLifecycleActions>;
