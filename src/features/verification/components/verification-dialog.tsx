"use client";

import { useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { VerificationCodeField } from "@/features/verification/components/verification-code-field";
import { VerificationDialogShell } from "@/features/verification/components/verification-dialog-shell";
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

type VerificationDialogProps = Readonly<{
  challenge: VerificationChallenge;
  deliveryFailureMessage?: AppMessage;
  onChallengeChange(challenge: VerificationChallenge): void;
  onOpenChange(open: boolean): void;
  onVerified(token: VerificationToken): void;
  open: boolean;
  service: VerificationService;
}>;

function VerificationDialogContent({
  challenge,
  deliveryFailureMessage = { code: "MSG04" },
  onChallengeChange,
  onOpenChange,
  onVerified,
  open,
  service,
}: VerificationDialogProps) {
  const codeInputRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string>();
  const [feedback, setFeedback] = useState<Feedback>();
  const [isLocked, setIsLocked] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  function handleCodeChange(value: string) {
    setCode(value);
    setCodeError(undefined);
    if (feedback?.tone === "danger") setFeedback(undefined);
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isVerificationCodeComplete(code)) {
      setCodeError("Mã xác minh phải gồm đúng 6 chữ số.");
      return;
    }

    setCodeError(undefined);
    setFeedback(undefined);
    setIsVerifying(true);

    try {
      const result = await service.verify({ code, requestId: challenge.requestId });
      if (result.status === "verified") {
        onVerified(result.token);
        return;
      }

      if (result.reason === "attempt-limit-reached") setIsLocked(true);

      const attemptsHint =
        result.reason === "invalid-or-expired" && result.attemptsRemaining > 0
          ? ` Còn ${result.attemptsRemaining} lần nhập.`
          : "";
      setCodeError(`${formatMessage({ code: "MSG16" })}${attemptsHint}`);
    } catch {
      setFeedback({ text: formatMessage({ code: "MSG04" }), tone: "danger" });
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleResend() {
    setFeedback(undefined);
    setIsResending(true);

    try {
      const result = await service.resend(challenge.requestId);
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
      setFeedback({ text: formatMessage({ code: "MSG04" }), tone: "danger" });
    } finally {
      setIsResending(false);
    }
  }

  const isBusy = isResending || isVerifying;

  return (
    <VerificationDialogShell
      initialFocusRef={codeInputRef}
      onOpenChange={onOpenChange}
      open={open}
      purpose={challenge.purpose}
      recipient={challenge.recipient}
    >
      <form className="space-y-5" noValidate onSubmit={handleVerify}>
        <VerificationCodeField
          disabled={isBusy || isLocked}
          error={codeError}
          inputRef={codeInputRef}
          onChange={handleCodeChange}
          value={code}
        />

        <VerificationTiming
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
            onClick={() => onOpenChange(false)}
            variant="secondary"
          >
            Quay lại
          </Button>
        </div>
      </form>
    </VerificationDialogShell>
  );
}

export function VerificationDialog(props: VerificationDialogProps) {
  return <VerificationDialogContent key={props.challenge.requestId} {...props} />;
}
