"use client";

import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react";

import { Button } from "@/components/ui/button";
import { VerificationCodeField } from "@/features/verification/components/verification-code-field";
import { VerificationTiming } from "@/features/verification/components/verification-timing";
import {
  isVerificationCodeComplete,
  type VerificationChallenge,
  type VerificationToken,
} from "@/features/verification/domain/verification-types";
import type { VerificationService } from "@/features/verification/services/verification-service";
import {
  formatMessage,
  type AppMessage,
} from "@/shared/messages/message-catalog";

type Feedback = Readonly<{
  text: string;
  tone: "danger" | "success";
}>;

type VerificationFormProps = Readonly<{
  challenge: VerificationChallenge;
  codeInputRef?: RefObject<HTMLInputElement | null>;
  deliveryFailureMessage?: AppMessage;
  onChallengeChange(challenge: VerificationChallenge): void;
  onSecondaryAction(): void;
  onVerified(token: VerificationToken): Promise<void> | void;
  secondaryActionLabel: string;
  secondaryActionPending?: boolean;
  secondaryActionPendingLabel?: string;
  service: VerificationService;
}>;

export function VerificationForm({
  challenge,
  codeInputRef,
  deliveryFailureMessage = { code: "MSG04" },
  onChallengeChange,
  onSecondaryAction,
  onVerified,
  secondaryActionLabel,
  secondaryActionPending = false,
  secondaryActionPendingLabel = "Đang xử lý...",
  service,
}: VerificationFormProps) {
  const internalInputRef = useRef<HTMLInputElement>(null);
  const activeInputRef = codeInputRef ?? internalInputRef;
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string>();
  const [feedback, setFeedback] = useState<Feedback>();
  const [isLocked, setIsLocked] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const lifetime = useRef<{ active: boolean; busy: boolean } | null>(null);
  useEffect(() => {
    const scope = { active: true, busy: false };
    lifetime.current = scope;
    return () => { scope.active = false; };
  }, [challenge.requestId, service]);

  function handleCodeChange(value: string) {
    setCode(value);
    setCodeError(undefined);
    if (feedback?.tone === "danger") setFeedback(undefined);
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const scope = lifetime.current;
    if (!scope?.active || scope.busy || isLocked || secondaryActionPending) return;
    if (!isVerificationCodeComplete(code)) {
      setCodeError("Mã xác minh phải gồm đúng 6 chữ số.");
      return;
    }

    scope.busy = true;
    setCodeError(undefined);
    setFeedback(undefined);
    setIsVerifying(true);

    try {
      const result = await service.verify({ code, requestId: challenge.requestId });
      if (!scope.active) return;
      if (result.status === "verified") {
        await onVerified(result.token);
        return;
      }

      if (result.reason === "attempt-limit-reached") setIsLocked(true);

      const attemptsHint =
        result.reason === "invalid-or-expired" && result.attemptsRemaining > 0
          ? ` Còn ${result.attemptsRemaining} lần nhập.`
          : "";
      setCodeError(`${formatMessage({ code: "MSG16" })}${attemptsHint}`);
    } catch {
      if (scope.active) setFeedback({ text: formatMessage({ code: "MSG04" }), tone: "danger" });
    } finally {
      scope.busy = false;
      if (scope.active) setIsVerifying(false);
    }
  }

  async function handleResend() {
    const scope = lifetime.current;
    if (!scope?.active || scope.busy || secondaryActionPending || challenge.sendsRemaining === 0 || Date.now() < challenge.resendAvailableAtMs) return;
    scope.busy = true;
    setFeedback(undefined);
    setIsResending(true);

    try {
      const result = await service.resend(challenge.requestId);
      if (!scope.active) return;
      if (result.status === "resent") {
        setCode("");
        setCodeError(undefined);
        setIsLocked(false);
        onChallengeChange(result.challenge);
        setFeedback({ text: "Mã mới đã được gửi.", tone: "success" });
        return;
      }

      if (result.reason === "delivery-failed") {
        setFeedback({ text: formatMessage(deliveryFailureMessage), tone: "danger" });
      } else if (result.reason === "too-soon") {
        setFeedback({
          text: `Vui lòng chờ thêm ${result.retryAfterSeconds} giây trước khi gửi lại.`,
          tone: "danger",
        });
      } else if (result.reason === "send-limit-reached") {
        setFeedback({
          text: "Bạn đã dùng hết số lượt gửi mã của yêu cầu này.",
          tone: "danger",
        });
      } else {
        setFeedback({ text: formatMessage({ code: "MSG16" }), tone: "danger" });
      }
    } catch {
      if (scope.active) setFeedback({ text: formatMessage({ code: "MSG04" }), tone: "danger" });
    } finally {
      scope.busy = false;
      if (scope.active) setIsResending(false);
    }
  }

  const isBusy = isResending || isVerifying || secondaryActionPending;

  return (
    <form className="space-y-5" noValidate onSubmit={handleVerify}>
      <VerificationCodeField
        disabled={isBusy || isLocked}
        error={codeError}
        inputRef={activeInputRef}
        onChange={handleCodeChange}
        value={code}
      />

      <VerificationTiming
        disabled={isBusy}
        expiresAtMs={challenge.expiresAtMs}
        isResending={isResending}
        onResend={handleResend}
        resendAvailableAtMs={challenge.resendAvailableAtMs}
        sendsRemaining={challenge.sendsRemaining}
      />

      {feedback && (
        <div
          className={`rounded-control border p-3 text-sm leading-6 ${
            feedback.tone === "danger"
              ? "border-danger/30 bg-danger/10 text-danger"
              : "border-success/30 bg-success/10 text-success"
          }`}
          role={feedback.tone === "danger" ? "alert" : "status"}
        >
          {feedback.text}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Button disabled={isBusy || isLocked} isPending={isVerifying} type="submit">
          Xác minh
        </Button>
        <Button
          disabled={isBusy}
          isPending={secondaryActionPending}
          onClick={onSecondaryAction}
          pendingLabel={secondaryActionPendingLabel}
          variant="secondary"
        >
          {secondaryActionLabel}
        </Button>
      </div>
    </form>
  );
}
