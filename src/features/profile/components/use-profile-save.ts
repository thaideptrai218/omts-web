"use client";

import type { Dispatch, SetStateAction } from "react";
import type { UseFormReset, UseFormSetError } from "react-hook-form";
import type { useToast } from "@/components/ui/toast-provider";
import type {
  ProfileEditorLifetime,
  useProfileContactVerification,
} from "@/features/profile/components/use-profile-contact-verification";
import type { PersonalProfile } from "@/features/profile/domain/personal-profile";
import type { ProfileDetailsFormValues } from "@/features/profile/schemas/profile-schema";
import type { PersonalProfileService } from "@/features/profile/services/personal-profile-service";
import { formatMessage } from "@/shared/messages/message-catalog";
import { sessionExpiryChannel } from "@/shared/session/session-expiry-channel";

type ProfileVerification = ReturnType<typeof useProfileContactVerification>;

export type ProfileSaveDeps = Readonly<{
  notify: ReturnType<typeof useToast>["notify"];
  onProfileChange(profile: PersonalProfile): void;
  profile: PersonalProfile;
  profileService: PersonalProfileService;
  reset: UseFormReset<ProfileDetailsFormValues>;
  setError: UseFormSetError<ProfileDetailsFormValues>;
  setFormError: Dispatch<SetStateAction<string | undefined>>;
  setVerifiedChanges: ProfileVerification["setVerifiedChanges"];
  updateDisplayName(displayName: string): void;
  verifiedChanges: ProfileVerification["verifiedChanges"];
}>;

/**
 * Saves the display name plus any verified contact changes. Results are ignored
 * after unmount/account switch, and a response for another account is rejected.
 */
export function useProfileSave({
  notify,
  onProfileChange,
  profile,
  profileService,
  reset,
  setError,
  setFormError,
  setVerifiedChanges,
  updateDisplayName,
  verifiedChanges,
}: ProfileSaveDeps) {
  async function saveProfile(values: ProfileDetailsFormValues, scope: ProfileEditorLifetime) {
    if (!scope.active || scope.pending) return;
    scope.pending = true;
    setFormError(undefined);

    try {
      const result = await profileService.save({
        displayName: values.displayName,
        emailChange: verifiedChanges.email,
        phoneChange: verifiedChanges.phone,
        recordVersion: profile.recordVersion,
      });
      if (!scope.active) return;

      if (result.status === "session-expired") {
        sessionExpiryChannel.publish(result.message);
        return;
      }
      if (result.status === "conflict") {
        setFormError(formatMessage(result.message));
        return;
      }
      if (result.status === "invalid-change") {
        const message = formatMessage(result.message);
        if (result.field === "displayName") {
          setError("displayName", { message }, { shouldFocus: true });
        } else {
          setVerifiedChanges((current) => ({ ...current, [result.field]: undefined }));
          setFormError(message);
        }
        return;
      }

      // Never apply a response that belongs to a different account.
      if (result.profile.accountId !== profile.accountId) {
        setFormError(formatMessage({ code: "MSG04" }));
        return;
      }
      setVerifiedChanges({});
      onProfileChange(result.profile);
      updateDisplayName(result.profile.displayName);
      reset({ displayName: result.profile.displayName });
      notify({ title: formatMessage(result.message), tone: "success" });
      if (result.notice) {
        notify({
          description: formatMessage(result.notice),
          title: "Cần kiểm tra liên kết lịch sử",
          tone: "info",
        });
      }
    } catch {
      if (scope.active) setFormError(formatMessage({ code: "MSG04" }));
    } finally {
      scope.pending = false;
    }
  }

  return { saveProfile };
}
