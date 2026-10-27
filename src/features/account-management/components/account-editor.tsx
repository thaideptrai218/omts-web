"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AccessGrantEditor } from "@/features/account-management/components/access-grant-editor";
import { EffectivePermissionPreview } from "@/features/account-management/components/effective-permission-preview";
import { ReasonConfirmDialog } from "@/features/account-management/components/reason-confirm-dialog";
import type {
  AccessGrant,
  AccountAction,
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

type EditorStep = "edit" | "preview";

const inputStyles =
  "mt-2 min-h-12 w-full rounded-control border border-border-strong bg-surface px-3 text-text disabled:bg-surface-subtle disabled:text-text-muted";

function initialValues(account?: ManagedAccount): AccountEditorValues {
  return {
    deliveryChannel: account?.credentialDeliveryChannel ?? "phone",
    email: account?.email ?? "",
    fullName: account?.displayName ?? "",
    phone: account?.phone ?? "",
  };
}

export function AccountEditor({
  account,
  embedded = false,
  onDelivery,
  onOpenExisting,
  onSaved,
  onPendingChange,
  workspace,
}: AccountEditorProps) {
  const [step, setStep] = useState<EditorStep>("edit");
  const [drafts, setDrafts] = useState<readonly GrantDraft[]>([]);
  const [grantError, setGrantError] = useState("");
  const [feedback, setFeedback] = useState<
    Readonly<{ text: string; tone: "danger" | "success" }> | undefined
  >();
  const [isSaving, setIsSaving] = useState(false);
  const [action, setAction] = useState<AccountAction>();
  const [grantToRevoke, setGrantToRevoke] = useState<AccessGrant>();
  const [isActionPending, setIsActionPending] = useState(false);
  useEffect(() => {
    onPendingChange?.(isSaving || isActionPending);
  }, [isSaving, isActionPending, onPendingChange]);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [duplicateAccountId, setDuplicateAccountId] = useState<string>();

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
    defaultValues: initialValues(account),
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
  const effectiveGrantCount =
    (account?.grants.filter((grant) => grant.status === "effective").length ??
      0) + drafts.length;
  const hasChanges = isCreate || isDirty || drafts.length > 0;

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
    }
  });

  async function confirmStatusChange(reason: string) {
    if (!account || !action) return;
    setIsActionPending(true);
    try {
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
    } catch {
      setFeedback({
        text: "Chưa thể thay đổi trạng thái tài khoản.",
        tone: "danger",
      });
    } finally {
      setIsActionPending(false);
    }
  }

  async function confirmRevoke(reason: string) {
    if (!account || !grantToRevoke) return;
    setIsActionPending(true);
    try {
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
    } catch {
      setFeedback({ text: "Chưa thể thu hồi quyền truy cập.", tone: "danger" });
    } finally {
      setIsActionPending(false);
    }
  }

  async function resetPassword() {
    if (!account) return;
    setIsActionPending(true);
    try {
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
    } catch {
      setFeedback({ text: "Chưa thể đặt lại mật khẩu.", tone: "danger" });
    } finally {
      setIsActionPending(false);
    }
  }

  if (!isInternal && account) {
    return (
      <section
        className={
          embedded
            ? "min-w-0"
            : "rounded-card border border-border bg-surface p-5 shadow-card sm:p-6"
        }
      >
        <p className="text-sm font-semibold text-primary">
          Tài khoản Chủ hợp tác xã
        </p>
        {!embedded && (
          <h2 className="mt-2 text-2xl font-semibold text-text">
            {account.displayName}
          </h2>
        )}
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-text-muted">Tên đăng nhập</dt>
            <dd className="mt-1 font-semibold">@{account.username}</dd>
          </div>
          <div>
            <dt className="text-sm text-text-muted">Loại tài khoản</dt>
            <dd className="mt-1 font-semibold">Chủ hợp tác xã</dd>
          </div>
          <div>
            <dt className="text-sm text-text-muted">Số điện thoại</dt>
            <dd className="mt-1 font-semibold">{account.phone}</dd>
          </div>
          <div>
            <dt className="text-sm text-text-muted">Trạng thái</dt>
            <dd className="mt-1 font-semibold">Hoạt động</dd>
          </div>
        </dl>
        <p className="mt-6 rounded-card border border-info/20 bg-sky-50 p-4 leading-7 text-info">
          Tài khoản này được bảo vệ và không thể chỉnh sửa hoặc khóa tại màn
          quản lý tài khoản nội bộ. Chủ hợp tác xã tự cập nhật thông tin liên hệ
          trong hồ sơ cá nhân.
        </p>
      </section>
    );
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
        <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
          {!embedded && (
            <div>
              <p className="text-sm font-semibold text-primary">
                {isCreate ? "Tài khoản mới" : "Chi tiết tài khoản"}
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-text">
                {isCreate ? "Thêm tài khoản nội bộ" : account.displayName}
              </h2>
              {!isCreate && (
                <p className="mt-2 text-sm text-text-muted">
                  @{account.username} ·{" "}
                  {account.status === "active" ? "Đang hoạt động" : "Đã khóa"}
                </p>
              )}
            </div>
          )}
          {!isCreate && (
            <div className="grid w-full gap-2 sm:ml-auto sm:w-auto sm:grid-cols-2">
              <Button
                onClick={() => setResetDialogOpen(true)}
                variant="secondary"
              >
                Đặt lại mật khẩu
              </Button>
              <Button
                onClick={() =>
                  setAction(account.status === "active" ? "lock" : "unlock")
                }
                variant={account.status === "active" ? "danger" : "secondary"}
              >
                {account.status === "active" ? "Khóa" : "Mở khóa"}
              </Button>
            </div>
          )}
        </div>
      )}

      <ol
        aria-label={isCreate ? "Các bước tạo tài khoản" : "Các bước cập nhật tài khoản"}
        className="mt-5 grid gap-2 sm:grid-cols-2"
      >
        <li
          className={`rounded-control border px-3 py-2 text-sm font-semibold ${step === "edit" ? "border-primary bg-primary-soft text-primary-hover" : "border-border text-text-muted"}`}
        >
          1. Thông tin và quyền
        </li>
        <li
          className={`rounded-control border px-3 py-2 text-sm font-semibold ${step === "preview" ? "border-primary bg-primary-soft text-primary-hover" : "border-border text-text-muted"}`}
        >
          2. Xem trước và xác nhận
        </li>
      </ol>

      {feedback && (
        <div
          aria-live="polite"
          className={`mt-5 rounded-control border p-3 text-sm font-medium ${feedback.tone === "success" ? "border-emerald-200 bg-emerald-50 text-success" : "border-rose-200 bg-rose-50 text-danger"}`}
          role={feedback.tone === "danger" ? "alert" : "status"}
        >
          <p>{feedback.text}</p>
          {duplicateAccountId && (
            <button
              className="mt-2 min-h-11 rounded-control px-3 font-semibold underline underline-offset-4 hover:bg-white/60"
              onClick={() => onOpenExisting(duplicateAccountId)}
              type="button"
            >
              Mở tài khoản hiện có
            </button>
          )}
        </div>
      )}

      {step === "edit" ? (
        <form
          className="mt-6 space-y-7"
          onSubmit={(event) => {
            event.preventDefault();
            void continueToPreview();
          }}
        >
          <fieldset className="min-w-0">
            <legend className="text-lg font-semibold text-text">
              Thông tin tài khoản
            </legend>
            <p className="mt-1 text-sm leading-6 text-text-muted">
              Nhập ít nhất email hoặc số điện thoại. Nhân viên sẽ xác minh một
              trong các liên hệ này khi thiết lập tài khoản.
            </p>
            <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2">
              <label className="min-w-0 text-sm font-semibold text-text">
                Họ và tên nhân viên <span className="text-danger">*</span>
                <input
                  aria-invalid={Boolean(errors.fullName)}
                  className={inputStyles}
                  {...register("fullName")}
                />
                {errors.fullName && (
                  <span className="mt-2 block font-normal text-danger">
                    {errors.fullName.message}
                  </span>
                )}
              </label>
              {!isCreate && (
                <div className="min-w-0 text-sm font-semibold text-text">
                  Tên đăng nhập
                  <p className={`${inputStyles} flex items-center`}>
                    @{account.username}
                  </p>
                  <p className="mt-2 font-normal leading-5 text-text-muted">
                    Username không đổi khi họ tên được cập nhật.
                  </p>
                </div>
              )}
              <label className="min-w-0 text-sm font-semibold text-text">
                Số điện thoại
                <input
                  aria-invalid={Boolean(errors.phone)}
                  className={inputStyles}
                  inputMode="tel"
                  {...register("phone")}
                />
                {errors.phone && (
                  <span className="mt-2 block font-normal text-danger">
                    {errors.phone.message}
                  </span>
                )}
              </label>
              <label className="min-w-0 text-sm font-semibold text-text">
                Email
                <input
                  aria-invalid={Boolean(errors.email)}
                  autoCapitalize="none"
                  className={inputStyles}
                  type="email"
                  {...register("email")}
                />
                {errors.email && (
                  <span className="mt-2 block font-normal text-danger">
                    {errors.email.message}
                  </span>
                )}
              </label>
            </div>
            {isCreate && (
              <fieldset className="mt-5">
                <legend className="text-sm font-semibold text-text">
                  Gửi thông tin kích hoạt qua
                </legend>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <label className="flex min-h-12 flex-1 cursor-pointer items-center gap-3 rounded-control border border-border-strong px-4 py-3">
                    <input
                      type="radio"
                      value="phone"
                      {...register("deliveryChannel")}
                    />
                    <span>SMS</span>
                  </label>
                  <label className="flex min-h-12 flex-1 cursor-pointer items-center gap-3 rounded-control border border-border-strong px-4 py-3">
                    <input
                      type="radio"
                      value="email"
                      {...register("deliveryChannel")}
                    />
                    <span>Email</span>
                  </label>
                </div>
                {errors.deliveryChannel && (
                  <p className="mt-2 text-sm text-danger">
                    {errors.deliveryChannel.message}
                  </p>
                )}
                <p className="mt-2 text-sm leading-6 text-text-muted">
                  Hệ thống tự sinh username và mật khẩu tạm, sau đó gửi trực
                  tiếp cho nhân viên. Chủ HTX không nhìn thấy mật khẩu.
                </p>
              </fieldset>
            )}
          </fieldset>

          <div
            className="min-w-0 outline-none"
            id="account-grants"
            tabIndex={-1}
          >
            <AccessGrantEditor
              currentGrants={account?.grants ?? []}
              drafts={drafts}
              error={grantError}
              onChange={(nextDrafts) => {
                setDrafts(nextDrafts);
                setGrantError("");
              }}
              onRevoke={setGrantToRevoke}
              roles={workspace.roles}
              zones={workspace.zones}
            />
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
            <Button className="sm:w-auto" disabled={!hasChanges} type="submit">
              Xem quyền hiệu lực
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-6 space-y-6">
          <div>
            <p className="text-sm font-semibold text-primary">
              Kiểm tra trước khi lưu
            </p>
            <h3
              className="mt-1 text-xl font-semibold text-text outline-none"
              id="permission-preview-heading"
              tabIndex={-1}
            >
              Quyền hiệu lực theo từng vùng
            </h3>
            <p className="mt-2 leading-7 text-text-muted">
              Đây là hợp quyền từ tất cả vai trò của tài khoản trong từng vùng,
              không phải một role toàn cục.
            </p>
          </div>
          <EffectivePermissionPreview
            catalog={workspace.featureCatalog}
            zones={preview}
          />
          <div className="rounded-card border border-border bg-surface-subtle p-4">
            <p className="font-semibold text-text">
              {getValues("fullName")}
              {account ? ` · @${account.username}` : ""}
            </p>
            <p className="mt-1 text-sm text-text-muted">
              {getValues("phone")}
              {getValues("phone") && getValues("email") ? " · " : ""}
              {getValues("email")}
            </p>
            {isCreate && (
              <p className="mt-2 text-sm font-medium text-primary">
                Thông tin kích hoạt sẽ được gửi qua{" "}
                {getValues("deliveryChannel") === "email" ? "email" : "SMS"}.
              </p>
            )}
          </div>
          <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
            <Button
              className="sm:w-auto"
              disabled={isSaving}
              onClick={() => setStep("edit")}
              variant="secondary"
            >
              Quay lại chỉnh sửa
            </Button>
            <Button
              className="sm:w-auto"
              isPending={isSaving}
              onClick={() => void saveAccount()}
              pendingLabel="Đang lưu..."
            >
              Xác nhận và lưu
            </Button>
          </div>
        </div>
      )}

      {action && (
        <ReasonConfirmDialog
          confirmLabel={action === "lock" ? "Khóa tài khoản" : "Mở khóa"}
          description={formatMessage({
            code: "MSG09",
            params: {
              action:
                action === "lock" ? "khóa tài khoản" : "mở khóa tài khoản",
            },
          })}
          isPending={isActionPending}
          onConfirm={(reason) => void confirmStatusChange(reason)}
          onOpenChange={(open) => {
            if (!open) setAction(undefined);
          }}
          open
          title={action === "lock" ? "Khóa tài khoản" : "Mở khóa tài khoản"}
          tone={action === "lock" ? "danger" : "primary"}
        />
      )}
      {grantToRevoke && (
        <ReasonConfirmDialog
          confirmLabel="Thu hồi quyền"
          description={formatMessage({
            code: "MSG09",
            params: { action: "thu hồi quyền truy cập này" },
          })}
          isPending={isActionPending}
          onConfirm={(reason) => void confirmRevoke(reason)}
          onOpenChange={(open) => {
            if (!open) setGrantToRevoke(undefined);
          }}
          open
          title="Thu hồi quyền truy cập"
          tone="danger"
        />
      )}
      <ConfirmDialog
        confirmLabel="Đặt lại mật khẩu"
        description={formatMessage({
          code: "MSG09",
          params: { action: "đặt lại mật khẩu tài khoản" },
        })}
        isPending={isActionPending}
        onConfirm={() => void resetPassword()}
        onOpenChange={setResetDialogOpen}
        open={resetDialogOpen}
        title="Tạo mật khẩu tạm thời mới"
      />
    </section>
  );
}
