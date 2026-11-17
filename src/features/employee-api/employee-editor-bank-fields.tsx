import { Field } from "@/features/operations/ui";
import { digitsOnly } from "@/components/form/phone-input-rules";
import type { EmployeeEditorFieldsProps } from "./employee-editor-fields";
import styles from "./employee-screen.module.css";

export function EmployeeEditorBankFields({ values, setValues, errorProps, fieldError }: EmployeeEditorFieldsProps) {
  return <>
      <fieldset className={styles.bank}>
        <legend className="font-semibold">Thông tin ngân hàng</legend>
        <p id="employee-api-bank-help" className="text-sm text-text-muted">
          Có thể để trống cả nhóm. Nếu nhập, cần đủ ngân hàng, số tài khoản và chủ tài khoản. Số tài khoản gồm 6–20 chữ
          số, giữ số 0 ở đầu; tên ngân hàng và chủ tài khoản tối đa 100 ký tự.
        </p>
        {[
          ["bankName", "Ngân hàng"],
          ["accountNumber", "Số tài khoản"],
          ["accountHolderName", "Chủ tài khoản"],
        ].map(([key, label]) => (
          <div key={key}><Field
            label={label + (Object.values(values.bankAccount).some(value => value.trim()) ? " *" : "")}
            required={Object.values(values.bankAccount).some(value => value.trim())}
            maxLength={key === "accountNumber" ? 20 : 100}
            inputMode={key === "accountNumber" ? "numeric" : undefined}
            pattern={key === "accountNumber" ? "[0-9]{6,20}" : undefined}
            {...errorProps(`bankAccount.${key}`)}
            value={values.bankAccount[key as keyof typeof values.bankAccount]}
            onChange={(event) =>
              setValues({
                ...values,
                bankAccount: {
                  ...values.bankAccount,
                  // The account holder name is upper-cased as it is typed.
                  [key]: key === "accountHolderName" ? event.target.value.toUpperCase() : key === "accountNumber" ? digitsOnly(event.target.value, 20) : event.target.value,
                },
              })
            }
          />{fieldError?.(`bankAccount.${key}`) && <p id={`employee-inline-error-bankAccount.${key}`} role="alert" className="text-xs text-danger">{fieldError(`bankAccount.${key}`)}</p>}</div>
        ))}
      </fieldset>
  </>;
}
