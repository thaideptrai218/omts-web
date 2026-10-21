"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChangePasswordForm } from "@/features/account-security/components/change-password-form";
import type {
  CurrentPasswordChangeInput,
  CurrentPasswordChangeResult,
} from "@/features/account-security/domain/change-password";
import type {
  CompleteStaffOnboardingInput,
  CompleteStaffOnboardingResult,
  OnboardingContactChannel,
  StartStaffContactVerificationResult,
  StaffOnboardingRequired,
} from "@/features/auth/domain/auth-types";
import { grantsApplicationAccess } from "@/features/auth/domain/login-result";
import { completeStaffPasswordChange } from "@/features/auth/domain/staff-onboarding";
import { VerificationForm } from "@/features/verification/components/verification-form";
import type {
  VerificationChallenge,
  VerificationToken,
} from "@/features/verification/domain/verification-types";
import type { VerificationService } from "@/features/verification/services/verification-service";
import { formatMessage, type AppMessage } from "@/shared/messages/message-catalog";

type StaffOnboardingShellProps = Readonly<{
  changeTemporaryPassword(
    input: CurrentPasswordChangeInput,
  ): Promise<CurrentPasswordChangeResult>;
  completeStaffOnboarding(
    input: CompleteStaffOnboardingInput,
  ): Promise<CompleteStaffOnboardingResult>;
  gate: StaffOnboardingRequired;
  identifier: string;
  onGateChanged(gate: StaffOnboardingRequired): void;
  onOnboardingCompleted(): void;
  onPasswordChanged(message: AppMessage & { code: "MSG18" }): void;
  onSessionExpired(message: AppMessage & { code: "MSG19" }): void;
  onUseAnotherAccount(): void;
  startContactVerification(
    channel: OnboardingContactChannel,
  ): Promise<StartStaffContactVerificationResult>;
  verificationService: VerificationService;
}>;

function getChannelLabel(channel: OnboardingContactChannel) {
  return channel === "email" ? "email" : "số điện thoại";
}

function StepMarker({ completed, number }: Readonly<{ completed: boolean; number: number }>) {
  return (
    <span
      aria-hidden="true"
      className={`flex size-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold transition-colors ${
        completed
          ? "border-success bg-success text-white"
          : "border-primary bg-primary-soft text-primary"
      }`}
    >
      {completed ? "✓" : number}
    </span>
  );
}

export function StaffOnboardingShell({
  changeTemporaryPassword,
  completeStaffOnboarding,
  gate,
  identifier,
  onGateChanged,
  onOnboardingCompleted,
  onPasswordChanged,
  onSessionExpired,
  onUseAnotherAccount,
  startContactVerification,
  verificationService,
}: StaffOnboardingShellProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [challenge, setChallenge] = useState<VerificationChallenge>();
  const [contactError, setContactError] = useState<string>();
  const [isChangingChannel, setIsChangingChannel] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [startingChannel, setStartingChannel] =
    useState<OnboardingContactChannel>();
  const passwordChanged = gate.checklist.passwordChanged;

  useEffect(() => {
    headingRef.current?.focus();
  }, [gate.nextStep]);

  async function handleStartContactVerification(
    channel: OnboardingContactChannel,
  ) {
    setContactError(undefined);
    setStartingChannel(channel);

    try {
      const result = await startContactVerification(channel);
      if (result.status === "rejected") {
        if (result.message.code === "MSG19") {
          onSessionExpired({ code: "MSG19" });
        }
        else setContactError(formatMessage(result.message));
        return;
      }

      setChallenge(result.challenge);
    } catch {
      setContactError(formatMessage({ code: "MSG04" }));
    } finally {
      setStartingChannel(undefined);
    }
  }

  async function handleVerified(token: VerificationToken) {
    setContactError(undefined);
    setIsCompleting(true);

    try {
      const result = await completeStaffOnboarding({ verificationToken: token });
      if (grantsApplicationAccess(result)) {
        onOnboardingCompleted();
        return;
      }

      if (result.message.code === "MSG19") {
        onSessionExpired({ code: "MSG19" });
      }
      else setContactError(formatMessage(result.message));
    } catch {
      setContactError(formatMessage({ code: "MSG04" }));
    } finally {
      setIsCompleting(false);
    }
  }

  async function handleChangeChannel() {
    if (!challenge) return;

    setContactError(undefined);
    setIsChangingChannel(true);
    try {
      await verificationService.cancel(challenge.requestId);
      setChallenge(undefined);
    } catch {
      setContactError(formatMessage({ code: "MSG04" }));
    } finally {
      setIsChangingChannel(false);
    }
  }

  return (
    <section aria-labelledby="staff-onboarding-title" className="mt-7">
      <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">
        Thiết lập tài khoản
      </p>
      <h2
        className="mt-2 text-2xl font-semibold tracking-tight text-text outline-none"
        id="staff-onboarding-title"
        ref={headingRef}
        tabIndex={-1}
      >
        Hoàn tất bảo mật trước khi bắt đầu
      </h2>
      <p className="mt-3 text-base leading-7 text-text-muted">
        Hai bước này bảo vệ tài khoản nhân viên và các vùng nuôi được phân công.
      </p>

      <div className="mt-5 rounded-control border border-border bg-surface-subtle p-4">
        <p className="text-sm text-text-muted">Tên đăng nhập</p>
        <p className="mt-1 break-all font-semibold text-text">{identifier}</p>
      </div>

      <ol aria-label="Tiến trình thiết lập tài khoản" className="mt-5 grid gap-3 sm:grid-cols-2">
        <li className="flex items-start gap-3 rounded-control border border-border bg-surface p-4">
          <StepMarker completed={passwordChanged} number={1} />
          <div>
            <p className="font-semibold text-text">Đặt mật khẩu mới</p>
            <p className="mt-1 text-sm leading-5 text-text-muted">
              {passwordChanged ? "Đã hoàn tất" : "Đang thực hiện"}
            </p>
          </div>
        </li>
        <li
          aria-current={passwordChanged ? "step" : undefined}
          className="flex items-start gap-3 rounded-control border border-border bg-surface p-4"
        >
          <StepMarker completed={false} number={2} />
          <div>
            <p className="font-semibold text-text">Xác minh liên hệ</p>
            <p className="mt-1 text-sm leading-5 text-text-muted">
              {passwordChanged ? "Sẵn sàng thực hiện" : "Mở sau bước 1"}
            </p>
          </div>
        </li>
      </ol>

      <div className="mt-5 rounded-card border border-border bg-surface p-5 shadow-sm sm:p-6">
        {gate.nextStep === "change-temporary-password" ? (
          <>
            <h3 className="text-xl font-semibold text-text">Đổi mật khẩu tạm thời</h3>
            <p className="mt-2 leading-6 text-text-muted">
              Nhập lại mật khẩu tạm thời đã dùng để đăng nhập, sau đó đặt một mật khẩu chỉ bạn biết.
            </p>
            <div className="mt-5">
              <ChangePasswordForm
                changePassword={changeTemporaryPassword}
                mode="forced"
                onChanged={(message) => {
                  onPasswordChanged(message);
                  onGateChanged(completeStaffPasswordChange(gate));
                }}
                onSessionExpired={onSessionExpired}
              />
            </div>
          </>
        ) : (
          <>
            <h3 className="text-xl font-semibold text-text">Xác minh thông tin liên hệ</h3>
            <p className="mt-2 leading-6 text-text-muted">
              Chọn một cách nhận mã. Bạn chỉ cần xác minh một thông tin liên hệ.
            </p>

            {contactError && (
              <p
                className="mt-4 rounded-control border border-danger/30 bg-danger/10 p-3 text-sm leading-6 text-danger"
                role="alert"
              >
                {contactError}
              </p>
            )}

            {!challenge ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {gate.availableContactChannels.map((channel) => (
                  <Button
                    disabled={Boolean(startingChannel)}
                    isPending={startingChannel === channel}
                    key={channel}
                    onClick={() => handleStartContactVerification(channel)}
                    pendingLabel="Đang gửi mã..."
                    variant={channel === "email" ? "primary" : "secondary"}
                  >
                    Gửi mã qua {getChannelLabel(channel)}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="mt-5 space-y-5">
                <div
                  className="rounded-control border border-info/20 bg-info-soft p-4"
                  role="status"
                >
                  <p className="text-sm text-text-muted">
                    Mã xác minh đã được gửi tới {challenge.recipient.channel === "email" ? "email" : "số điện thoại"}
                  </p>
                  <p className="mt-1 break-all font-semibold text-text">
                    {challenge.recipient.maskedValue}
                  </p>
                </div>

                <VerificationForm
                  challenge={challenge}
                  key={challenge.requestId}
                  onChallengeChange={setChallenge}
                  onSecondaryAction={handleChangeChannel}
                  onVerified={handleVerified}
                  secondaryActionLabel="Đổi cách nhận mã"
                  secondaryActionPending={isChangingChannel}
                  secondaryActionPendingLabel="Đang hủy mã cũ..."
                  service={verificationService}
                />

                {isCompleting && (
                  <p className="text-center text-sm text-text-muted" role="status">
                    Đang hoàn tất thiết lập tài khoản...
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <Button className="mt-5" onClick={onUseAnotherAccount} variant="secondary">
        Đăng nhập bằng tài khoản khác
      </Button>
    </section>
  );
}
