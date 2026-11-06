"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";

import { PasswordField } from "@/components/form/password-field";
import { Button } from "@/components/ui/button";
import { PasswordRuleChecklist } from "@/features/account-security/components/password-rule-checklist";
import {
  recoveryPasswordSchema,
  type RecoveryPasswordFormValues,
} from "@/features/account-recovery/schemas/recovery-password-schema";

type RecoveryPasswordFormProps = Readonly<{
  formError?: string;
  newPasswordError?: string;
  onSubmit(values: RecoveryPasswordFormValues): Promise<void>;
}>;

export function RecoveryPasswordForm({
  formError,
  newPasswordError,
  onSubmit,
}: RecoveryPasswordFormProps) {
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<RecoveryPasswordFormValues>({
    defaultValues: { confirmPassword: "", newPassword: "" },
    resolver: zodResolver(recoveryPasswordSchema),
  });
  const newPassword = useWatch({ control, name: "newPassword" });
  const ruleListId = "recovery-password-rules";

  return (
    <form className="space-y-5" noValidate onSubmit={handleSubmit(onSubmit)}>
      <div>
        <PasswordField
          aria-describedby={ruleListId}
          autoComplete="new-password"
          error={errors.newPassword?.message ?? newPasswordError}
          id="recovery-new-password"
          label="Mật khẩu mới"
          required
          {...register("newPassword")}
        />
        <PasswordRuleChecklist id={ruleListId} password={newPassword} />
      </div>

      <PasswordField
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        id="recovery-confirm-password"
        label="Nhập lại mật khẩu mới"
        required
        {...register("confirmPassword")}
      />

      {formError && (
        <p
          className="rounded-control border border-danger/30 bg-danger/10 p-3 text-sm leading-6 text-danger"
          role="alert"
        >
          {formError}
        </p>
      )}

      <Button
        isPending={isSubmitting}
        pendingLabel="Đang đổi mật khẩu..."
        type="submit"
      >
        Đặt mật khẩu mới
      </Button>
    </form>
  );
}
