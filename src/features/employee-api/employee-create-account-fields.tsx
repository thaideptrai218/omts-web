"use client";
import { Field } from "@/features/operations/ui";
import { EmployeeAccountGrantChoice } from "./employee-account-grant-choice";
import { FieldError, type EmployeeCreateFieldsProps } from "./employee-create-fields";
import styles from "./employee-create-form.module.css";

/** Owner-only switch: the account is created by the same save and its password is shown once afterwards. */
export function EmployeeCreateAccountFields({ values, setValues, errorProps, fieldError, onZones }: EmployeeCreateFieldsProps & { onZones?(names: Map<string, string>): void }) {
  // A seasonal worker has no login account: nothing to choose.
  if (values.employeeType === "SeasonalWorker") return <p className={styles.hint}>Nhân viên thời vụ không có tài khoản đăng nhập.</p>;
  return <>
    <label className={styles.switch}>
      <input type="checkbox" role="switch" checked={values.createAccount} onChange={event => setValues(current => ({ ...current, createAccount: event.target.checked }))} />
      Tạo tài khoản đăng nhập khi lưu
    </label>
    <p className={styles.hint}>
      Tên hiển thị và số điện thoại của tài khoản lấy từ hồ sơ nhân viên. Mật khẩu tạm chỉ hiển thị một lần sau khi lưu.
      Có thể chọn vai trò và vùng ngay bên dưới.
    </p>
    {values.createAccount && (
      <div className={styles.grid}>
        <div>
          <Field label="Tên đăng nhập *" required minLength={3} maxLength={50} autoComplete="off" {...errorProps("username")} value={values.username} onChange={event => setValues(current => ({ ...current, username: event.target.value }))} />
          <p className={styles.hint}>3–50 ký tự: chữ, số, dấu chấm, gạch ngang hoặc gạch dưới; cần ít nhất một chữ cái.</p>
          <FieldError path="username" fieldError={fieldError} />
        </div>
        <div className="col-span-full">
          <EmployeeAccountGrantChoice selection={values.grants} onZones={onZones}onChange={grants => setValues(current => ({ ...current, grants }))} />
          <FieldError path="grants" fieldError={fieldError} />
        </div>
      </div>
    )}
  </>;
}
