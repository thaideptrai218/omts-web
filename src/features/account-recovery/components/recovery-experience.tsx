"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useToast } from "@/components/ui/toast-provider";
import { RecoveryFlowShell } from "@/features/account-recovery/components/recovery-flow-shell";
import { RecoveryIdentifierForm } from "@/features/account-recovery/components/recovery-identifier-form";
import { RecoveryPasswordForm } from "@/features/account-recovery/components/recovery-password-form";
import type { RecoveryChallenge } from "@/features/account-recovery/domain/account-recovery";
import type { RecoveryStep } from "@/features/account-recovery/domain/recovery-step";
import type { RecoveryIdentifierFormValues } from "@/features/account-recovery/schemas/recovery-identifier-schema";
import type { RecoveryPasswordFormValues } from "@/features/account-recovery/schemas/recovery-password-schema";
import { mockAccountRecoveryEnvironment } from "@/features/account-recovery/services/account-recovery-service.instance";
import { VerificationForm } from "@/features/verification/components/verification-form";
import type { VerificationToken } from "@/features/verification/domain/verification-types";
import { formatMessage } from "@/shared/messages/message-catalog";

const stepContent: Record<
  RecoveryStep,
  Readonly<{ description: string; title: string }>
> = {
  identifier: {
    description:
      "Chọn cách nhận mã và nhập thông tin đã được xác minh trên tài khoản.",
    title: "Khôi phục tài khoản",
  },
  "new-password": {
    description:
      "Tạo mật khẩu mới đủ mạnh. Bạn sẽ đăng nhập lại sau khi hoàn tất.",
    title: "Đặt mật khẩu mới",
  },
  verification: {
    description: "Nhập mã gồm 6 chữ số để tiếp tục.",
    title: "Xác minh thông tin",
  },
};

export function RecoveryExperience() {
  const router = useRouter();
  const { notify } = useToast();
  const [activeStep, setActiveStep] = useState<RecoveryStep>("identifier");
  const [challenge, setChallenge] = useState<RecoveryChallenge>();
  const [identifierError, setIdentifierError] = useState<string>();
  const [identifierValues, setIdentifierValues] =
    useState<RecoveryIdentifierFormValues>();
  const [isChangingIdentifier, setIsChangingIdentifier] = useState(false);
  const [passwordError, setPasswordError] = useState<string>();
  const [newPasswordError, setNewPasswordError] = useState<string>();
  const [verificationError, setVerificationError] = useState<string>();
  const [verificationToken, setVerificationToken] = useState<VerificationToken>();
  const content = stepContent[activeStep];

  async function handleStart(values: RecoveryIdentifierFormValues) {
    setIdentifierError(undefined);

    try {
      const normalizedValues = {
        ...values,
        identifier: values.identifier.trim(),
      };
      const result = await mockAccountRecoveryEnvironment.accountRecoveryService.start(
        normalizedValues,
      );
      setIdentifierValues(normalizedValues);
      setChallenge(result.challenge);
      setActiveStep("verification");
    } catch {
      setIdentifierError(formatMessage({ code: "MSG04" }));
    }
  }

  async function handleChangeIdentifier() {
    if (!challenge || isChangingIdentifier) return;

    setVerificationError(undefined);
    setIsChangingIdentifier(true);
    try {
      await mockAccountRecoveryEnvironment.accountRecoveryService.cancel(
        challenge.requestId,
      );
      setChallenge(undefined);
      setVerificationToken(undefined);
      setActiveStep("identifier");
    } catch {
      setVerificationError(formatMessage({ code: "MSG04" }));
    } finally {
      setIsChangingIdentifier(false);
    }
  }

  async function handleResetPassword(values: RecoveryPasswordFormValues) {
    if (!verificationToken) {
      setPasswordError(formatMessage({ code: "MSG16" }));
      return;
    }

    setPasswordError(undefined);
    setNewPasswordError(undefined);

    try {
      const result =
        await mockAccountRecoveryEnvironment.accountRecoveryService.resetPassword({
          newPassword: values.newPassword,
          verificationToken,
        });

      if (result.status === "rejected") {
        if (result.reason === "invalid-new-password") {
          setNewPasswordError(formatMessage(result.message));
        } else {
          setPasswordError(formatMessage(result.message));
        }
        return;
      }

      setVerificationToken(undefined);
      notify({
        title: "Mật khẩu đã được đặt lại. Bạn có thể đăng nhập.",
        tone: "success",
      });
      router.replace("/login");
    } catch {
      setPasswordError(formatMessage({ code: "MSG04" }));
    }
  }

  return (
    <div>
      <RecoveryFlowShell
        activeStep={activeStep}
        description={content.description}
        title={content.title}
      >
        {activeStep === "identifier" && (
          <RecoveryIdentifierForm
            formError={identifierError}
            initialValues={identifierValues}
            onSubmit={handleStart}
          />
        )}

        {activeStep === "verification" && challenge && (
          <div className="space-y-5">
            <div
              className="rounded-card border border-info/20 bg-info-soft p-4 text-sm leading-6 text-text"
              role="status"
            >
              <p>{formatMessage({ code: "MSG15" })}</p>
              <p className="mt-2 font-semibold">
                Đích nhận mã: {challenge.recipient.maskedValue}
              </p>
            </div>

            {verificationError && (
              <p
                className="rounded-control border border-danger/30 bg-danger/10 p-3 text-sm text-danger"
                role="alert"
              >
                {verificationError}
              </p>
            )}

            <VerificationForm
              challenge={challenge}
              key={challenge.requestId}
              onChallengeChange={(nextChallenge) =>
                setChallenge({ ...nextChallenge, purpose: "recovery" })
              }
              onSecondaryAction={handleChangeIdentifier}
              onVerified={(token) => {
                setVerificationToken(token);
                setActiveStep("new-password");
              }}
              secondaryActionLabel={
                "Đổi cách nhận mã"
              }
              secondaryActionPending={isChangingIdentifier}
              secondaryActionPendingLabel="Đang hủy mã cũ..."
              service={mockAccountRecoveryEnvironment.verificationService}
            />
          </div>
        )}

        {activeStep === "new-password" && (
          <RecoveryPasswordForm
            formError={passwordError}
            newPasswordError={newPasswordError}
            onSubmit={handleResetPassword}
          />
        )}
      </RecoveryFlowShell>

      <p className="mt-5 text-center text-sm text-text-muted">
        Đã nhớ mật khẩu?{" "}
        <Link className="font-semibold text-primary hover:underline" href="/login">
          Quay lại đăng nhập
        </Link>
      </p>
    </div>
  );
}
