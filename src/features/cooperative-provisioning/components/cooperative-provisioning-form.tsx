"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { FormField } from "@/components/form/form-field";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import {
  CooperativeProvisioningReviewStep,
  type CooperativeProvisioningReviewDraft,
} from "@/features/cooperative-provisioning/components/cooperative-provisioning-review-step";
import {
  CooperativeProvisioningStepIndicator,
  type CooperativeProvisioningStep,
} from "@/features/cooperative-provisioning/components/cooperative-provisioning-step-indicator";
import { EvidenceImagePicker } from "@/features/cooperative-provisioning/components/evidence-image-picker";
import { OneTimeOwnerCredentialDialog } from "@/features/cooperative-provisioning/components/one-time-owner-credential-dialog";
import { OwnerIdentityContactField } from "@/features/cooperative-provisioning/components/owner-identity-contact-field";
import { useCooperativeProvisioningSubmit } from "@/features/cooperative-provisioning/components/use-cooperative-provisioning-submit";
import type { ProvisionedOwnerCredential } from "@/features/cooperative-provisioning/domain/provisioned-owner-credential";
import {
  cooperativeProvisioningSchema,
  type CooperativeProvisioningFormValues,
  validateEvidenceImage,
} from "@/features/cooperative-provisioning/schemas/cooperative-provisioning-schema";

export function CooperativeProvisioningForm() {
  const { notify } = useToast();
  const reviewHeadingRef = useRef<HTMLHeadingElement>(null);
  const [credential, setCredential] = useState<ProvisionedOwnerCredential>();
  const [evidenceError, setEvidenceError] = useState<string>();
  const [evidenceImages, setEvidenceImages] = useState<readonly File[]>([]);
  const [formError, setFormError] = useState<string>();
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [reviewDraft, setReviewDraft] = useState<CooperativeProvisioningReviewDraft>();
  const [step, setStep] = useState<CooperativeProvisioningStep>("details");
  const [successName, setSuccessName] = useState<string>();
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
    setError,
  } = useForm<CooperativeProvisioningFormValues>({
    defaultValues: {
      cooperativeName: "",
      ownerIdentityContact: "",
      preliminaryCode: "",
    },
    resolver: zodResolver(cooperativeProvisioningSchema),
  });

  useEffect(() => {
    if (step === "review") reviewHeadingRef.current?.focus();
  }, [step]);

  function openReview(values: CooperativeProvisioningFormValues) {
    setFormError(undefined);

    if (evidenceImages.length === 0) {
      setEvidenceError("Hãy thêm ít nhất một ảnh làm căn cứ xác minh.");
      return;
    }

    setEvidenceError(undefined);
    setReviewDraft({ evidenceImages, values });
    setStep("review");
  }

  function returnToDetails() {
    setFormError(undefined);
    setStep("details");
  }

  const { confirmProvisioning } = useCooperativeProvisioningSubmit({
    isProvisioning,
    reviewDraft,
    setCredential,
    setError,
    setEvidenceError,
    setFormError,
    setIsProvisioning,
    setStep,
    setSuccessName,
  });

  function acknowledgeCredential() {
    const provisionedCooperativeName = successName;
    setCredential(undefined);
    setSuccessName(undefined);
    setReviewDraft(undefined);
    setEvidenceImages([]);
    setEvidenceError(undefined);
    setFormError(undefined);
    setStep("details");
    reset();

    notify({
      description:
        "Tài khoản Chủ nhiệm HTX đang hoạt động và phải đổi mật khẩu khi đăng nhập lần đầu.",
      title: `${provisionedCooperativeName ?? "Hợp tác xã"} đã được khởi tạo`,
      tone: "success",
    });
  }

  return (
    <>
      <div className="space-y-5">
        <CooperativeProvisioningStepIndicator currentStep={step} />

        {step === "details" ? (
          <form className="space-y-5" noValidate onSubmit={handleSubmit(openReview)}>
            <div className="grid gap-5 md:grid-cols-2">
              <FormField
                autoComplete="organization"
                error={errors.cooperativeName?.message}
                id="cooperative-name"
                label="Tên ban đầu của hợp tác xã"
                placeholder="Ví dụ: Hợp tác xã nuôi trồng thủy sản Trung Nam"
                required
                {...register("cooperativeName")}
              />
              <FormField
                autoCapitalize="characters"
                error={errors.preliminaryCode?.message}
                hint="Mã nhận diện tạm thời trước khi Chủ nhiệm HTX hoàn thiện hồ sơ."
                id="preliminary-code"
                label="Mã sơ bộ"
                placeholder="Ví dụ: TN-2026"
                required
                {...register("preliminaryCode")}
              />
            </div>

            <OwnerIdentityContactField
              error={errors.ownerIdentityContact?.message}
              hasError={Boolean(errors.ownerIdentityContact)}
              registration={register("ownerIdentityContact")}
            />

            <EvidenceImagePicker
              error={evidenceError}
              files={evidenceImages}
              onFilesChange={(files) => {
                setEvidenceImages(files);
                if (files.length > 0) setEvidenceError(undefined);
              }}
              validateFile={validateEvidenceImage}
            />

            {formError && (
              <p
                className="rounded-control border border-danger/30 bg-danger/10 p-4 text-sm leading-6 text-danger"
                role="alert"
              >
                {formError}
              </p>
            )}

            <div className="flex justify-end border-t border-border pt-5">
              <Button className="sm:w-auto sm:min-w-48" type="submit">
                Kiểm tra thông tin
              </Button>
            </div>
          </form>
        ) : (
          <CooperativeProvisioningReviewStep
            draft={reviewDraft}
            headingRef={reviewHeadingRef}
            isProvisioning={isProvisioning}
            onBack={returnToDetails}
            onConfirm={() => void confirmProvisioning()}
          />
        )}
      </div>

      {credential && (
        <OneTimeOwnerCredentialDialog
          credential={credential}
          onAcknowledge={acknowledgeCredential}
        />
      )}
    </>
  );
}
