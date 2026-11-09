"use client";

import type { Dispatch, SetStateAction } from "react";
import type { UseFormReturn } from "react-hook-form";
import type {
  AccountEditorFeedback,
  AccountEditorStep,
} from "@/features/account-management/components/account-editor-model";
import type {
  CredentialDeliveryReceipt,
  GrantDraft,
  ManagedAccount,
} from "@/features/account-management/domain/account-management";
import type { AccountEditorValues } from "@/features/account-management/schemas/account-editor-schema";
import { accountManagementService } from "@/features/account-management/services/account-management-service.instance";
import { formatMessage } from "@/shared/messages/message-catalog";
import { sessionExpiryChannel } from "@/shared/session/session-expiry-channel";

/** Everything the save flow reads from or writes back to the account editor. */
export type AccountSaveDeps = Readonly<{
  account?: ManagedAccount;
  drafts: readonly GrantDraft[];
  effectiveGrantCount: number;
  form: Pick<
    UseFormReturn<AccountEditorValues>,
    "handleSubmit" | "setError" | "setFocus" | "trigger"
  >;
  isCreate: boolean;
  onDelivery(
    receipt: CredentialDeliveryReceipt,
    kind: "created" | "reset",
  ): void;
  onPendingChange?(pending: boolean): void;
  onSaved(account: ManagedAccount): void;
  setDrafts: Dispatch<SetStateAction<readonly GrantDraft[]>>;
  setDuplicateAccountId: Dispatch<SetStateAction<string | undefined>>;
  setFeedback: Dispatch<SetStateAction<AccountEditorFeedback | undefined>>;
  setGrantError: Dispatch<SetStateAction<string>>;
  setIsSaving: Dispatch<SetStateAction<boolean>>;
  setStep: Dispatch<SetStateAction<AccountEditorStep>>;
}>;

/**
 * Edit -> preview validation and the final save call of the account editor,
 * including mapping each service result back onto form/grant errors.
 */
export function useAccountSave(deps: AccountSaveDeps) {
  const {
    account,
    drafts,
    effectiveGrantCount,
    form: { handleSubmit, setError, setFocus, trigger },
    isCreate,
    onDelivery,
    onPendingChange,
    onSaved,
    setDrafts,
    setDuplicateAccountId,
    setFeedback,
    setGrantError,
    setIsSaving,
    setStep,
  } = deps;

  async function continueToPreview() {
    const valid = await trigger();
    if (!valid) return;
    if (effectiveGrantCount === 0) {
      setGrantError("Thêm ít nhất một cặp vùng và vai trò trước khi tiếp tục.");
      document.getElementById("account-grants")?.focus();
      return;
    }
    setGrantError("");
    setFeedback(undefined);
    setStep("preview");
    requestAnimationFrame(() =>
      document.getElementById("permission-preview-heading")?.focus(),
    );
  }

  const saveAccount = handleSubmit(async (values) => {
    onPendingChange?.(true);
    setIsSaving(true);
    setFeedback(undefined);
    try {
      const result = await accountManagementService.save({
        ...values,
        id: account?.id ?? null,
        newGrants: drafts,
        recordVersion: account?.recordVersion ?? null,
      });
      if (result.status === "session-expired") {
        sessionExpiryChannel.publish(result.message);
        return;
      }
      if (result.status === "forbidden") {
        setFeedback({ text: formatMessage(result.message), tone: "danger" });
        return;
      }
      if (result.status === "invalid-input") {
        setStep("edit");
        if (result.field === "grants") {
          setGrantError(
            "Kiểm tra lại vùng, vai trò và thời gian hiệu lực của các dòng quyền.",
          );
          requestAnimationFrame(() =>
            document.getElementById("account-grants")?.focus(),
          );
        } else {
          const field = result.field;
          setError(field, { message: formatMessage(result.message) });
          requestAnimationFrame(() => setFocus(field));
        }
        return;
      }
      if (result.status === "duplicate") {
        setStep("edit");
        setError(result.field, { message: formatMessage(result.message) });
        setFeedback({
          text: formatMessage(result.message),
          tone: "danger",
        });
        setDuplicateAccountId(result.existingAccountId);
        requestAnimationFrame(() => setFocus(result.field));
        return;
      }

      onSaved(result.account);
      setDuplicateAccountId(undefined);
      if (result.delivery) onDelivery(result.delivery, "created");
      setDrafts([]);
      setStep("edit");
      setFeedback({
        text: isCreate
          ? "Tài khoản đã được tạo."
          : "Tài khoản đã được cập nhật.",
        tone: "success",
      });
    } catch {
      setFeedback({
        text: "Chưa thể lưu tài khoản. Dữ liệu hiện tại chưa bị thay đổi; hãy thử lại.",
        tone: "danger",
      });
    } finally {
      setIsSaving(false);
      onPendingChange?.(false);
    }
  });

  return { continueToPreview, saveAccount };
}
