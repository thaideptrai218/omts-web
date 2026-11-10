"use client";

import type { Dispatch, RefObject, SetStateAction } from "react";
import type { UseFormSetError } from "react-hook-form";
import type { useToast } from "@/components/ui/toast-provider";
import {
  getFieldElementId,
  serverFieldToFormField,
} from "@/features/cooperative-profile/components/cooperative-profile-form-mapping";
import type { CooperativeProfileEditorStep } from "@/features/cooperative-profile/components/cooperative-profile-step-indicator";
import type {
  CooperativeProfile,
  CooperativeProfileField,
  SaveCooperativeProfileInput,
} from "@/features/cooperative-profile/domain/cooperative-profile";
import type { CooperativeProfileFormValues } from "@/features/cooperative-profile/schemas/cooperative-profile-schema";
import { cooperativeProfileService } from "@/features/cooperative-profile/services/cooperative-profile-service.instance";
import { formatMessage } from "@/shared/messages/message-catalog";
import { sessionExpiryChannel } from "@/shared/session/session-expiry-channel";

/** Mutable guard shared with the editor: unmount flag, in-flight save, validation attempt. */
export type CooperativeProfileLifetime = {
  active: boolean;
  saving: boolean;
  validation: number;
};

export type CooperativeProfileSaveDeps = Readonly<{
  draft?: SaveCooperativeProfileInput;
  firstActivityRowId?: string;
  lifetime: RefObject<CooperativeProfileLifetime | null>;
  notify: ReturnType<typeof useToast>["notify"];
  onProfileChange(profile: CooperativeProfile): void;
  setError: UseFormSetError<CooperativeProfileFormValues>;
  setFormError: Dispatch<SetStateAction<string | undefined>>;
  setHasConflict: Dispatch<SetStateAction<boolean>>;
  setIsSaving: Dispatch<SetStateAction<boolean>>;
  setStep: Dispatch<SetStateAction<CooperativeProfileEditorStep>>;
}>;

/**
 * Confirm-and-save step of the cooperative profile editor. Maps server results back
 * to the details step (field focus, conflict reload, generic error) and ignores
 * results that arrive after unmount or while another save is in flight.
 */
export function useCooperativeProfileSave(deps: CooperativeProfileSaveDeps) {
  const {
    draft,
    firstActivityRowId,
    lifetime,
    notify,
    onProfileChange,
    setError,
    setFormError,
    setHasConflict,
    setIsSaving,
    setStep,
  } = deps;

  function showServerFieldError(field: CooperativeProfileField, message: string) {
    setError(serverFieldToFormField(field), { message });
    setStep("details");
    const elementId = getFieldElementId(field, firstActivityRowId);
    requestAnimationFrame(() => document.getElementById(elementId)?.focus());
  }

  async function confirmSave() {
    const scope = lifetime.current;
    if (!scope?.active || scope.saving || !draft) return;
    scope.saving = true;

    setFormError(undefined);
    setHasConflict(false);
    setIsSaving(true);

    try {
      const result = await cooperativeProfileService.save(draft);
      if (!scope.active) return;

      if (result.status === "session-expired") {
        sessionExpiryChannel.publish(result.message);
        return;
      }

      if (result.status === "forbidden") {
        setFormError(formatMessage(result.message));
        setStep("details");
        return;
      }

      if (result.status === "invalid-input" || result.status === "duplicate-tax-id") {
        showServerFieldError(result.field, formatMessage(result.message));
        return;
      }

      if (result.status === "conflict") {
        setFormError(formatMessage(result.message));
        setHasConflict(true);
        setStep("details");
        return;
      }

      onProfileChange(result.profile);
      notify({ title: formatMessage(result.message), tone: "success" });
    } catch {
      if (scope.active) {
        setFormError(formatMessage({ code: "MSG04" }));
        setStep("details");
      }
    } finally {
      scope.saving = false;
      if (scope.active) setIsSaving(false);
    }
  }

  return { confirmSave };
}
