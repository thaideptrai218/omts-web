"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { FormField } from "@/components/form/form-field";
import { PasswordField } from "@/components/form/password-field";
import { Button } from "@/components/ui/button";
import {
  loginSchema,
  type LoginFormValues,
} from "@/features/auth/schemas/login-schema";

type LoginFormProps = {
  formError?: string;
  onSubmit: (values: LoginFormValues) => Promise<boolean>;
};

export function LoginForm({ formError, onSubmit }: LoginFormProps) {
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<LoginFormValues>({
    defaultValues: {
      identifier: "",
      password: "",
    },
    resolver: zodResolver(loginSchema),
  });

  return (
    <form className="mt-7 space-y-5" noValidate onSubmit={handleSubmit(async (values) => {
      if (await onSubmit(values)) reset({ identifier: "", password: "" });
    })}>
      <FormField
        autoComplete="username"
        autoCapitalize="none"
        error={errors.identifier?.message}
        hint="Số điện thoại hoặc email cần được xác minh. Nhân viên lần đầu dùng tên đăng nhập."
        id="identifier"
        label="Tên đăng nhập, số điện thoại hoặc email"
        required
        spellCheck={false}
        {...register("identifier")}
      />

      <PasswordField
        autoComplete="current-password"
        error={errors.password?.message}
        id="password"
        label="Mật khẩu"
        required
        {...register("password")}
      />

      {formError && (
        <p className="rounded-control border border-rose-200 bg-rose-50 p-3 text-sm text-danger" role="alert">
          {formError}
        </p>
      )}

      <Button isPending={isSubmitting} pendingLabel="Đang đăng nhập..." type="submit">
        Đăng nhập
      </Button>
    </form>
  );
}
