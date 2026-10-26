"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { FormField } from "@/components/form/form-field";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import {
  BusinessActivityEditor,
  type BusinessActivityRow,
} from "@/features/cooperative-profile/components/business-activity-editor";
import { PublicCooperativePreview } from "@/features/cooperative-profile/components/public-cooperative-preview";
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
import { cooperativeProfileService } from "@/features/cooperative-profile/services/cooperative-profile-service.instance";
import { formatMessage } from "@/shared/messages/message-catalog";
import { sessionExpiryChannel } from "@/shared/session/session-expiry-channel";

type CooperativeProfileEditorProps = Readonly<{
  banks: readonly BankOption[];
  onProfileChange(profile: CooperativeProfile): void;
  onReload(): void;
  profile: CooperativeProfile;
}>;

type Step = "details" | "preview";

function toFormValues(profile: CooperativeProfile): CooperativeProfileFormValues {
  return {
    bankAccountHolder: profile.receivingBankAccount.accountHolder,
    bankAccountNumber: profile.receivingBankAccount.accountNumber,
    bankId: profile.receivingBankAccount.bankId,
    businessActivities:
      profile.businessActivities.length > 0 ? [...profile.businessActivities] : [""],
    cooperativeName: profile.cooperativeName,
    email: profile.email ?? "",
    legalRepresentative: profile.legalRepresentative,
    officeAddress: profile.officeAddress,
    phone: profile.phone,
    taxId: profile.taxId,
    website: profile.website ?? "",
  };
}

function toSaveInput(
  values: CooperativeProfileFormValues,
  recordVersion: string,
): SaveCooperativeProfileInput {
  return {
    businessActivities: values.businessActivities,
    cooperativeName: values.cooperativeName,
    email: values.email,
    legalRepresentative: values.legalRepresentative,
    officeAddress: values.officeAddress,
    phone: values.phone,
    receivingBankAccount: {
      accountHolder: values.bankAccountHolder,
      accountNumber: values.bankAccountNumber,
      bankId: values.bankId,
    },
    recordVersion,
    taxId: values.taxId,
    website: values.website,
  };
}

function createActivityRows(values: readonly string[]): BusinessActivityRow[] {
  return values.map((value, index) => ({ id: `activity-${index + 1}`, value }));
}

function SectionHeading({ children, description }: Readonly<{ children: string; description: string }>) {
  return (
    <div className="border-b border-border pb-4">
      <h2 className="text-lg font-semibold text-text">{children}</h2>
      <p className="mt-1 text-sm leading-6 text-text-muted">{description}</p>
    </div>
  );
}

function StepIndicator({ currentStep }: Readonly<{ currentStep: Step }>) {
  return (
    <ol aria-label="Tiến trình cập nhật hồ sơ" className="grid grid-cols-2 gap-2">
      {[
        { id: "details", label: "Thông tin hồ sơ" },
        { id: "preview", label: "Xem trước công khai" },
      ].map((step, index) => {
        const isCurrent = currentStep === step.id;
        const isComplete = currentStep === "preview" && step.id === "details";

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
            <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-full border border-current text-xs">
              {isComplete ? "✓" : index + 1}
            </span>
            {step.label}
          </li>
        );
      })}
    </ol>
  );
}

function serverFieldToFormField(field: CooperativeProfileField) {
  return field as keyof CooperativeProfileFormValues;
}

export function CooperativeProfileEditor({
  banks,
  onProfileChange,
  onReload,
  profile,
}: CooperativeProfileEditorProps) {
  const { notify } = useToast();
  const activitySequence = useRef(10);
  const previewHeadingRef = useRef<HTMLHeadingElement>(null);
  const initialValues = toFormValues(profile);
  const [activityRows, setActivityRows] = useState(() =>
    createActivityRows(initialValues.businessActivities),
  );
  const [draft, setDraft] = useState<SaveCooperativeProfileInput>();
  const [formError, setFormError] = useState<string>();
  const [hasConflict, setHasConflict] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [step, setStep] = useState<Step>("details");
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
  const businessActivitiesError =
    errors.businessActivities?.message ?? errors.businessActivities?.[0]?.message;

  useEffect(() => {
    if (step === "preview") previewHeadingRef.current?.focus();
  }, [step]);

  function updateActivities(rows: readonly BusinessActivityRow[]) {
    setActivityRows([...rows]);
    setValue(
      "businessActivities",
      rows.map((row) => row.value),
      { shouldDirty: true, shouldValidate: true },
    );
  }

  function addActivity() {
    activitySequence.current += 1;
    const id = `activity-${activitySequence.current}`;
    updateActivities([...activityRows, { id, value: "" }]);
    requestAnimationFrame(() => document.getElementById(`business-activity-${id}`)?.focus());
  }

  function removeActivity(id: string) {
    if (activityRows.length === 1) return;
    updateActivities(activityRows.filter((row) => row.id !== id));
  }

  function updateActivity(id: string, value: string) {
    clearErrors("businessActivities");
    updateActivities(
      activityRows.map((row) => (row.id === id ? { ...row, value } : row)),
    );
  }

  function openPreview(values: CooperativeProfileFormValues) {
    setFormError(undefined);
    setHasConflict(false);
    setDraft(toSaveInput(values, profile.recordVersion));
    setStep("preview");
  }

  function cancelChanges() {
    const values = toFormValues(profile);
    reset(values);
    setActivityRows(createActivityRows(values.businessActivities));
    setFormError(undefined);
    setHasConflict(false);
  }

  function showServerFieldError(field: CooperativeProfileField, message: string) {
    setError(serverFieldToFormField(field), { message });
    setStep("details");
    const elementIds: Record<CooperativeProfileField, string> = {
      bankAccountHolder: "bank-account-holder",
      bankAccountNumber: "bank-account-number",
      bankId: "receiving-bank",
      businessActivities: `business-activity-${activityRows[0]?.id ?? "activity-1"}`,
      cooperativeName: "cooperative-name",
      email: "cooperative-email",
      legalRepresentative: "legal-representative",
      officeAddress: "office-address",
      phone: "cooperative-phone",
      taxId: "cooperative-tax-id",
      website: "cooperative-website",
    };

    requestAnimationFrame(() => document.getElementById(elementIds[field])?.focus());
  }

  async function confirmSave() {
    if (!draft || isSaving) return;

    setFormError(undefined);
    setHasConflict(false);
    setIsSaving(true);

    try {
      const result = await cooperativeProfileService.save(draft);

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
      setFormError(formatMessage({ code: "MSG04" }));
      setStep("details");
    } finally {
      setIsSaving(false);
    }
  }

  if (step === "preview" && draft) {
    return (
      <div className="space-y-5">
        <StepIndicator currentStep={step} />
        <section className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-7">
          <div className="mx-auto max-w-2xl">
            <h2
              className="text-2xl font-semibold tracking-tight text-text outline-none"
              ref={previewHeadingRef}
              tabIndex={-1}
            >
              Kiểm tra thông tin công khai
            </h2>
            <p className="mt-2 leading-7 text-text-muted">
              Đây là phần thông tin HTX sẽ xuất hiện trên trang truy xuất từ lần công bố tiếp theo.
            </p>

            <div className="mt-6">
              <PublicCooperativePreview
                projection={{
                  cooperativeName: draft.cooperativeName,
                  officeAddress: draft.officeAddress,
                }}
              />
            </div>

            <div className="mt-5 rounded-control border border-border bg-surface-subtle p-4 text-sm leading-6 text-text-muted">
              Mã số thuế, thông tin liên hệ, ngành nghề và tài khoản ngân hàng không xuất hiện trong phần xem trước công khai này. Các QR đã công bố trước đó vẫn giữ thông tin tại thời điểm công bố.
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
              <Button
                className="sm:w-auto"
                disabled={isSaving}
                onClick={() => setStep("details")}
                variant="secondary"
              >
                Quay lại chỉnh sửa
              </Button>
              <Button
                className="sm:w-auto sm:min-w-48"
                isPending={isSaving}
                onClick={() => void confirmSave()}
                pendingLabel="Đang lưu hồ sơ..."
              >
                Xác nhận và lưu
              </Button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <StepIndicator currentStep={step} />
      <form noValidate onSubmit={handleSubmit(openPreview)}>
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="min-w-0 space-y-6">
            <section className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-7">
              <SectionHeading description="Thông tin nhận diện chính thức trên hồ sơ pháp lý.">
                Thông tin pháp lý
              </SectionHeading>
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <FormField
                  autoComplete="organization"
                  error={errors.cooperativeName?.message}
                  id="cooperative-name"
                  label="Tên đầy đủ của hợp tác xã"
                  required
                  {...register("cooperativeName")}
                />
                <FormField
                  error={errors.taxId?.message}
                  id="cooperative-tax-id"
                  inputMode="numeric"
                  label="Mã số thuế"
                  placeholder="10 chữ số hoặc 10 chữ số-3 chữ số"
                  required
                  {...register("taxId")}
                />
                <FormField
                  autoComplete="name"
                  error={errors.legalRepresentative?.message}
                  id="legal-representative"
                  label="Người đại diện theo pháp luật"
                  required
                  {...register("legalRepresentative")}
                />
              </div>
            </section>

            <section className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-7">
              <SectionHeading description="Kênh liên hệ của HTX, tách biệt với tài khoản cá nhân của Owner.">
                Địa chỉ và liên hệ
              </SectionHeading>
              <div className="mt-5 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-text" htmlFor="office-address">
                    Địa chỉ chi tiết văn phòng
                    <span aria-hidden="true" className="ml-1 text-danger">*</span>
                  </label>
                  <textarea
                    aria-describedby={errors.officeAddress ? "office-address-error" : undefined}
                    aria-invalid={errors.officeAddress ? true : undefined}
                    className={`mt-2 min-h-24 w-full resize-y rounded-control border bg-surface px-3.5 py-3 text-base text-text shadow-sm outline-none transition ${
                      errors.officeAddress
                        ? "border-danger focus-visible:border-danger"
                        : "border-border-strong hover:border-slate-500 focus-visible:border-primary"
                    }`}
                    id="office-address"
                    required
                    {...register("officeAddress")}
                  />
                  {errors.officeAddress && (
                    <p className="mt-1.5 text-sm font-medium text-danger" id="office-address-error" role="alert">
                      {errors.officeAddress.message}
                    </p>
                  )}
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                  <FormField
                    autoComplete="tel"
                    error={errors.phone?.message}
                    id="cooperative-phone"
                    inputMode="tel"
                    label="Số điện thoại"
                    required
                    {...register("phone")}
                  />
                  <FormField
                    autoComplete="email"
                    error={errors.email?.message}
                    id="cooperative-email"
                    label="Email"
                    type="email"
                    {...register("email")}
                  />
                  <div className="md:col-span-2">
                    <FormField
                      autoComplete="url"
                      error={errors.website?.message}
                      id="cooperative-website"
                      label="Website"
                      placeholder="https://..."
                      type="url"
                      {...register("website")}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-7">
              <SectionHeading description="Danh sách này phải có ít nhất một ngành nghề.">
                Hoạt động kinh doanh
              </SectionHeading>
              <div className="mt-5">
                <BusinessActivityEditor
                  error={businessActivitiesError}
                  onAdd={addActivity}
                  onChange={updateActivity}
                  onRemove={removeActivity}
                  rows={activityRows}
                />
              </div>
            </section>

            <section className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-7">
              <SectionHeading description="Dùng khi tạo VietQR thanh toán; không hiển thị trên trang truy xuất.">
                Tài khoản nhận chuyển khoản
              </SectionHeading>
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-text" htmlFor="receiving-bank">
                    Ngân hàng<span aria-hidden="true" className="ml-1 text-danger">*</span>
                  </label>
                  <select
                    aria-describedby={errors.bankId ? "receiving-bank-error" : undefined}
                    aria-invalid={errors.bankId ? true : undefined}
                    className={`mt-2 min-h-12 w-full rounded-control border bg-surface px-3.5 py-2.5 text-base text-text shadow-sm outline-none transition ${
                      errors.bankId
                        ? "border-danger focus-visible:border-danger"
                        : "border-border-strong hover:border-slate-500 focus-visible:border-primary"
                    }`}
                    id="receiving-bank"
                    required
                    {...register("bankId")}
                  >
                    <option value="">Chọn ngân hàng</option>
                    {banks.map((bank) => (
                      <option key={bank.id} value={bank.id}>
                        {bank.shortName} — {bank.name}
                      </option>
                    ))}
                  </select>
                  {errors.bankId && (
                    <p className="mt-1.5 text-sm font-medium text-danger" id="receiving-bank-error" role="alert">
                      {errors.bankId.message}
                    </p>
                  )}
                </div>
                <FormField
                  autoComplete="off"
                  error={errors.bankAccountNumber?.message}
                  id="bank-account-number"
                  inputMode="numeric"
                  label="Số tài khoản"
                  required
                  {...register("bankAccountNumber")}
                />
                <FormField
                  autoComplete="name"
                  error={errors.bankAccountHolder?.message}
                  id="bank-account-holder"
                  label="Tên chủ tài khoản"
                  required
                  {...register("bankAccountHolder")}
                />
              </div>
            </section>
          </div>

          <aside className="min-w-0 space-y-4 xl:sticky xl:top-24">
            <section className="rounded-card border border-primary/20 bg-primary-soft p-5 text-primary-hover">
              <p className="text-sm font-semibold">Bước tiếp theo</p>
              <h2 className="mt-2 text-lg font-semibold">Xem trước trước khi lưu</h2>
              <p className="mt-2 text-sm leading-6">
                Bạn sẽ kiểm tra riêng tên và địa chỉ xuất hiện trên trang truy xuất công khai.
              </p>
            </section>
            <section className="rounded-card border border-border bg-surface p-5 text-sm leading-6 text-text-muted shadow-card">
              <h2 className="font-semibold text-text">Dữ liệu được bảo vệ</h2>
              <p className="mt-2">
                Tài khoản ngân hàng, mã số thuế và thông tin liên hệ không hiển thị trong preview truy xuất.
              </p>
            </section>
          </aside>
        </div>

        {formError && (
          <div className="mt-6 rounded-control border border-danger/30 bg-danger/10 p-4 text-sm leading-6 text-danger" role="alert">
            <p>{formError}</p>
            {hasConflict && (
              <button
                className="mt-2 min-h-11 rounded-control px-3 font-semibold underline underline-offset-4"
                onClick={() => {
                  setHasConflict(false);
                  onReload();
                }}
                type="button"
              >
                Tải dữ liệu mới nhất
              </button>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 rounded-card border border-border bg-surface p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-text-muted">
            {isDirty ? "Bạn có thay đổi chưa lưu." : "Hồ sơ đang hiển thị dữ liệu mới nhất."}
          </p>
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button className="sm:w-auto" disabled={!isDirty} onClick={cancelChanges} variant="secondary">
              Hủy thay đổi
            </Button>
            <Button className="sm:w-auto sm:min-w-48" type="submit">
              Kiểm tra trước khi lưu
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
