"use client";

import { useState } from "react";
import type {
  CompleteStaffOnboardingInput,
  CompleteStaffOnboardingResult,
  OnboardingContactChannel,
  StartStaffContactVerificationResult,
} from "@/features/auth/domain/auth-types";
import { grantsApplicationAccess } from "@/features/auth/domain/login-result";
import type {
  VerificationChallenge,
  VerificationToken,
} from "@/features/verification/domain/verification-types";
import type { VerificationService } from "@/features/verification/services/verification-service";
import { formatMessage, type AppMessage } from "@/shared/messages/message-catalog";

export type StaffContactVerificationDeps = Readonly<{
  completeStaffOnboarding(
    input: CompleteStaffOnboardingInput,
  ): Promise<CompleteStaffOnboardingResult>;
  onOnboardingCompleted(): void;
  onSessionExpired(message: AppMessage & { code: "MSG19" }): void;
  startContactVerification(
    channel: OnboardingContactChannel,
  ): Promise<StartStaffContactVerificationResult>;
  verificationService: VerificationService;
}>;

/**
 * Step 2 of staff onboarding: send a code to the chosen contact, complete onboarding
 * with the verified token, or cancel the code to pick another channel.
 * MSG19 from the backend always ends the session instead of showing an inline error.
 */
export function useStaffContactVerification({
  completeStaffOnboarding,
  onOnboardingCompleted,
  onSessionExpired,
  startContactVerification,
  verificationService,
}: StaffContactVerificationDeps) {
  const [challenge, setChallenge] = useState<VerificationChallenge>();
  const [contactError, setContactError] = useState<string>();
  const [isChangingChannel, setIsChangingChannel] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [startingChannel, setStartingChannel] =
    useState<OnboardingContactChannel>();

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

  return {
    challenge,
    contactError,
    handleChangeChannel,
    handleStartContactVerification,
    handleVerified,
    isChangingChannel,
    isCompleting,
    setChallenge,
    startingChannel,
  };
}
