import { useState, type RefObject } from "react";
import { useToast } from "@/components/ui/toast-provider";
import type {
  PersonalProfile,
  ProfileIdentifierKind,
  VerifiedProfileIdentifierChange,
} from "@/features/profile/domain/personal-profile";
import type { PersonalProfileService } from "@/features/profile/services/personal-profile-service";
import type {
  VerificationChallenge,
  VerificationToken,
} from "@/features/verification/domain/verification-types";
import type { VerificationService } from "@/features/verification/services/verification-service";
import { formatMessage } from "@/shared/messages/message-catalog";
import { sessionExpiryChannel } from "@/shared/session/session-expiry-channel";

export type ProfileEditorLifetime = { active: boolean; pending: boolean };

export type VerifiedChanges = Partial<
  Record<ProfileIdentifierKind, VerifiedProfileIdentifierChange>
>;

export type ActiveVerification = Readonly<{
  challenge: VerificationChallenge;
  kind: ProfileIdentifierKind;
  value: string;
}>;

type UseProfileContactVerificationOptions = Readonly<{
  /** Shared with the save flow so only one async profile operation runs at a time. */
  lifetimeRef: RefObject<ProfileEditorLifetime | null>;
  onFormError(message: string | undefined): void;
  profile: PersonalProfile;
  profileService: PersonalProfileService;
  /** Bumped to invalidate any in-flight form validation. */
  validationRef: RefObject<number>;
  verificationService: VerificationService;
}>;

/**
 * Owns the email/phone verification state of the profile editor: which dialog is open,
 * the active OTP challenge, and verified-but-unsaved identifier changes.
 */
export function useProfileContactVerification({
  lifetimeRef,
  onFormError,
  profile,
  profileService,
  validationRef,
  verificationService,
}: UseProfileContactVerificationOptions) {
  const { notify } = useToast();
  const [activeIdentifierDialog, setActiveIdentifierDialog] =
    useState<ProfileIdentifierKind>();
  const [activeVerification, setActiveVerification] =
    useState<ActiveVerification>();
  const [sendingKind, setSendingKind] = useState<ProfileIdentifierKind>();
  const [verifiedChanges, setVerifiedChanges] = useState<VerifiedChanges>({});

  function beginVerification(
    kind: ProfileIdentifierKind,
    value: string,
    challenge: VerificationChallenge,
  ) {
    onFormError(undefined);
    setActiveVerification({ challenge, kind, value });
  }

  async function closeVerification() {
    const verification = activeVerification;
    setActiveVerification(undefined);
    if (verification) {
      await verificationService.cancel(verification.challenge.requestId);
    }
  }

  function completeVerification(token: VerificationToken) {
    const verification = activeVerification;
    if (!verification) return;

    setVerifiedChanges((current) => ({
      ...current,
      [verification.kind]: { token, value: verification.value },
    }));
    setActiveVerification(undefined);
    notify({
      description: "Bấm Lưu thay đổi để áp dụng giá trị mới vào hồ sơ.",
      title: `${verification.kind === "email" ? "Email" : "Số điện thoại"} đã được xác minh`,
      tone: "success",
    });
  }

  async function verifyCurrentContact(kind: ProfileIdentifierKind) {
    const scope = lifetimeRef.current;
    const contact = profile[kind];
    if (!scope?.active || scope.pending || !contact || contact.isVerified) return;
    scope.pending = true;
    validationRef.current++;
    setSendingKind(kind);
    onFormError(undefined);
    try {
      const result = await profileService.startIdentifierChange({
        kind,
        value: contact.value,
        intent: "verify-current",
      });
      if (!scope.active) return;
      if (result.status === "session-expired") {
        sessionExpiryChannel.publish(result.message);
      } else if (result.status === "verification-started") {
        beginVerification(kind, contact.value, result.challenge);
      } else {
        onFormError(formatMessage(result.message));
      }
    } catch {
      if (scope.active) onFormError(formatMessage({ code: "MSG04" }));
    } finally {
      scope.pending = false;
      if (scope.active) setSendingKind(undefined);
    }
  }

  return {
    activeIdentifierDialog,
    activeVerification,
    beginVerification,
    closeVerification,
    completeVerification,
    sendingKind,
    setActiveIdentifierDialog,
    setActiveVerification,
    setVerifiedChanges,
    verifiedChanges,
    verifyCurrentContact,
  };
}

export type ProfileContactVerification = ReturnType<typeof useProfileContactVerification>;
