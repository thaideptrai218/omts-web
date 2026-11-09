"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { FormField } from "@/components/form/form-field";
import { Button } from "@/components/ui/button";
import {
  recoveryIdentifierSchema,
  type RecoveryIdentifierFormValues,
} from "@/features/account-recovery/schemas/recovery-identifier-schema";

type RecoveryIdentifierFormProps = Readonly<{
  formError?: string;
  initialValues?: RecoveryIdentifierFormValues;
  onSubmit(values: RecoveryIdentifierFormValues): Promise<void>;
}>;

const defaultValues: RecoveryIdentifierFormValues = {
  channel: "sms",
  identifier: "",
};

export function RecoveryIdentifierForm({
  formError,
  initialValues = defaultValues,
  onSubmit,
}: RecoveryIdentifierFormProps) {
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<RecoveryIdentifierFormValues>({
    defaultValues: initialValues,
    resolver: zodResolver(recoveryIdentifierSchema),
  });

  return (
    <form className="space-y-5" noValidate onSubmit={handleSubmit(onSubmit)}>
      <FormField
        autoCapitalize="none"
        autoComplete="tel"
        error={errors.identifier?.message}
        hint="Nhập số điện thoại đã được xác minh trên tài khoản. Mã được gửi qua tin nhắn SMS."
        id="recovery-identifier"
        inputMode="tel"
        label="Số điện thoại"
        required
        spellCheck={false}
        type="tel"
        {...register("identifier")}
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
        pendingLabel="Đang gửi yêu cầu..."
        type="submit"
      >
        Tiếp tục xác minh
      </Button>
    </form>
  );
}
