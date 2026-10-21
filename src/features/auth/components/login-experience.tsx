"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useToast } from "@/components/ui/toast-provider";
import { LoginForm } from "@/features/auth/components/login-form";
import { PostLoginGatePanel } from "@/features/auth/components/post-login-gate-panel";
import { StaffOnboardingShell } from "@/features/auth/components/staff-onboarding-shell";
import type { PostLoginGate } from "@/features/auth/domain/auth-types";
import {
  grantsApplicationAccess,
  requiresPostLoginGate,
} from "@/features/auth/domain/login-result";
import { staffOnboardingVerificationService } from "@/features/auth/services/auth-service.instance";
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
  const {
    changeTemporaryPassword,
    completeStaffOnboarding,
    login,
    startStaffContactVerification,
  } = useAuth();
  const router = useRouter();
  const { notify } = useToast();
  const [formError, setFormError] = useState<string>();
  const [postLoginGate, setPostLoginGate] = useState<
    Readonly<{ gate: PostLoginGate; identifier: string }>
  >();

  async function handleSubmit(values: LoginFormValues) {
    setFormError(undefined);

    try {
      const result = await login(values);

      if (result.status === "rejected") {
        setFormError(formatMessage(result.message));
        return;
      }

      if (requiresPostLoginGate(result)) {
        setPostLoginGate({
          gate: result,
          identifier: values.identifier.trim(),
        });
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
    if (postLoginGate.gate.status === "staff-onboarding-required") {
      return (
        <StaffOnboardingShell
          changeTemporaryPassword={changeTemporaryPassword}
          completeStaffOnboarding={completeStaffOnboarding}
          gate={postLoginGate.gate}
          identifier={postLoginGate.identifier}
          onGateChanged={(gate) =>
            setPostLoginGate((current) =>
              current ? { ...current, gate } : current,
            )
          }
          onOnboardingCompleted={() => {
            notify({
              title: "Tài khoản đã được xác minh và sẵn sàng sử dụng.",
              tone: "success",
            });
            router.replace("/dashboard");
          }}
          onPasswordChanged={(message) =>
            notify({ title: formatMessage(message), tone: "success" })
          }
          onSessionExpired={(message) => {
            setPostLoginGate(undefined);
            notify({ title: formatMessage(message), tone: "danger" });
          }}
          onUseAnotherAccount={() => {
            setPostLoginGate(undefined);
            setFormError(undefined);
          }}
          startContactVerification={startStaffContactVerification}
          verificationService={staffOnboardingVerificationService}
        />
      );
    }

    return (
      <PostLoginGatePanel
        gate={postLoginGate.gate}
        onUseAnotherAccount={() => {
          setPostLoginGate(undefined);
          setFormError(undefined);
        }}
      />
    );
  }

  return (
    <>
      <LoginForm formError={formError} onSubmit={handleSubmit} />
      <p className="mt-5 text-center text-sm text-text-muted">
        <Link className="font-semibold text-primary hover:underline" href="/recover">
          Quên mật khẩu?
        </Link>
      </p>
    </>
  );
}
