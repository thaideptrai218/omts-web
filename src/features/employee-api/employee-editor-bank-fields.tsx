import { Field } from "@/features/operations/ui";
import type { EmployeeEditorFieldsProps } from "./employee-editor-fields";
import styles from "./employee-screen.module.css";

export function EmployeeEditorBankFields({ values, setValues, errorProps }: EmployeeEditorFieldsProps) {
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
          <Field
            key={key}
            label={label}
            {...errorProps(`bankAccount.${key}`)}
            value={values.bankAccount[key as keyof typeof values.bankAccount]}
            onChange={(event) =>
              setValues({
                ...values,
                bankAccount: {
                  ...values.bankAccount,
                  // The account holder name is upper-cased as it is typed.
                  [key]: key === "accountHolderName" ? event.target.value.toUpperCase() : event.target.value,
                },
              })
            }
          />
        ))}
      </fieldset>
  </>;
}
