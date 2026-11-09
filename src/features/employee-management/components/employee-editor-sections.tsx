import { Controller, type UseFormReturn } from "react-hook-form";
import { VietnameseDateInput } from "@/components/form/vietnamese-date-input";
import type { EmployeeEditorValues } from "@/features/employee-management/schemas/employee-editor-schema";
import { employeeBusinessDate } from "../schemas/employee-date-only";
import { EmployeeEditorField } from "./employee-editor-field";
import {
  employeeInputStyles,
  employeeTextareaStyles,
  type EmployeeControlProps,
} from "./employee-editor-form-model";
import { employeePersonalHints } from "./employee-personal-hints";

export type EmployeeEditorSectionProps = Readonly<{
  controlProps(field: keyof EmployeeEditorValues): EmployeeControlProps;
  form: UseFormReturn<EmployeeEditorValues>;
}>;

/** Name, phone, birthday and (create only) the fixed initial status. */
export function EmployeeIdentitySection({
  controlProps,
  form,
  isCreate,
}: EmployeeEditorSectionProps & Readonly<{ isCreate: boolean }>) {
  const { formState: { errors }, register } = form;

  return (
    <fieldset className="min-w-0">
      <legend className="text-lg font-semibold text-text">Thông tin nhận diện</legend>
      <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2">
        <EmployeeEditorField
          id={controlProps("fullName").id}
          label="Họ và tên"
          required
          hint={employeePersonalHints.fullName}
          error={errors.fullName?.message}
        >
          <input
            {...controlProps("fullName")}
            aria-required="true"
            autoComplete="name"
            className={employeeInputStyles}
            {...register("fullName")}
          />
        </EmployeeEditorField>
        <EmployeeEditorField
          id={controlProps("phone").id}
          label="Số điện thoại"
          required
          hint={employeePersonalHints.phone}
          error={errors.phone?.message}
        >
          <input
            {...controlProps("phone")}
            aria-required="true"
            autoComplete="tel"
            className={employeeInputStyles}
            inputMode="tel"
            {...register("phone")}
          />
        </EmployeeEditorField>
        <EmployeeEditorField
          id={controlProps("birthday").id}
          label="Ngày sinh"
          optional
          hint={employeePersonalHints.birthday}
          error={errors.birthday?.message}
        >
          <Controller name="birthday" control={form.control} render={({ field }) => (
            <VietnameseDateInput
              {...controlProps("birthday")}
              className={employeeInputStyles}
              calendarLabel="Chọn ngày sinh"
              max={employeeBusinessDate(new Date())}
              value={field.value}
              inputRef={field.ref}
              name={field.name}
              onBlur={field.onBlur}
              onValueChange={field.onChange}
            />
          )} />
        </EmployeeEditorField>
        {isCreate && (
          <EmployeeEditorField id={controlProps("status").id} label="Trạng thái">
            <output
              {...controlProps("status")}
              className="mt-2 flex min-h-12 items-center rounded-control border border-border bg-surface-subtle px-3 text-text"
            >
              Đang làm việc
            </output>
          </EmployeeEditorField>
        )}
      </div>
    </fieldset>
  );
}

const ADDRESS_FIELDS = [
  { name: "address", label: "Địa chỉ" },
  { name: "area", label: "Khu vực" },
  { name: "wardCommune", label: "Phường/Xã" },
] as const;

const NOTE_FIELDS = [
  { name: "otherInformation", label: "Thông tin khác" },
  { name: "notes", label: "Ghi chú" },
] as const;

/** Optional address and free-text notes. */
export function EmployeeAdditionalInfoSection({ controlProps, form }: EmployeeEditorSectionProps) {
  const { formState: { errors }, register } = form;

  return (
    <fieldset className="min-w-0 border-t border-border pt-6">
      <legend className="text-lg font-semibold text-text">Thông tin bổ sung</legend>
      <p className="mt-1 text-sm leading-6 text-text-muted">
        Các trường dưới đây không bắt buộc và có thể cập nhật sau.
      </p>
      <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2">
        {ADDRESS_FIELDS.map(({ name, label }) => (
          <EmployeeEditorField
            key={name}
            id={controlProps(name).id}
            label={label}
            hint={employeePersonalHints[name]}
            error={errors[name]?.message}
          >
            <input {...controlProps(name)} className={employeeInputStyles} {...register(name)} />
          </EmployeeEditorField>
        ))}
      </div>
      <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-2">
        {NOTE_FIELDS.map(({ name, label }) => (
          <EmployeeEditorField
            key={name}
            id={controlProps(name).id}
            label={label}
            hint={employeePersonalHints[name]}
            error={errors[name]?.message}
          >
            <textarea {...controlProps(name)} className={employeeTextareaStyles} {...register(name)} />
          </EmployeeEditorField>
        ))}
      </div>
    </fieldset>
  );
}
