import type { InputHTMLAttributes, ReactNode } from "react";
import type {
  FieldError,
  FieldErrors,
  UseFormRegister,
  UseFormRegisterReturn,
} from "react-hook-form";
import { accountInputStyles } from "@/features/account-management/components/account-editor-model";
import type { ManagedAccount } from "@/features/account-management/domain/account-management";
import type { AccountEditorValues } from "@/features/account-management/schemas/account-editor-schema";

type AccountTextFieldProps = Readonly<{
  error?: FieldError;
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
  label: ReactNode;
  registration: UseFormRegisterReturn;
}>;

/** Labelled text input with inline validation message. */
function AccountTextField({
  error,
  inputProps,
  label,
  registration,
}: AccountTextFieldProps) {
  return (
    <label className="min-w-0 text-sm font-semibold text-text">
      {label}
      <input
        aria-invalid={Boolean(error)}
        className={accountInputStyles}
        {...inputProps}
        {...registration}
      />
      {error && (
        <span className="mt-2 block font-normal text-danger">
          {error.message}
        </span>
      )}
    </label>
  );
}

function DeliveryChannelOption({
  label,
  registration,
  value,
}: Readonly<{
  label: string;
  registration: UseFormRegisterReturn;
  value: AccountEditorValues["deliveryChannel"];
}>) {
  return (
    <label className="flex min-h-12 flex-1 cursor-pointer items-center gap-3 rounded-control border border-border-strong px-4 py-3">
      <input type="radio" value={value} {...registration} />
      <span>{label}</span>
    </label>
  );
}

type AccountDetailsFieldsetProps = Readonly<{
  /** Undefined while creating a new account. */
  account?: ManagedAccount;
  errors: FieldErrors<AccountEditorValues>;
  register: UseFormRegister<AccountEditorValues>;
}>;

/** Name/contact fields; the activation channel is only chosen on create. */
export function AccountDetailsFieldset({
  account,
  errors,
  register,
}: AccountDetailsFieldsetProps) {
  return (
    <fieldset className="min-w-0">
      <legend className="text-lg font-semibold text-text">
        Thông tin tài khoản
      </legend>
      <p className="mt-1 text-sm leading-6 text-text-muted">
        Nhập ít nhất email hoặc số điện thoại. Nhân viên sẽ xác minh một
        trong các liên hệ này khi thiết lập tài khoản.
      </p>
      <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2">
        <AccountTextField
          error={errors.fullName}
          label={
            <>
              Họ và tên nhân viên <span className="text-danger">*</span>
            </>
          }
          registration={register("fullName")}
        />
        {account && (
          <div className="min-w-0 text-sm font-semibold text-text">
            Tên đăng nhập
            <p className={`${accountInputStyles} flex items-center`}>
              @{account.username}
            </p>
            <p className="mt-2 font-normal leading-5 text-text-muted">
              Tên đăng nhập không đổi khi cập nhật họ tên.
            </p>
          </div>
        )}
        <AccountTextField
          error={errors.phone}
          inputProps={{ inputMode: "tel" }}
          label="Số điện thoại"
          registration={register("phone")}
        />
        <AccountTextField
          error={errors.email}
          inputProps={{ autoCapitalize: "none", type: "email" }}
          label="Email"
          registration={register("email")}
        />
      </div>
      {!account && (
        <fieldset className="mt-5">
          <legend className="text-sm font-semibold text-text">
            Gửi thông tin kích hoạt qua
          </legend>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <DeliveryChannelOption
              label="SMS"
              registration={register("deliveryChannel")}
              value="phone"
            />
            <DeliveryChannelOption
              label="Email"
              registration={register("deliveryChannel")}
              value="email"
            />
          </div>
          {errors.deliveryChannel && (
            <p className="mt-2 text-sm text-danger">
              {errors.deliveryChannel.message}
            </p>
          )}
          <p className="mt-2 text-sm leading-6 text-text-muted">
            Nhân viên đăng nhập bằng số điện thoại. Hệ thống tự tạo mật khẩu
            tạm, sau đó gửi trực tiếp cho nhân viên. Chủ nhiệm HTX không nhìn
            thấy mật khẩu.
          </p>
        </fieldset>
      )}
    </fieldset>
  );
}
