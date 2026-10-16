"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/ui/toast-provider";
import { LoginForm } from "@/features/auth/components/login-form";
import { PostLoginGatePanel } from "@/features/auth/components/post-login-gate-panel";
import type { PostLoginGate } from "@/features/auth/domain/auth-types";
import {
  grantsApplicationAccess,
  requiresPostLoginGate,
} from "@/features/auth/domain/login-result";
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
  const [postLoginGate, setPostLoginGate] = useState<PostLoginGate>();

  async function handleSubmit(values: LoginFormValues) {
    setFormError(undefined);

    try {
      const result = await login(values);

      if (result.status === "rejected") {
        setFormError(formatMessage(result.message));
        return;
      }

      if (requiresPostLoginGate(result)) {
        setPostLoginGate(result);
        return;
      }

      if (!grantsApplicationAccess(result)) return;

      notify({ title: "Đăng nhập thành công.", tone: "success" });
      router.replace("/dashboard");
    } catch (error) {
      setFormError(getLoginErrorMessage(error));
    }
  }

  if (postLoginGate) {
    return (
      <PostLoginGatePanel
        gate={postLoginGate}
        onUseAnotherAccount={() => {
          setPostLoginGate(undefined);
          setFormError(undefined);
        }}
      />
    );
  }

  return <LoginForm formError={formError} onSubmit={handleSubmit} />;
}
