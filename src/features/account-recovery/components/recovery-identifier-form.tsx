"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";

import { FormField } from "@/components/form/form-field";
import { Button } from "@/components/ui/button";
import { RecoveryChannelSelector } from "@/features/account-recovery/components/recovery-channel-selector";
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
  channel: "email",
  identifier: "",
};

export function RecoveryIdentifierForm({
  formError,
  initialValues = defaultValues,
  onSubmit,
}: RecoveryIdentifierFormProps) {
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setValue,
  } = useForm<RecoveryIdentifierFormValues>({
    defaultValues: initialValues,
    resolver: zodResolver(recoveryIdentifierSchema),
  });
  const channel = useWatch({ control, name: "channel" });
  const isEmail = channel === "email";

  return (
    <form className="space-y-5" noValidate onSubmit={handleSubmit(onSubmit)}>
      <RecoveryChannelSelector
        disabled={isSubmitting}
        onChange={(nextChannel) => {
          setValue("channel", nextChannel, { shouldValidate: false });
          setValue("identifier", "", { shouldValidate: false });
        }}
        value={channel}
      />

      <FormField
        autoCapitalize="none"
        autoComplete={isEmail ? "email" : "tel"}
        error={errors.identifier?.message}
        hint={
          isEmail
            ? "Nhập email đã được xác minh trên tài khoản."
            : "Nhập số điện thoại đã được xác minh trên tài khoản."
        }
        id="recovery-identifier"
        inputMode={isEmail ? "email" : "tel"}
        key={channel}
        label={isEmail ? "Email" : "Số điện thoại"}
        required
        spellCheck={false}
        type={isEmail ? "email" : "tel"}
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
