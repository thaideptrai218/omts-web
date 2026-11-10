import { FormField } from "@/components/form/form-field";
import {
  CooperativeProfileFormSection,
  getControlBorderClassName,
  type CooperativeProfileFieldsProps,
} from "@/features/cooperative-profile/components/cooperative-profile-form-section";

export function CooperativeProfileLegalSection({ errors, register }: CooperativeProfileFieldsProps) {
  return (
    <CooperativeProfileFormSection
      description="Thông tin nhận diện chính thức trên hồ sơ pháp lý."
      title="Thông tin pháp lý"
    >
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
    </CooperativeProfileFormSection>
  );
}

export function CooperativeProfileContactSection({ errors, register }: CooperativeProfileFieldsProps) {
  return (
    <CooperativeProfileFormSection
      description="Kênh liên hệ của HTX, tách biệt với tài khoản cá nhân của Chủ nhiệm HTX."
      title="Địa chỉ và liên hệ"
    >
      <div className="mt-5 space-y-5">
        <div>
          <label className="block text-sm font-semibold text-text" htmlFor="office-address">
            Địa chỉ chi tiết văn phòng
            <span aria-hidden="true" className="ml-1 text-danger">*</span>
          </label>
          <textarea
            aria-describedby={errors.officeAddress ? "office-address-error" : undefined}
            aria-invalid={errors.officeAddress ? true : undefined}
            className={`mt-2 min-h-24 w-full resize-y rounded-control border bg-surface px-3.5 py-3 text-base text-text shadow-sm outline-none transition ${getControlBorderClassName(
              Boolean(errors.officeAddress),
            )}`}
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
    </CooperativeProfileFormSection>
  );
}
