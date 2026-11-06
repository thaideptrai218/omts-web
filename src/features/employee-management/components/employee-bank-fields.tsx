import type { RefObject } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { EmployeeEditorValues } from "../schemas/employee-editor-schema";
import { EmployeeEditorField } from "./employee-editor-field";

const fields = [
  { name: "bankName", label: "Tên ngân hàng" },
  { name: "accountNumber", label: "Số tài khoản" },
  { name: "accountHolderName", label: "Tên chủ tài khoản" },
] as const;
const inputStyles = "mt-2 min-h-12 w-full min-w-0 rounded-control border border-border-strong bg-surface px-3 text-text disabled:bg-surface-subtle disabled:text-text-muted aria-[invalid=true]:border-danger";

export function EmployeeBankFields({ form, prefix, groupRef }: Readonly<{
  form: UseFormReturn<EmployeeEditorValues>;
  prefix: string;
  groupRef: RefObject<HTMLFieldSetElement | null>;
}>) {
  const errors = form.formState.errors.bankAccount;
  const groupError = errors?.message;
  const helpId = `${prefix}-bank-help`;
  const errorId = `${prefix}-bank-error`;
  return (
    <fieldset ref={groupRef} tabIndex={-1} aria-invalid={Boolean(groupError)}
      aria-describedby={`${helpId}${groupError ? ` ${errorId}` : ""}`}
      className="min-w-0 border-t border-border pt-6 focus-visible:outline-2 focus-visible:outline-primary">
      <legend className="text-lg font-semibold text-text">Thông tin ngân hàng</legend>
      <p id={helpId} className="mt-1 text-sm leading-6 text-text-muted">
        Có thể để trống cả nhóm. Nếu nhập, cần đủ tên ngân hàng, số tài khoản và tên chủ tài khoản.
      </p>
      {groupError && <p id={errorId} className="mt-2 text-sm text-danger">{groupError}</p>}
      <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2">
        {fields.map(({ name, label }) => {
          const id = `${prefix}-bank-${name}`;
          const error = errors?.[name]?.message;
          return (
            <EmployeeEditorField key={name} id={id} label={label} error={error}>
              <input id={id} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}
                autoComplete="off" inputMode={name === "accountNumber" ? "numeric" : "text"}
                className={`${inputStyles}${name === "accountHolderName" ? " uppercase" : ""}`}
                {...form.register(`bankAccount.${name}`, {
                  onBlur: name === "accountHolderName" ? () => {
                    const path = "bankAccount.accountHolderName";
                    form.setValue(path, form.getValues(path).toUpperCase(), { shouldDirty: true });
                  } : undefined,
                })} />
            </EmployeeEditorField>
          );
        })}
      </div>
      <p className="mt-2 text-sm text-text-muted">Số tài khoản gồm 6–20 chữ số; giữ nguyên số 0 ở đầu.</p>
    </fieldset>
  );
}
