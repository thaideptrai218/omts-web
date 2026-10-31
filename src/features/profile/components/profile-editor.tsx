"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { FormField } from "@/components/form/form-field";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { useAuth } from "@/features/auth/state/auth-provider";
import { ProfileIdentifierDialog } from "@/features/profile/components/profile-identifier-dialog";
import type {
  PersonalProfile,
  ProfileIdentifierKind,
  VerifiedProfileIdentifierChange,
} from "@/features/profile/domain/personal-profile";
import {
  profileDetailsSchema,
  type ProfileDetailsFormValues,
} from "@/features/profile/schemas/profile-schema";
import type { PersonalProfileService } from "@/features/profile/services/personal-profile-service";
import type { VerificationService } from "@/features/verification/services/verification-service";
import { VerificationDialog } from "@/features/verification/components/verification-dialog";
import type {
  VerificationChallenge,
  VerificationToken,
} from "@/features/verification/domain/verification-types";
import { formatMessage } from "@/shared/messages/message-catalog";
import { sessionExpiryChannel } from "@/shared/session/session-expiry-channel";
import { ContactEditor } from "./profile-contact-card";

type VerifiedChanges = Partial<
  Record<ProfileIdentifierKind, VerifiedProfileIdentifierChange>
>;

type ActiveVerification = Readonly<{
  challenge: VerificationChallenge;
  kind: ProfileIdentifierKind;
  value: string;
}>;

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
  const lifetime = useRef<{ active: boolean; pending: boolean } | null>(null);
  const validation = useRef(0);
  useEffect(() => {
    const scope = { active: true, pending: false };
    lifetime.current = scope;
    return () => { scope.active = false; };
  }, [profile.accountId, profileService]);
  const [activeIdentifierDialog, setActiveIdentifierDialog] =
    useState<ProfileIdentifierKind>();
  const [activeVerification, setActiveVerification] =
    useState<ActiveVerification>();
  const [formError, setFormError] = useState<string>();
  const [sendingKind, setSendingKind] = useState<ProfileIdentifierKind>();
  const [verifiedChanges, setVerifiedChanges] = useState<VerifiedChanges>({});
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

  function beginVerification(
    kind: ProfileIdentifierKind,
    value: string,
    challenge: VerificationChallenge,
  ) {
    setFormError(undefined);
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
    const scope = lifetime.current;
    const contact = profile[kind];
    if (!scope?.active || scope.pending || !contact || contact.isVerified) return;
    scope.pending = true;
    validation.current++;
    setSendingKind(kind);
    setFormError(undefined);
    try {
      const result = await profileService.startIdentifierChange({ kind, value: contact.value, intent: "verify-current" });
      if (!scope.active) return;
      if (result.status === "session-expired") sessionExpiryChannel.publish(result.message);
      else if (result.status === "verification-started") beginVerification(kind, contact.value, result.challenge);
      else setFormError(formatMessage(result.message));
    } catch {
      if (scope.active) setFormError(formatMessage({ code: "MSG04" }));
    } finally {
      scope.pending = false;
      if (scope.active) setSendingKind(undefined);
    }
  }

  async function saveProfile(values: ProfileDetailsFormValues, scope: { active: boolean; pending: boolean }) {
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

  const hasVerifiedChange = Boolean(verifiedChanges.email || verifiedChanges.phone);

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
          disabled={isSubmitting || Boolean(sendingKind)}
          error={errors.displayName?.message}
          id="profile-display-name"
          hint="Tên bạn muốn hiển thị trên OMTS, tối đa 200 ký tự."
          label="Tên hiển thị"
          required
          {...register("displayName")}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <ContactEditor
            contact={profile.email}
            disabled={isSubmitting || Boolean(sendingKind)}
            isVerifying={sendingKind === "email"}
            kind="email"
            onChange={() => setActiveIdentifierDialog("email")}
            onVerify={() => void verifyCurrentContact("email")}
            pendingValue={verifiedChanges.email?.value}
          />
          <ContactEditor
            contact={profile.phone}
            disabled={isSubmitting || Boolean(sendingKind)}
            isVerifying={sendingKind === "phone"}
            kind="phone"
            onChange={() => setActiveIdentifierDialog("phone")}
            onVerify={() => void verifyCurrentContact("phone")}
            pendingValue={verifiedChanges.phone?.value}
          />
        </div>

        {formError && (
          <p
            className="rounded-control border border-danger/30 bg-danger/10 p-3 text-sm leading-6 text-danger"
            role="alert"
          >
            {formError}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-text-muted">
            {hasVerifiedChange
              ? "Giá trị mới đã xác minh nhưng chưa được lưu."
              : "Thông tin chỉ thay đổi sau khi lưu thành công."}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            {(isDirty || hasVerifiedChange) && <Button disabled={isSubmitting || Boolean(sendingKind)} variant="secondary" onClick={() => {
              validation.current++;
              reset({ displayName: profile.displayName });
              setVerifiedChanges({});
              setFormError(undefined);
            }}>Hủy thay đổi</Button>}
            <Button
              className="sm:w-auto sm:min-w-44"
              disabled={Boolean(sendingKind) || (!isDirty && !hasVerifiedChange)}
              isPending={isSubmitting}
              pendingLabel="Đang lưu..."
              type="submit"
            >
              Lưu thay đổi
            </Button>
          </div>
        </div>
      </form>

      {activeIdentifierDialog && (
        <ProfileIdentifierDialog
          currentValue={
            activeIdentifierDialog === "email"
              ? (profile.email?.value ?? null)
              : (profile.phone?.value ?? null)
          }
          kind={activeIdentifierDialog}
          onOpenChange={(open) => {
            if (!open) setActiveIdentifierDialog(undefined);
          }}
          onStarted={(value, result) => {
            if (result.message) {
              notify({ title: formatMessage(result.message), tone: "info" });
            }
            beginVerification(activeIdentifierDialog, value, result.challenge);
          }}
          open
          service={profileService}
        />
      )}

      {activeVerification && (
        <VerificationDialog
          title={activeVerification.value === profile[activeVerification.kind]?.value
            ? `Xác minh ${activeVerification.kind === "email" ? "email" : "số điện thoại"}` : undefined}
          challenge={activeVerification.challenge}
          onChallengeChange={(challenge) =>
            setActiveVerification((current) =>
              current ? { ...current, challenge } : current,
            )
          }
          onOpenChange={(open) => {
            if (!open) void closeVerification();
          }}
          onVerified={completeVerification}
          open
          service={verificationService}
        />
      )}
    </>
  );
}
