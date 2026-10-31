"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { FormField } from "@/components/form/form-field";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { EvidenceImagePicker } from "@/features/cooperative-provisioning/components/evidence-image-picker";
import { OneTimeOwnerCredentialDialog } from "@/features/cooperative-provisioning/components/one-time-owner-credential-dialog";
import type { ProvisionedOwnerCredential } from "@/features/cooperative-provisioning/domain/provisioned-owner-credential";
import {
  cooperativeProvisioningSchema,
  type CooperativeProvisioningFormValues,
  validateEvidenceImage,
} from "@/features/cooperative-provisioning/schemas/cooperative-provisioning-schema";
import { cooperativeProvisioningService } from "@/features/cooperative-provisioning/services/cooperative-provisioning-service.instance";
import { formatMessage } from "@/shared/messages/message-catalog";
import { sessionExpiryChannel } from "@/shared/session/session-expiry-channel";

type Step = "details" | "review";

type ReviewDraft = Readonly<{
  evidenceImages: readonly File[];
  values: CooperativeProvisioningFormValues;
}>;

function StepIndicator({ currentStep }: { currentStep: Step }) {
  const steps = [
    { id: "details", label: "Thông tin" },
    { id: "review", label: "Xác nhận" },
  ] as const;

  return (
    <ol aria-label="Tiến trình khởi tạo hợp tác xã" className="grid grid-cols-2 gap-2">
      {steps.map((step, index) => {
        const isCurrent = currentStep === step.id;
        const isComplete = currentStep === "review" && step.id === "details";

        return (
          <li
            aria-current={isCurrent ? "step" : undefined}
            className={`flex min-h-11 items-center gap-2 rounded-control border px-3 text-sm font-semibold ${
              isCurrent
                ? "border-primary bg-primary-soft text-primary-hover"
                : isComplete
                  ? "border-success/30 bg-emerald-50 text-success"
                  : "border-border bg-surface text-text-muted"
            }`}
            key={step.id}
          >
            <span
              aria-hidden="true"
              className="grid size-6 shrink-0 place-items-center rounded-full border border-current text-xs"
            >
              {isComplete ? "✓" : index + 1}
            </span>
            {step.label}
          </li>
        );
      })}
    </ol>
  );
}

function ReviewSection({ draft }: { draft: ReviewDraft }) {
  return (
    <dl className="divide-y divide-border rounded-card border border-border bg-surface-subtle/50 px-4">
      <div className="py-4 sm:grid sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-4">
        <dt className="text-sm font-semibold text-text-muted">Tên hợp tác xã</dt>
        <dd className="mt-1 break-words font-medium text-text sm:mt-0">
          {draft.values.cooperativeName}
        </dd>
      </div>
      <div className="py-4 sm:grid sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-4">
        <dt className="text-sm font-semibold text-text-muted">Mã sơ bộ</dt>
        <dd className="mt-1 break-words font-medium text-text sm:mt-0">
          {draft.values.preliminaryCode}
        </dd>
      </div>
      <div className="py-4 sm:grid sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-4">
        <dt className="text-sm font-semibold text-text-muted">
          Danh tính / liên hệ Owner
        </dt>
        <dd className="mt-1 whitespace-pre-wrap break-words text-text sm:mt-0">
          {draft.values.ownerIdentityContact}
        </dd>
      </div>
      <div className="py-4 sm:grid sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-4">
        <dt className="text-sm font-semibold text-text-muted">Ảnh xác minh</dt>
        <dd className="mt-2 space-y-1 sm:mt-0">
          {draft.evidenceImages.map((file) => (
            <p
              className="break-all text-sm font-medium text-text"
              key={`${file.name}:${file.size}:${file.lastModified}`}
            >
              {file.name}
            </p>
          ))}
        </dd>
      </div>
    </dl>
  );
}

export function CooperativeProvisioningForm() {
  const { notify } = useToast();
  const reviewHeadingRef = useRef<HTMLHeadingElement>(null);
  const [credential, setCredential] = useState<ProvisionedOwnerCredential>();
  const [evidenceError, setEvidenceError] = useState<string>();
  const [evidenceImages, setEvidenceImages] = useState<readonly File[]>([]);
  const [formError, setFormError] = useState<string>();
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [reviewDraft, setReviewDraft] = useState<ReviewDraft>();
  const [step, setStep] = useState<Step>("details");
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
        "Tài khoản Owner đang ở trạng thái hoạt động và phải đổi mật khẩu khi đăng nhập lần đầu.",
      title: `${provisionedCooperativeName ?? "Hợp tác xã"} đã được khởi tạo`,
      tone: "success",
    });
  }

  return (
    <>
      <div className="space-y-5">
        <StepIndicator currentStep={step} />

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
                hint="Mã nhận diện tạm thời trước khi Owner hoàn thiện hồ sơ."
                id="preliminary-code"
                label="Mã sơ bộ"
                placeholder="Ví dụ: TN-2026"
                required
                {...register("preliminaryCode")}
              />
            </div>

            <div>
              <label
                className="block text-sm font-semibold text-text"
                htmlFor="owner-identity-contact"
              >
                Danh tính và thông tin liên hệ của Owner đầu tiên
                <span aria-hidden="true" className="ml-1 text-danger">
                  *
                </span>
              </label>
              <p
                className="mt-1 text-sm leading-5 text-text-muted"
                id="owner-identity-contact-hint"
              >
                Nhập đúng nội dung trên hồ sơ đã dùng để đối chiếu và kênh liên hệ bàn giao.
              </p>
              <textarea
                aria-describedby={`owner-identity-contact-hint${
                  errors.ownerIdentityContact ? " owner-identity-contact-error" : ""
                }`}
                aria-invalid={errors.ownerIdentityContact ? true : undefined}
                className={`mt-2 min-h-32 w-full resize-y rounded-control border bg-surface px-3.5 py-3 text-base text-text shadow-sm outline-none transition placeholder:text-slate-400 ${
                  errors.ownerIdentityContact
                    ? "border-danger focus-visible:border-danger"
                    : "border-border-strong hover:border-slate-500 focus-visible:border-primary"
                }`}
                id="owner-identity-contact"
                placeholder="Họ tên, giấy tờ đã đối chiếu và số điện thoại hoặc email liên hệ"
                required
                {...register("ownerIdentityContact")}
              />
              {errors.ownerIdentityContact && (
                <p
                  className="mt-1.5 text-sm font-medium text-danger"
                  id="owner-identity-contact-error"
                  role="alert"
                >
                  {errors.ownerIdentityContact.message}
                </p>
              )}
            </div>

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
          <section aria-labelledby="provisioning-review-title" className="space-y-5">
            <div>
              <h2
                className="text-xl font-semibold text-text outline-none"
                id="provisioning-review-title"
                ref={reviewHeadingRef}
                tabIndex={-1}
              >
                Xác nhận trước khi tạo
              </h2>
              <p className="mt-2 text-sm leading-6 text-text-muted">
                Hãy đối chiếu lại hồ sơ giấy. Sau khi xác nhận, hệ thống tạo HTX sơ bộ và tài khoản Owner đầu tiên cùng lúc.
              </p>
            </div>

            {reviewDraft && <ReviewSection draft={reviewDraft} />}

            <div className="rounded-control border border-warning/30 bg-warning-soft p-4 text-sm leading-6 text-text">
              <p className="font-semibold text-warning">Chuẩn bị bàn giao trực tiếp</p>
              <p className="mt-1">
                Mật khẩu tạm thời chỉ hiển thị một lần sau khi tạo và có hiệu lực trong 24 giờ.
              </p>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
              <Button
                className="sm:w-auto"
                disabled={isProvisioning}
                onClick={returnToDetails}
                variant="secondary"
              >
                Quay lại chỉnh sửa
              </Button>
              <Button
                className="sm:w-auto sm:min-w-48"
                isPending={isProvisioning}
                onClick={() => void confirmProvisioning()}
                pendingLabel="Đang khởi tạo..."
              >
                Xác nhận và tạo
              </Button>
            </div>
          </section>
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
