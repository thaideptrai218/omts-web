"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { PasswordField } from "@/components/form/password-field";
import { Button } from "@/components/ui/button";
import { getChangePasswordFeedback } from "@/features/account-security/components/change-password-feedback";
import { PasswordRuleChecklist } from "@/features/account-security/components/password-rule-checklist";
import type {
  CurrentPasswordChangeInput,
  CurrentPasswordChangeResult,
} from "@/features/account-security/domain/change-password";
import type { PasswordChangeMode } from "@/features/account-security/domain/password-policy";
import {
  currentPasswordChangeSchema,
  type CurrentPasswordChangeFormValues,
} from "@/features/account-security/schemas/change-password-schema";
import type { AppMessage } from "@/shared/messages/message-catalog";

type ChangePasswordFormProps = Readonly<{
  changePassword(
    input: CurrentPasswordChangeInput,
  ): Promise<CurrentPasswordChangeResult>;
  mode: PasswordChangeMode;
  onChanged(message: AppMessage & { code: "MSG18" }): Promise<void> | void;
  onSessionExpired(
    message: AppMessage & { code: "MSG19" },
  ): Promise<void> | void;
}>;

export function ChangePasswordForm({
  changePassword,
  mode,
  onChanged,
  onSessionExpired,
}: ChangePasswordFormProps) {
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setError,
  } = useForm<CurrentPasswordChangeFormValues>({
    defaultValues: {
      confirmPassword: "",
      currentPassword: "",
      newPassword: "",
    },
    resolver: zodResolver(currentPasswordChangeSchema),
  });
  const newPassword = useWatch({ control, name: "newPassword" });
  const ruleChecklistId = `${mode}-password-rules`;

  async function submit(values: CurrentPasswordChangeFormValues) {
    const result = await changePassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    });
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
  }

  return (
    <form className="space-y-5" noValidate onSubmit={handleSubmit(submit)}>
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

      <Button
        isPending={isSubmitting}
        pendingLabel="Đang kiểm tra..."
        type="submit"
      >
        {mode === "forced" ? "Đặt mật khẩu mới" : "Đổi mật khẩu"}
      </Button>
    </form>
  );
}
