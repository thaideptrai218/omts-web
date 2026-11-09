import { useToast } from "@/components/ui/toast-provider";
import { ProfileIdentifierDialog } from "@/features/profile/components/profile-identifier-dialog";
import type {
  ActiveVerification,
  ProfileContactVerification,
} from "@/features/profile/components/use-profile-contact-verification";
import type { PersonalProfile } from "@/features/profile/domain/personal-profile";
import type { PersonalProfileService } from "@/features/profile/services/personal-profile-service";
import { VerificationDialog } from "@/features/verification/components/verification-dialog";
import type { VerificationService } from "@/features/verification/services/verification-service";
import { formatMessage } from "@/shared/messages/message-catalog";

/** Title override shown only when re-verifying the value already on the profile. */
function getVerificationDialogTitle(profile: PersonalProfile, verification: ActiveVerification) {
  if (verification.value !== profile[verification.kind]?.value) return undefined;
  return `Xác minh ${verification.kind === "email" ? "email" : "số điện thoại"}`;
}

type ProfileContactVerificationDialogsProps = Readonly<{
  profile: PersonalProfile;
  profileService: PersonalProfileService;
  verification: ProfileContactVerification;
  verificationService: VerificationService;
}>;

/** New-identifier dialog followed by the OTP verification dialog for email/phone changes. */
export function ProfileContactVerificationDialogs({
  profile,
  profileService,
  verification,
  verificationService,
}: ProfileContactVerificationDialogsProps) {
  const { notify } = useToast();
  const { activeIdentifierDialog, activeVerification, setActiveVerification } = verification;

  return (
    <>
      {activeIdentifierDialog && (
        <ProfileIdentifierDialog
          currentValue={
            activeIdentifierDialog === "email"
              ? (profile.email?.value ?? null)
              : (profile.phone?.value ?? null)
          }
          kind={activeIdentifierDialog}
          onOpenChange={(open) => {
            if (!open) verification.setActiveIdentifierDialog(undefined);
          }}
          onStarted={(value, result) => {
            if (result.message) {
              notify({ title: formatMessage(result.message), tone: "info" });
            }
            verification.beginVerification(activeIdentifierDialog, value, result.challenge);
          }}
          open
          service={profileService}
        />
      )}

      {activeVerification && (
        <VerificationDialog
          title={getVerificationDialogTitle(profile, activeVerification)}
          challenge={activeVerification.challenge}
          onChallengeChange={(challenge) =>
            setActiveVerification((current) =>
              current ? { ...current, challenge } : current,
            )
          }
          onOpenChange={(open) => {
            if (!open) void verification.closeVerification();
          }}
          onVerified={verification.completeVerification}
          open
          service={verificationService}
        />
      )}
    </>
  );
}
