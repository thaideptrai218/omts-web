"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { useEffect, useRef, useState } from "react";
import { PasswordField } from "@/components/form/password-field";
import { Button } from "@/components/ui/button";
import { getChangePasswordFeedback } from "@/features/account-security/components/change-password-feedback";
import { PasswordRuleChecklist } from "@/features/account-security/components/password-rule-checklist";
import type {
  CurrentPasswordChangeInput,
  CurrentPasswordChangeResult,
} from "@/features/account-security/domain/change-password";
import type { PasswordChangeMode } from "@/features/account-security/domain/password-change-mode";
import {
  currentPasswordChangeSchema,
  type CurrentPasswordChangeFormValues,
} from "@/features/account-security/schemas/change-password-schema";
import { formatMessage, type AppMessage } from "@/shared/messages/message-catalog";

type ChangePasswordFormProps = Readonly<{
  changePassword(
    input: CurrentPasswordChangeInput,
  ): Promise<CurrentPasswordChangeResult>;
  mode: PasswordChangeMode;
  onPendingChange?(pending: boolean): void;
  onChanged(message: AppMessage & { code: "MSG18" }): Promise<void> | void;
  onSessionExpired(
    message: AppMessage & { code: "MSG19" },
  ): Promise<void> | void;
}>;

export function ChangePasswordForm({
  changePassword,
  mode,
  onPendingChange,
  onChanged,
  onSessionExpired,
}: ChangePasswordFormProps) {
  const [formError, setFormError] = useState<string>();
  const lifetime = useRef<{ active: boolean; pending: boolean } | null>(null);
  useEffect(() => {
    const scope = { active: true, pending: false };
    lifetime.current = scope;
    return () => { scope.active = false; };
  }, []);
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setError,
    setFocus,
  } = useForm<CurrentPasswordChangeFormValues>({
    defaultValues: {
      confirmPassword: "",
      currentPassword: "",
      newPassword: "",
    },
    resolver: zodResolver(currentPasswordChangeSchema),
  });
  useEffect(() => {
    if (isSubmitting) return;
    const field = errors.currentPassword ? "currentPassword"
      : errors.newPassword ? "newPassword" : errors.confirmPassword ? "confirmPassword" : undefined;
    if (field) setFocus(field);
  }, [errors.currentPassword, errors.newPassword, errors.confirmPassword, isSubmitting, setFocus]);
  const newPassword = useWatch({ control, name: "newPassword" });
  const ruleChecklistId = `${mode}-password-rules`;

  async function submit(values: CurrentPasswordChangeFormValues, scope: { active: boolean; pending: boolean }) {
    if (!scope.active || scope.pending) return;
    scope.pending = true;
    onPendingChange?.(true);
    setFormError(undefined);
    try {
      const result = await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      if (!scope.active) return;
      const feedback = getChangePasswordFeedback(result);

      if (feedback.kind === "field-error") {
        setError(feedback.field, { message: feedback.message }, { shouldFocus: true });
        return;
      }

      reset();

      if (feedback.kind === "session-expired") {
        await onSessionExpired(feedback.message);
        return;
      }

      await onChanged(feedback.message);
    } catch {
      if (scope.active) setFormError(formatMessage({ code: "MSG04" }));
    } finally {
      scope.pending = false;
      if (scope.active) onPendingChange?.(false);
    }
  }

  return (
    <form noValidate onSubmit={(event) => {
      const scope = lifetime.current;
      void handleSubmit((values) => { if (scope?.active) return submit(values, scope); })(event);
    }}>
      <fieldset disabled={isSubmitting} className="min-w-0 space-y-5">
        <PasswordField
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          hint={
            mode === "forced"
              ? "Nhập lại mật khẩu tạm thời bạn vừa dùng để đăng nhập."
              : "Dùng mật khẩu hiện đang bảo vệ tài khoản."
          }
          id={`${mode}-current-password`}
          label={mode === "forced" ? "Mật khẩu tạm thời" : "Mật khẩu hiện tại"}
          required
          {...register("currentPassword")}
        />

        <div>
          <PasswordField
            aria-describedby={ruleChecklistId}
            autoComplete="new-password"
            error={errors.newPassword?.message}
            id={`${mode}-new-password`}
            label="Mật khẩu mới"
            required
            {...register("newPassword")}
          />
          <PasswordRuleChecklist id={ruleChecklistId} password={newPassword} />
        </div>

        <PasswordField
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          id={`${mode}-confirm-password`}
          label="Nhập lại mật khẩu mới"
          required
          {...register("confirmPassword")}
        />

        {formError && <p role="alert" className="rounded-control border border-danger/30 bg-danger/10 p-3 text-sm leading-6 text-danger">{formError}</p>}
        <Button
          isPending={isSubmitting}
          pendingLabel="Đang kiểm tra..."
          type="submit"
        >
          {mode === "forced" ? "Đặt mật khẩu mới" : "Đổi mật khẩu"}
        </Button>
      </fieldset>
    </form>
  );
}
