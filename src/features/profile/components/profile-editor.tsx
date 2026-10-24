"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FormField } from "@/components/form/form-field";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { useAuth } from "@/features/auth/state/auth-provider";
import { ProfileIdentifierDialog } from "@/features/profile/components/profile-identifier-dialog";
import type {
  PersonalProfile,
  ProfileContact,
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
import { describeProfileContact } from "@/features/profile/lib/describe-profile-contact";

type VerifiedChanges = Partial<
  Record<ProfileIdentifierKind, VerifiedProfileIdentifierChange>
>;

type ActiveVerification = Readonly<{
  challenge: VerificationChallenge;
  kind: ProfileIdentifierKind;
  value: string;
}>;

function ContactEditor({
  contact,
  kind,
  onChange,
  pendingValue,
}: {
  contact: ProfileContact | null;
  kind: ProfileIdentifierKind;
  onChange(): void;
  pendingValue?: string;
}) {
  const label = kind === "email" ? "Email" : "Số điện thoại";
  const { isVerified, statusLabel, value } = describeProfileContact(contact, kind);

  return (
    <div className="rounded-control border border-border bg-surface-subtle/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-muted">{label}</p>
          <p className="mt-1 break-all font-medium text-text">{value}</p>
        </div>
        <span
          className={`inline-flex min-h-7 items-center rounded-full px-2.5 text-xs font-semibold ${
            isVerified
              ? "bg-primary-soft text-primary-hover"
              : "bg-warning-soft text-warning"
          }`}
        >
          {statusLabel}
        </span>
      </div>

      {pendingValue && (
        <div className="mt-3 rounded-control border border-success/20 bg-emerald-50 p-3 text-sm text-success">
          <p className="font-semibold">Đã xác minh, chờ lưu</p>
          <p className="mt-1 break-all">{pendingValue}</p>
        </div>
      )}

      <button
        className="mt-3 min-h-11 rounded-control px-3 text-sm font-semibold text-primary transition hover:bg-primary-soft"
        onClick={onChange}
        type="button"
      >
        {pendingValue
          ? `Chọn ${label.toLocaleLowerCase("vi")} khác`
          : `${contact ? "Thay đổi" : "Thêm"} ${label.toLocaleLowerCase("vi")}`}
      </button>
    </div>
  );
}

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
  const [activeIdentifierDialog, setActiveIdentifierDialog] =
    useState<ProfileIdentifierKind>();
  const [activeVerification, setActiveVerification] =
    useState<ActiveVerification>();
  const [formError, setFormError] = useState<string>();
  const [verifiedChanges, setVerifiedChanges] = useState<VerifiedChanges>({});
  const {
    formState: { errors, isDirty, isSubmitting },
    handleSubmit,
    register,
    reset,
    setError,
  } = useForm<ProfileDetailsFormValues>({
    defaultValues: { displayName: profile.displayName },
    resolver: zodResolver(profileDetailsSchema),
  });

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
      title: `${verification.kind === "email" ? "Email" : "Số điện thoại"} mới đã được xác minh`,
      tone: "success",
    });
  }

  async function saveProfile(values: ProfileDetailsFormValues) {
    setFormError(undefined);

    try {
      const result = await profileService.save({
        displayName: values.displayName,
        emailChange: verifiedChanges.email,
        phoneChange: verifiedChanges.phone,
        recordVersion: profile.recordVersion,
      });

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
          setError("displayName", { message });
        } else {
          setVerifiedChanges((current) => ({ ...current, [result.field]: undefined }));
          setFormError(message);
        }
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
      setFormError(formatMessage({ code: "MSG04" }));
    }
  }

  const hasVerifiedChange = Boolean(verifiedChanges.email || verifiedChanges.phone);

  return (
    <>
      <form className="space-y-5" noValidate onSubmit={handleSubmit(saveProfile)}>
        <FormField
          autoComplete="name"
          error={errors.displayName?.message}
          id="profile-display-name"
          label="Tên hiển thị"
          required
          {...register("displayName")}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <ContactEditor
            contact={profile.email}
            kind="email"
            onChange={() => setActiveIdentifierDialog("email")}
            pendingValue={verifiedChanges.email?.value}
          />
          <ContactEditor
            contact={profile.phone}
            kind="phone"
            onChange={() => setActiveIdentifierDialog("phone")}
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
          <Button
            className="sm:w-auto sm:min-w-44"
            disabled={!isDirty && !hasVerifiedChange}
            isPending={isSubmitting}
            pendingLabel="Đang lưu..."
            type="submit"
          >
            Lưu thay đổi
          </Button>
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
