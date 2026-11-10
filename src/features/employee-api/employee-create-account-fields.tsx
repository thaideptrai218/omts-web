"use client";
import { Field } from "@/features/operations/ui";
import { FieldError, type EmployeeCreateFieldsProps } from "./employee-create-fields";
import styles from "./employee-create-form.module.css";

/** Owner-only switch: the account is created by the same save and its password is shown once afterwards. */
export function EmployeeCreateAccountFields({ values, setValues, errorProps, fieldError }: EmployeeCreateFieldsProps) {
  return <>
    <label className={styles.switch}>
      <input type="checkbox" role="switch" checked={values.createAccount} onChange={event => setValues(current => ({ ...current, createAccount: event.target.checked }))} />
      Tạo tài khoản đăng nhập khi lưu
    </label>
    <p className={styles.hint}>
      Tên hiển thị và số điện thoại của tài khoản lấy từ hồ sơ nhân viên. Mật khẩu tạm chỉ hiển thị một lần sau khi lưu.
      Phân quyền được thực hiện tại màn Tài khoản.
    </p>
    {values.createAccount && (
      <div className={styles.grid}>
        <div>
          <Field label="Tên đăng nhập *" required autoComplete="off" {...errorProps("username")} value={values.username} onChange={event => setValues(current => ({ ...current, username: event.target.value }))} />
          <FieldError path="username" fieldError={fieldError} />
        </div>
        <div>
          <Field label="Email (không bắt buộc)" type="email" autoComplete="off" {...errorProps("email")} value={values.email} onChange={event => setValues(current => ({ ...current, email: event.target.value }))} />
          <FieldError path="email" fieldError={fieldError} />
        </div>
      </div>
    )}
  </>;
}
