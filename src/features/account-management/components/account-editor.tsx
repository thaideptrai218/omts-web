"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { AccountEditorEditStep } from "@/features/account-management/components/account-editor-edit-step";
import { AccountEditorFeedbackBanner } from "@/features/account-management/components/account-editor-feedback-banner";
import { AccountEditorHeader } from "@/features/account-management/components/account-editor-header";
import {
  countEffectiveGrants,
  findAccountantRoleIds,
  findUnavailableRoleIds,
  initialAccountEditorValues,
  type AccountEditorFeedback,
  type AccountEditorStep,
} from "@/features/account-management/components/account-editor-model";
import { AccountEditorPreviewStep } from "@/features/account-management/components/account-editor-preview-step";
import { AccountEditorStepIndicator } from "@/features/account-management/components/account-editor-step-indicator";
import { AccountLifecycleDialogs } from "@/features/account-management/components/account-lifecycle-dialogs";
import { ProtectedOwnerAccountSummary } from "@/features/account-management/components/protected-owner-account-summary";
import { useAccountLifecycleActions } from "@/features/account-management/components/use-account-lifecycle-actions";
import type {
  AccountManagementWorkspace,
  CredentialDeliveryReceipt,
  GrantDraft,
  ManagedAccount,
} from "@/features/account-management/domain/account-management";
import { buildEffectivePermissionPreview } from "@/features/account-management/lib/effective-permissions";
import {
  accountEditorSchema,
  type AccountEditorValues,
} from "@/features/account-management/schemas/account-editor-schema";
import { accountManagementService } from "@/features/account-management/services/account-management-service.instance";
import { formatMessage } from "@/shared/messages/message-catalog";
import { sessionExpiryChannel } from "@/shared/session/session-expiry-channel";

type AccountEditorProps = Readonly<{
  account?: ManagedAccount;
  embedded?: boolean;
  onDelivery(
    receipt: CredentialDeliveryReceipt,
    kind: "created" | "reset",
  ): void;
  onOpenExisting(accountId: string): void;
  onSaved(account: ManagedAccount): void;
  onPendingChange?(pending: boolean): void;
  workspace: AccountManagementWorkspace;
}>;

/**
 * Create/update an internal account in two steps: edit details and zone-role grants,
 * then preview effective permissions and save. Owner accounts are read-only.
 */
export function AccountEditor({
  account,
  embedded = false,
  onDelivery,
  onOpenExisting,
  onSaved,
  onPendingChange,
  workspace,
}: AccountEditorProps) {
  const [step, setStep] = useState<AccountEditorStep>("edit");
  const [drafts, setDrafts] = useState<readonly GrantDraft[]>([]);
  const [grantError, setGrantError] = useState("");
  const [feedback, setFeedback] = useState<AccountEditorFeedback | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const [duplicateAccountId, setDuplicateAccountId] = useState<string>();
  const lifecycle = useAccountLifecycleActions({
    account,
    onDelivery,
    onPendingChange,
    onSaved,
    setFeedback,
  });

  const isCreate = !account;
  const isInternal = isCreate || account.accountType === "internal";
  const {
    formState: { errors, isDirty },
    getValues,
    handleSubmit,
    register,
    setError,
    setFocus,
    trigger,
  } = useForm<AccountEditorValues>({
    defaultValues: initialAccountEditorValues(account),
    resolver: zodResolver(accountEditorSchema),
  });

  const preview = useMemo(
    () =>
      buildEffectivePermissionPreview({
        currentGrants: account?.grants ?? [],
        featureCatalog: workspace.featureCatalog,
        newGrants: drafts,
        roles: workspace.roles,
        zones: workspace.zones,
      }),
    [account?.grants, drafts, workspace],
  );
  const effectiveGrantCount = countEffectiveGrants(account, drafts.length);
  const hasChanges = isCreate || isDirty || drafts.length > 0;
  const accountantRoleIds = findAccountantRoleIds(workspace);
  const unavailableRoleIds = findUnavailableRoleIds(
    accountantRoleIds,
    workspace,
    account?.id,
  );

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

  if (!isInternal && account) {
    return <ProtectedOwnerAccountSummary account={account} embedded={embedded} />;
  }

  return (
    <section
      className={
        embedded
          ? "min-w-0"
          : "min-w-0 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6"
      }
    >
      {(!embedded || !isCreate) && (
        <AccountEditorHeader
          account={account}
          embedded={embedded}
          onResetPassword={() => lifecycle.setResetDialogOpen(true)}
          onToggleLock={() =>
            lifecycle.setAction(account?.status === "active" ? "lock" : "unlock")
          }
        />
      )}

      <AccountEditorStepIndicator isCreate={isCreate} step={step} />

      {feedback && (
        <AccountEditorFeedbackBanner
          duplicateAccountId={duplicateAccountId}
          feedback={feedback}
          onOpenExisting={onOpenExisting}
        />
      )}

      {step === "edit" ? (
        <AccountEditorEditStep
          account={account}
          accountantRoleIds={accountantRoleIds}
          drafts={drafts}
          errors={errors}
          grantError={grantError}
          hasChanges={hasChanges}
          onDraftsChange={(nextDrafts) => {
            setDrafts(nextDrafts);
            setGrantError("");
          }}
          onRevoke={lifecycle.setGrantToRevoke}
          onSubmit={() => void continueToPreview()}
          register={register}
          unavailableRoleIds={unavailableRoleIds}
          workspace={workspace}
        />
      ) : (
        <AccountEditorPreviewStep
          account={account}
          catalog={workspace.featureCatalog}
          isSaving={isSaving}
          onBack={() => setStep("edit")}
          onConfirm={() => void saveAccount()}
          preview={preview}
          values={getValues()}
        />
      )}

      <AccountLifecycleDialogs lifecycle={lifecycle} />
    </section>
  );
}
