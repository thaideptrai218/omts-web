"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { FormField } from "@/components/form/form-field";
import { useToast } from "@/components/ui/toast-provider";
import { useAuth } from "@/features/auth/state/auth-provider";
import { ProfileContactVerificationDialogs } from "@/features/profile/components/profile-contact-verification-dialogs";
import { ProfileEditorActionBar } from "@/features/profile/components/profile-editor-action-bar";
import {
  useProfileContactVerification,
  type ProfileEditorLifetime,
} from "@/features/profile/components/use-profile-contact-verification";
import { useProfileSave } from "@/features/profile/components/use-profile-save";
import type {
  PersonalProfile,
  ProfileIdentifierKind,
} from "@/features/profile/domain/personal-profile";
import {
  profileDetailsSchema,
  type ProfileDetailsFormValues,
} from "@/features/profile/schemas/profile-schema";
import type { PersonalProfileService } from "@/features/profile/services/personal-profile-service";
import type { VerificationService } from "@/features/verification/services/verification-service";
import { ContactEditor } from "./profile-contact-card";

const CONTACT_KINDS: readonly ProfileIdentifierKind[] = ["email", "phone"];

export function ProfileEditor({
  onProfileChange,
  profile,
  profileService,
  verificationService,
}: {
  onProfileChange(profile: PersonalProfile): void;
  profile: PersonalProfile;
  profileService: PersonalProfileService;
  verificationService: VerificationService;
}) {
  const { notify } = useToast();
  const { updateDisplayName } = useAuth();
  // `lifetime` drops results after unmount/account switch; `validation` discards stale submit attempts.
  const lifetime = useRef<ProfileEditorLifetime | null>(null);
  const validation = useRef(0);
  useEffect(() => {
    const scope = { active: true, pending: false };
    lifetime.current = scope;
    return () => { scope.active = false; };
  }, [profile.accountId, profileService]);
  const [formError, setFormError] = useState<string>();
  const verification = useProfileContactVerification({
    lifetimeRef: lifetime,
    onFormError: setFormError,
    profile,
    profileService,
    validationRef: validation,
    verificationService,
  });
  const { sendingKind, setVerifiedChanges, verifiedChanges } = verification;
  const {
    formState: { errors, isDirty, isSubmitting },
    handleSubmit,
    register,
    reset,
    setError,
    setFocus,
  } = useForm<ProfileDetailsFormValues>({
    defaultValues: { displayName: profile.displayName },
    resolver: zodResolver(profileDetailsSchema),
  });
  useEffect(() => {
    if (!isSubmitting && errors.displayName) setFocus("displayName");
  }, [errors.displayName, isSubmitting, setFocus]);

  const { saveProfile } = useProfileSave({
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
  });

  function cancelChanges() {
    validation.current++;
    reset({ displayName: profile.displayName });
    setVerifiedChanges({});
    setFormError(undefined);
  }

  const hasVerifiedChange = Boolean(verifiedChanges.email || verifiedChanges.phone);
  const isBusy = Boolean(sendingKind);

  return (
    <>
      <form className="space-y-5" noValidate onSubmit={(event) => {
        const scope = lifetime.current;
        const attempt = ++validation.current;
        void handleSubmit((values) => {
          if (scope?.active && attempt === validation.current) return saveProfile(values, scope);
        })(event);
      }}>
        <FormField
          autoComplete="name"
          disabled={isSubmitting || isBusy}
          error={errors.displayName?.message}
          id="profile-display-name"
          hint="Tên hiển thị trong hệ thống, tối đa 200 ký tự."
          label="Tên hiển thị"
          required
          {...register("displayName")}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          {CONTACT_KINDS.map((kind) => (
            <ContactEditor
              contact={profile[kind]}
              disabled={isSubmitting || isBusy}
              isVerifying={sendingKind === kind}
              key={kind}
              kind={kind}
              onChange={() => verification.setActiveIdentifierDialog(kind)}
              onVerify={() => void verification.verifyCurrentContact(kind)}
              pendingValue={verifiedChanges[kind]?.value}
            />
          ))}
        </div>

        {formError && (
          <p
            className="rounded-control border border-danger/30 bg-danger/10 p-3 text-sm leading-6 text-danger"
            role="alert"
          >
            {formError}
          </p>
        )}

        <ProfileEditorActionBar
          hasVerifiedChange={hasVerifiedChange}
          isBusy={isBusy}
          isDirty={isDirty}
          isSubmitting={isSubmitting}
          onCancel={cancelChanges}
        />
      </form>

      <ProfileContactVerificationDialogs
        profile={profile}
        profileService={profileService}
        verification={verification}
        verificationService={verificationService}
      />
    </>
  );
}
