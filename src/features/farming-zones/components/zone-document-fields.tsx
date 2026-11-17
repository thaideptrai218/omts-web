import { SelectBox } from "@/components/ui/select-box";
import { Controller, type UseFormReturn } from "react-hook-form";
import type { Ref } from "react";
import { Field } from "@/features/operations/ui";
import { zoneDocumentTypes, type FarmingZone } from "../domain/farming-zone";
import type { ZoneDocumentFormValues } from "../schemas/farming-zone-schema";
import { zoneDocumentFileAccept } from "../schemas/zone-file";
import { ZoneField, zoneInputStyles } from "./zone-field";

export function ZoneDocumentFields({
  form,
  zones,
  existingFile,
  onFileChange,
  fileError,
  fileRef,
}: {
  form: UseFormReturn<ZoneDocumentFormValues>;
  zones: readonly FarmingZone[];
  existingFile?: string;
  onFileChange(file: File | null): void;
  fileError?: string;
  fileRef?: Ref<HTMLInputElement>;
}) {
  const {
    register,
    control,
    formState: { errors },
  } = form;
  return (
    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
      <ZoneField label="Loại giấy tờ" required error={errors.type?.message}>
        {(props) => (
          <SelectBox {...props} {...register("type")} className={zoneInputStyles}>
            {Object.entries(zoneDocumentTypes).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </SelectBox>
        )}
      </ZoneField>
      <ZoneField label="Số giấy tờ" required error={errors.number?.message}>
        {(props) => (
          <input
            {...props}
            {...register("number")}
            className={zoneInputStyles}
          />
        )}
      </ZoneField>
      {([["effectiveDate", "Ngày hiệu lực *"], ["expiryDate", "Ngày hết hạn"]] as const).map(([name, label]) => (
        <div key={name}>
          <Controller control={control} name={name} render={({ field }) => (
            <Field label={label} type="date" required={name === "effectiveDate"}
              name={field.name} ref={field.ref} value={field.value} onBlur={field.onBlur}
              aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `zone-document-${name}-error` : undefined}
              onChange={event => field.onChange(event.target.value)} />
          )} />
          {errors[name] && <p id={`zone-document-${name}-error`} role="alert" className="mt-1 text-sm text-danger">{errors[name]?.message}</p>}
        </div>
      ))}
      <ZoneField label="Cơ quan cấp" error={errors.issuingAuthority?.message}>
        {(props) => (
          <input
            {...props}
            {...register("issuingAuthority")}
            className={zoneInputStyles}
          />
        )}
      </ZoneField>
      <ZoneField label="Chủ giấy tờ" error={errors.holder?.message}>
        {(props) => (
          <input
            {...props}
            {...register("holder")}
            className={zoneInputStyles}
          />
        )}
      </ZoneField>
      <div className="sm:col-span-2">
        <ZoneField label="Phạm vi pháp lý" error={errors.legalScope?.message}>
          {(props) => (
            <textarea
              {...props}
              {...register("legalScope")}
              rows={2}
              className={zoneInputStyles}
            />
          )}
        </ZoneField>
      </div>
      <fieldset
        className="min-w-0 sm:col-span-2"
        aria-describedby={
          errors.zoneIds ? "zone-document-scope-error" : undefined
        }
      >
        <legend className="text-sm font-semibold">
          Áp dụng cho vùng <span className="text-danger">*</span>
        </legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {zones.map((zone) => (
            <label
              key={zone.id}
              className="flex min-h-12 items-center gap-3 rounded-control border border-border p-3 text-sm"
            >
              <input
                type="checkbox"
                value={zone.id}
                {...register("zoneIds")}
                className="size-4 shrink-0 accent-primary"
              />
              <span>
                {zone.name}
                {zone.status === "discontinued" ? " · Đã ngừng" : ""}
              </span>
            </label>
          ))}
        </div>
        {errors.zoneIds && (
          <p
            id="zone-document-scope-error"
            role="alert"
            className="mt-1 text-sm text-danger"
          >
            {errors.zoneIds.message}
          </p>
        )}
      </fieldset>
      <div className="sm:col-span-2">
        <ZoneField
          label="Tệp đính kèm"
          required={!existingFile}
          error={fileError}
        >
          {(props) => (
            <>
              <input
                {...props}
                ref={fileRef}
                type="file"
                accept={zoneDocumentFileAccept}
                onChange={(event) =>
                  onFileChange(event.target.files?.[0] ?? null)
                }
                className={`${zoneInputStyles} text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary-soft file:px-3 file:py-2 file:text-primary`}
              />
              <p className="mt-2 text-xs leading-5 text-text-muted">
                PDF, JPG hoặc PNG; tối đa 10 MB.
                {existingFile
                  ? ` Giữ tệp hiện có nếu không chọn lại: ${existingFile}.`
                  : ""}
              </p>
            </>
          )}
        </ZoneField>
      </div>
    </div>
  );
}
