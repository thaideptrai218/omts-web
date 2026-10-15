"use client";

import { Button } from "@/components/ui/button";
import { useCountdown } from "@/features/verification/hooks/use-countdown";
import { formatCountdown } from "@/features/verification/lib/countdown";

type VerificationTimingProps = Readonly<{
  expiresAtMs: number;
  isResending?: boolean;
  onResend(): void;
  resendAvailableAtMs: number;
  sendsRemaining: number;
}>;

export function VerificationTiming({
  expiresAtMs,
  isResending = false,
  onResend,
  resendAvailableAtMs,
  sendsRemaining,
}: VerificationTimingProps) {
  const expirySeconds = useCountdown(expiresAtMs);
  const resendSeconds = useCountdown(resendAvailableAtMs);
  const canResend = resendSeconds === 0 && sendsRemaining > 0;

  let resendLabel = "Đang kiểm tra thời gian...";
  if (sendsRemaining === 0) resendLabel = "Đã hết lượt gửi mã";
  else if (resendSeconds !== null && resendSeconds > 0) {
    resendLabel = `Gửi lại sau ${formatCountdown(resendSeconds)}`;
  } else if (resendSeconds === 0) resendLabel = "Gửi lại mã";

  return (
    <div className="rounded-card bg-surface-subtle p-4">
      <div className="space-y-1 text-sm leading-5">
        <p className={expirySeconds === 0 ? "font-medium text-danger" : "text-text-muted"}>
          {expirySeconds === null
            ? "Đang kiểm tra thời hạn của mã..."
            : expirySeconds === 0
              ? "Mã xác minh đã hết hạn."
              : `Mã còn hiệu lực ${formatCountdown(expirySeconds)}.`}
        </p>
        <p className="text-text-muted">
          Còn {sendsRemaining} lượt gửi mã trong yêu cầu này.
        </p>
      </div>

      <Button
        className="mt-4 sm:w-auto"
        disabled={!canResend}
        isPending={isResending}
        onClick={onResend}
        pendingLabel="Đang gửi lại..."
        variant="secondary"
      >
        {resendLabel}
      </Button>
    </div>
  );
}
