"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/ui/toast-provider";
import { LoginForm } from "@/features/auth/components/login-form";
import type { LoginFormValues } from "@/features/auth/schemas/login-schema";
import { useAuth } from "@/features/auth/state/auth-provider";
import { ApiError } from "@/shared/http/api-error";
import { formatMessage } from "@/shared/messages/message-catalog";

function getLoginErrorMessage(error: unknown): string {
  const message =
    error instanceof ApiError ? error.appMessage : { code: "MSG04" as const };

  return formatMessage(message);
}

export function LoginExperience() {
  const { login } = useAuth();
  const router = useRouter();
  const { notify } = useToast();
  const [formError, setFormError] = useState<string>();

  async function handleSubmit(values: LoginFormValues) {
    setFormError(undefined);

    try {
      const result = await login(values);

      if (result.status === "rejected") {
        setFormError(formatMessage(result.message));
        return;
      }

      notify({ title: "Đăng nhập thành công.", tone: "success" });
      router.replace("/dashboard");
    } catch (error) {
      setFormError(getLoginErrorMessage(error));
    }
  }

  return (
    <>
      <LoginForm formError={formError} onSubmit={handleSubmit} />

      <details className="mt-5 rounded-control border border-border bg-surface-subtle px-4 py-3 text-sm text-text-muted">
        <summary className="cursor-pointer font-semibold text-text">
          Thông tin đăng nhập bản mock
        </summary>
        <p className="mt-2 leading-6">
          Tên đăng nhập <strong>owner</strong>, mật khẩu <strong>demo123</strong>.
        </p>
      </details>
    </>
  );
}
