"use client";

import type { Dispatch, SetStateAction } from "react";
import type { UseFormSetError } from "react-hook-form";
import type { CooperativeProvisioningReviewDraft } from "@/features/cooperative-provisioning/components/cooperative-provisioning-review-step";
import type { CooperativeProvisioningStep } from "@/features/cooperative-provisioning/components/cooperative-provisioning-step-indicator";
import type { ProvisionedOwnerCredential } from "@/features/cooperative-provisioning/domain/provisioned-owner-credential";
import type { CooperativeProvisioningFormValues } from "@/features/cooperative-provisioning/schemas/cooperative-provisioning-schema";
import { cooperativeProvisioningService } from "@/features/cooperative-provisioning/services/cooperative-provisioning-service.instance";
import { formatMessage } from "@/shared/messages/message-catalog";
import { sessionExpiryChannel } from "@/shared/session/session-expiry-channel";

export type CooperativeProvisioningSubmitDeps = Readonly<{
  isProvisioning: boolean;
  reviewDraft?: CooperativeProvisioningReviewDraft;
  setCredential: Dispatch<SetStateAction<ProvisionedOwnerCredential | undefined>>;
  setError: UseFormSetError<CooperativeProvisioningFormValues>;
  setEvidenceError: Dispatch<SetStateAction<string | undefined>>;
  setFormError: Dispatch<SetStateAction<string | undefined>>;
  setIsProvisioning: Dispatch<SetStateAction<boolean>>;
  setStep: Dispatch<SetStateAction<CooperativeProvisioningStep>>;
  setSuccessName: Dispatch<SetStateAction<string | undefined>>;
}>;

/**
 * Sends the reviewed provisioning draft once. Validation/duplicate failures return
 * the user to the details step; success stores the one-time owner credential.
 */
export function useCooperativeProvisioningSubmit(
  deps: CooperativeProvisioningSubmitDeps,
) {
  const {
    isProvisioning,
    reviewDraft,
    setCredential,
    setError,
    setEvidenceError,
    setFormError,
    setIsProvisioning,
    setStep,
    setSuccessName,
  } = deps;

  async function confirmProvisioning() {
    if (!reviewDraft || isProvisioning) return;

    setFormError(undefined);
    setIsProvisioning(true);

    try {
      const result = await cooperativeProvisioningService.provision({
        ...reviewDraft.values,
        evidenceImages: reviewDraft.evidenceImages,
      });

      if (result.status === "session-expired") {
        sessionExpiryChannel.publish(result.message);
        return;
      }

      if (result.status === "invalid-input") {
        const message = formatMessage(result.message);
        setStep("details");
        if (result.field === "evidenceImages") {
          setEvidenceError(message);
        } else {
          setError(result.field, { message });
        }
        return;
      }

      if (
        result.status === "duplicate-owner" ||
        result.status === "verification-failed"
      ) {
        setFormError(formatMessage(result.message));
        setStep("details");
        return;
      }

      setSuccessName(result.summary.cooperativeName);
      setCredential(result.credential);
    } catch {
      setFormError(formatMessage({ code: "MSG04" }));
      setStep("details");
    } finally {
      setIsProvisioning(false);
    }
  }

  return { confirmProvisioning };
}
