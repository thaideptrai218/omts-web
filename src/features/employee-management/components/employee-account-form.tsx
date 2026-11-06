import type { UseFormReturn } from "react-hook-form";
import type { RefObject } from "react";
import type { AccountEditorValues } from "@/features/account-management/schemas/account-editor-schema";
import type { GrantDraft } from "@/features/account-management/domain/account-management";
import type { EmployeeAccountCreationOptions } from "../domain/employee-account-creation";
import { AccessGrantEditor } from "@/features/account-management/components/access-grant-editor";
import { EmployeeEditorField } from "./employee-editor-field";

const inputStyles = "mt-2 min-h-12 w-full rounded-control border border-border-strong bg-surface px-3 text-text aria-[invalid=true]:border-danger focus-visible:outline-2 focus-visible:outline-primary active:border-primary disabled:bg-surface-subtle";
export function EmployeeAccountForm({ form, options, drafts, onDraftsChange, grantsRef, disabled }: Readonly<{
  form: UseFormReturn<AccountEditorValues>;
  options: EmployeeAccountCreationOptions;
  drafts: readonly GrantDraft[];
  onDraftsChange(drafts: readonly GrantDraft[]): void;
  grantsRef: RefObject<HTMLDivElement | null>;
  disabled: boolean;
}>) {
  const fields = [{ key: "fullName", label: "Tên hiển thị", type: "text" },
    { key: "phone", label: "Số điện thoại nhận thông tin", type: "tel" },
    { key: "email", label: "Email nhận thông tin", type: "email" }] as const;
  return <fieldset className="min-w-0 space-y-5" disabled={disabled}>
    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
      {fields.map(({ key, label, type }) => {
        const error = form.formState.errors[key]?.message;
        return <EmployeeEditorField key={key} id={`employee-account-${key}`} label={label} error={error}>
          <input id={`employee-account-${key}`} type={type} className={inputStyles} aria-invalid={Boolean(error)}
            aria-describedby={error ? `employee-account-${key}-error` : undefined} {...form.register(key)} />
        </EmployeeEditorField>;
      })}
    </div>
    <fieldset className="space-y-3">
      <legend className="font-semibold text-text">Gửi thông tin kích hoạt qua</legend>
      <div className="flex flex-wrap gap-3">
        {([['phone', 'SMS'], ['email', 'Email']] as const).map(([value, label]) => <label key={value} className="flex min-h-12 items-center gap-3 rounded-control border border-border px-4">
          <input type="radio" value={value} className="size-4 accent-primary focus-visible:outline-2 focus-visible:outline-primary active:accent-primary-hover disabled:opacity-60" {...form.register("deliveryChannel")} />{label}
        </label>)}
      </div>
      {form.formState.errors.deliveryChannel && <p role="alert" className="text-sm text-danger">{form.formState.errors.deliveryChannel.message}</p>}
    </fieldset>
    <div ref={grantsRef} tabIndex={-1} role="group" aria-label="Thiết lập phân quyền" className="focus-visible:outline-2 focus-visible:outline-primary">
      <AccessGrantEditor currentGrants={[]} drafts={drafts} disabled={disabled} onChange={onDraftsChange} onRevoke={() => undefined} roles={options.roles} zones={options.zones} />
    </div>
  </fieldset>;
}
