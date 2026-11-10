import { FormField } from "@/components/form/form-field";
import {
  CooperativeProfileFormSection,
  getControlBorderClassName,
  type CooperativeProfileFieldsProps,
} from "@/features/cooperative-profile/components/cooperative-profile-form-section";
import type { BankOption } from "@/features/cooperative-profile/domain/cooperative-profile";

type CooperativeProfileBankAccountSectionProps = CooperativeProfileFieldsProps &
  Readonly<{ banks: readonly BankOption[] }>;

/** Receiving bank account used for VietQR payments; never shown on the public tracing page. */
export function CooperativeProfileBankAccountSection({
  banks,
  errors,
  register,
}: CooperativeProfileBankAccountSectionProps) {
  return (
    <CooperativeProfileFormSection
      description="Dùng khi tạo VietQR thanh toán; không hiển thị trên trang truy xuất."
      title="Tài khoản nhận chuyển khoản"
    >
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-text" htmlFor="receiving-bank">
            Ngân hàng<span aria-hidden="true" className="ml-1 text-danger">*</span>
          </label>
          <select
            aria-describedby={errors.bankId ? "receiving-bank-error" : undefined}
            aria-invalid={errors.bankId ? true : undefined}
            className={`mt-2 min-h-12 w-full rounded-control border bg-surface px-3.5 py-2.5 text-base text-text shadow-sm outline-none transition ${getControlBorderClassName(
              Boolean(errors.bankId),
            )}`}
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
    </CooperativeProfileFormSection>
  );
}
