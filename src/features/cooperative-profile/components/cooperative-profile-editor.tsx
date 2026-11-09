"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useToast } from "@/components/ui/toast-provider";
import { BusinessActivityEditor } from "@/features/cooperative-profile/components/business-activity-editor";
import { CooperativeProfileBankAccountSection } from "@/features/cooperative-profile/components/cooperative-profile-bank-account-section";
import {
  CooperativeProfileDetailsSidebar,
  CooperativeProfileFormActionBar,
  CooperativeProfileFormErrorAlert,
} from "@/features/cooperative-profile/components/cooperative-profile-details-panels";
import {
  getFieldElementId,
  serverFieldToFormField,
  toFormValues,
  toSaveInput,
} from "@/features/cooperative-profile/components/cooperative-profile-form-mapping";
import { CooperativeProfileFormSection } from "@/features/cooperative-profile/components/cooperative-profile-form-section";
import {
  CooperativeProfileContactSection,
  CooperativeProfileLegalSection,
} from "@/features/cooperative-profile/components/cooperative-profile-legal-and-contact-sections";
import { CooperativeProfilePreviewStep } from "@/features/cooperative-profile/components/cooperative-profile-preview-step";
import {
  CooperativeProfileStepIndicator,
  type CooperativeProfileEditorStep,
} from "@/features/cooperative-profile/components/cooperative-profile-step-indicator";
import type {
  BankOption,
  CooperativeProfile,
  CooperativeProfileField,
  SaveCooperativeProfileInput,
} from "@/features/cooperative-profile/domain/cooperative-profile";
import {
  cooperativeProfileSchema,
  type CooperativeProfileFormValues,
} from "@/features/cooperative-profile/schemas/cooperative-profile-schema";
import { useBusinessActivityRows } from "@/features/cooperative-profile/components/use-business-activity-rows";
import { cooperativeProfileService } from "@/features/cooperative-profile/services/cooperative-profile-service.instance";
import { formatMessage } from "@/shared/messages/message-catalog";
import { sessionExpiryChannel } from "@/shared/session/session-expiry-channel";

type CooperativeProfileEditorProps = Readonly<{
  banks: readonly BankOption[];
  onProfileChange(profile: CooperativeProfile): void;
  onReload(): void;
  profile: CooperativeProfile;
}>;

export function CooperativeProfileEditor({
  banks,
  onProfileChange,
  onReload,
  profile,
}: CooperativeProfileEditorProps) {
  const { notify } = useToast();
  // Guards async work: ignore results after unmount, block double saves, and drop stale validations.
  const lifetime = useRef<{ active: boolean; saving: boolean; validation: number } | null>(null);
  useEffect(() => {
    const scope = { active: true, saving: false, validation: 0 };
    lifetime.current = scope;
    return () => { scope.active = false; };
  }, []);
  const previewHeadingRef = useRef<HTMLHeadingElement>(null);
  const initialValues = toFormValues(profile);
  const [draft, setDraft] = useState<SaveCooperativeProfileInput>();
  const [formError, setFormError] = useState<string>();
  const [hasConflict, setHasConflict] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [step, setStep] = useState<CooperativeProfileEditorStep>("details");
  const {
    clearErrors,
    formState: { errors, isDirty },
    handleSubmit,
    register,
    reset,
    setError,
    setValue,
  } = useForm<CooperativeProfileFormValues>({
    defaultValues: initialValues,
    resolver: zodResolver(cooperativeProfileSchema),
  });
  const { activityRows, addActivity, removeActivity, resetActivityRows, updateActivity } =
    useBusinessActivityRows(initialValues.businessActivities, { clearErrors, setValue });
  const businessActivitiesError =
    errors.businessActivities?.message ?? errors.businessActivities?.[0]?.message;

  useEffect(() => {
    if (step === "preview") previewHeadingRef.current?.focus();
  }, [step]);

  function openPreview(values: CooperativeProfileFormValues) {
    setFormError(undefined);
    setHasConflict(false);
    setDraft(toSaveInput(values, profile.recordVersion));
    setStep("preview");
  }

  function cancelChanges() {
    if (lifetime.current) lifetime.current.validation++;
    const values = toFormValues(profile);
    reset(values);
    resetActivityRows(values.businessActivities);
    setFormError(undefined);
    setHasConflict(false);
  }

  function showServerFieldError(field: CooperativeProfileField, message: string) {
    setError(serverFieldToFormField(field), { message });
    setStep("details");
    const elementId = getFieldElementId(field, activityRows[0]?.id);
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

  if (step === "preview" && draft) {
    return (
      <div className="space-y-5">
        <CooperativeProfileStepIndicator currentStep={step} />
        <CooperativeProfilePreviewStep
          draft={draft}
          headingRef={previewHeadingRef}
          isSaving={isSaving}
          onBack={() => setStep("details")}
          onConfirm={() => void confirmSave()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <CooperativeProfileStepIndicator currentStep={step} />
      <form noValidate onSubmit={(event) => {
        const scope = lifetime.current;
        const attempt = scope ? ++scope.validation : undefined;
        void handleSubmit((values) => {
          if (scope?.active && attempt === scope.validation) openPreview(values);
        })(event);
      }}>
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="min-w-0 space-y-6">
            <CooperativeProfileLegalSection errors={errors} register={register} />
            <CooperativeProfileContactSection errors={errors} register={register} />
            <CooperativeProfileFormSection
              description="Danh sách này phải có ít nhất một ngành nghề."
              title="Hoạt động kinh doanh"
            >
              <div className="mt-5">
                <BusinessActivityEditor
                  error={businessActivitiesError}
                  onAdd={addActivity}
                  onChange={updateActivity}
                  onRemove={removeActivity}
                  rows={activityRows}
                />
              </div>
            </CooperativeProfileFormSection>
            <CooperativeProfileBankAccountSection banks={banks} errors={errors} register={register} />
          </div>

          <CooperativeProfileDetailsSidebar />
        </div>

        {formError && (
          <CooperativeProfileFormErrorAlert
            hasConflict={hasConflict}
            message={formError}
            onReloadLatest={() => {
              setHasConflict(false);
              onReload();
            }}
          />
        )}

        <CooperativeProfileFormActionBar isDirty={isDirty} onCancel={cancelChanges} />
      </form>
    </div>
  );
}
