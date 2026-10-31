"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { FormField } from "@/components/form/form-field";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type {
  ProfileIdentifierKind,
  StartProfileIdentifierChangeResult,
} from "@/features/profile/domain/personal-profile";
import {
  createProfileIdentifierCandidateSchema,
  type ProfileIdentifierCandidateValues,
} from "@/features/profile/schemas/profile-schema";
import type { PersonalProfileService } from "@/features/profile/services/personal-profile-service";
import { formatMessage } from "@/shared/messages/message-catalog";
import { sessionExpiryChannel } from "@/shared/session/session-expiry-channel";

type ProfileIdentifierDialogProps = Readonly<{
  currentValue: string | null;
  kind: ProfileIdentifierKind;
  onOpenChange(open: boolean): void;
  onStarted(
    value: string,
    result: Extract<
      StartProfileIdentifierChangeResult,
      { status: "verification-started" }
    >,
  ): void;
  open: boolean;
  service: PersonalProfileService;
}>;

export function ProfileIdentifierDialog({
  open,
  ...props
}: ProfileIdentifierDialogProps) {
  if (!open) return null;
  return <ProfileIdentifierSession key={`${props.kind}:${props.currentValue}`} {...props} />;
}

function ProfileIdentifierSession({
  currentValue,
  kind,
  onOpenChange,
  onStarted,
  service,
}: Omit<ProfileIdentifierDialogProps, "open">) {
  const [formError, setFormError] = useState<string>();
  const lifetime = useRef<{ active: boolean; pending: boolean } | null>(null);
  useEffect(() => {
    const scope = { active: true, pending: false };
    lifetime.current = scope;
    return () => { scope.active = false; };
  }, [service]);
  const inputRef = useRef<HTMLInputElement>(null);
  const isEmail = kind === "email";
  const schema = useMemo(
    () =>
      createProfileIdentifierCandidateSchema({
        currentValue,
        // The production phone parser is intentionally deferred until the
        // canonical domestic/E.164 contract is confirmed.
        isValidPhoneNumber: (value) => value.trim().length > 0,
        kind,
      }),
    [currentValue, kind],
  );
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<ProfileIdentifierCandidateValues>({
    defaultValues: { value: "" },
    resolver: zodResolver(schema),
  });
  const valueRegistration = register("value");

  function closeDialog() {
    if (lifetime.current) lifetime.current.active = false;
    reset();
    setFormError(undefined);
    onOpenChange(false);
  }

  async function submitCandidate(values: ProfileIdentifierCandidateValues, scope: { active: boolean; pending: boolean }) {
    if (!scope.active || scope.pending) return;
    scope.pending = true;
    setFormError(undefined);

    try {
      const value = values.value.trim();
      const result = await service.startIdentifierChange({ kind, value });
      if (!scope.active) return;

      if (result.status === "session-expired") {
        sessionExpiryChannel.publish(result.message);
        return;
      }
      if (result.status !== "verification-started") {
        setFormError(formatMessage(result.message));
        return;
      }

      onStarted(value, result);
      reset();
      onOpenChange(false);
    } catch {
      if (scope.active) setFormError(formatMessage({ code: "MSG04" }));
    } finally {
      scope.pending = false;
    }
  }

  return (
    <Dialog
      description={`Giá trị hiện tại vẫn được sử dụng cho đến khi ${
        isEmail ? "email" : "số điện thoại"
      } mới được xác minh và lưu.`}
      initialFocusRef={inputRef}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) closeDialog();
      }}
      open
      title={isEmail ? "Thay đổi email" : "Thay đổi số điện thoại"}
    >
      <form className="space-y-5" noValidate onSubmit={(event) => {
        const scope = lifetime.current;
        void handleSubmit((values) => { if (scope?.active) return submitCandidate(values, scope); })(event);
      }}>
        <FormField
          autoCapitalize="none"
          autoComplete={isEmail ? "email" : "tel"}
          data-dialog-initial-focus
          disabled={isSubmitting}
          error={errors.value?.message}
          hint={
            isEmail
              ? "Mã xác minh sẽ được gửi tới email mới."
              : "Mã xác minh sẽ được gửi qua SMS tới số mới."
          }
          id={`profile-${kind}-candidate`}
          inputMode={isEmail ? "email" : "tel"}
          label={isEmail ? "Email mới" : "Số điện thoại mới"}
          required
          spellCheck={false}
          type={isEmail ? "email" : "tel"}
          {...valueRegistration}
          ref={(element) => {
            valueRegistration.ref(element);
            inputRef.current = element;
          }}
        />

        {formError && (
          <p
            className="rounded-control border border-danger/30 bg-danger/10 p-3 text-sm leading-6 text-danger"
            role="alert"
          >
            {formError}
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            isPending={isSubmitting}
            pendingLabel="Đang gửi mã..."
            type="submit"
          >
            Gửi mã xác minh
          </Button>
          <Button disabled={isSubmitting} onClick={closeDialog} variant="secondary">
            Hủy
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
