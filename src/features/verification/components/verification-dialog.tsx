"use client";

import { useRef } from "react";

import { VerificationDialogShell } from "@/features/verification/components/verification-dialog-shell";
import { VerificationForm } from "@/features/verification/components/verification-form";
import {
  type VerificationChallenge,
  type VerificationToken,
} from "@/features/verification/domain/verification-types";
import type { VerificationService } from "@/features/verification/services/verification-service";
import type { AppMessage } from "@/shared/messages/message-catalog";

type VerificationDialogProps = Readonly<{
  title?: string;
  challenge: VerificationChallenge;
  deliveryFailureMessage?: AppMessage;
  onChallengeChange(challenge: VerificationChallenge): void;
  onOpenChange(open: boolean): void;
  onVerified(token: VerificationToken): void;
  open: boolean;
  service: VerificationService;
}>;

function VerificationDialogContent({
  title,
  challenge,
  deliveryFailureMessage = { code: "MSG04" },
  onChallengeChange,
  onOpenChange,
  onVerified,
  open,
  service,
}: VerificationDialogProps) {
  const codeInputRef = useRef<HTMLInputElement>(null);

  return (
    <VerificationDialogShell
      title={title}
      initialFocusRef={codeInputRef}
      onOpenChange={onOpenChange}
      open={open}
      purpose={challenge.purpose}
      recipient={challenge.recipient}
    >
      <VerificationForm
        challenge={challenge}
        codeInputRef={codeInputRef}
        deliveryFailureMessage={deliveryFailureMessage}
        onChallengeChange={onChallengeChange}
        onSecondaryAction={() => onOpenChange(false)}
        onVerified={onVerified}
        secondaryActionLabel="Quay lại"
        service={service}
      />
    </VerificationDialogShell>
  );
}

export function VerificationDialog(props: VerificationDialogProps) {
  if (!props.open) return null;
  return <VerificationDialogContent key={props.challenge.requestId} {...props} />;
}
