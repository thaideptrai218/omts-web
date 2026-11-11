"use client";
import type { Dispatch, SetStateAction } from "react";
import { DatePickerField } from "@/components/ui/management-screen/date-picker-field";
import type { ApiRecord } from "@/features/api-workspace/workspace-repository";
import { businessToday, control, Field } from "@/features/operations/ui";
import type { Employee } from "./contracts";
import { accountLabel, type EmployeeFormValues } from "./employee-editor-model";
import { EmployeeAddressFields } from "./employee-address-fields";
import styles from "./employee-screen.module.css";
import { EmployeeEditorWorkFields } from "./employee-editor-work-fields";
import { EmployeeEditorBankFields } from "./employee-editor-bank-fields";
import type { EmployeeTabKey } from "./employee-tabs";

/** Builds name / aria-invalid / aria-describedby props for a field path. */
export type EmployeeErrorProps = (name: string) => {
  name: string;
  "aria-invalid": boolean;
  "aria-describedby": string | undefined;
};

export type EmployeeEditorFieldsProps = {
  values: EmployeeFormValues;
  setValues: Dispatch<SetStateAction<EmployeeFormValues>>;
  errorProps: EmployeeErrorProps;
  baseline: Employee | null;
  availableZones: ApiRecord[];
  zoneOptions: ApiRecord[];
  jobTypes: { id: string; name: string }[];
  fieldError?(path: string): string | undefined;
};
/** Panels stay mounted so switching groups preserves every draft value. */
export function EmployeeEditorFields(props: EmployeeEditorFieldsProps & { active: EmployeeTabKey; idPrefix: string }) {
  const { values, setValues, errorProps, baseline, active, idPrefix } = props;
  const panel = (key: EmployeeTabKey) => ({ id: idPrefix + "-panel-" + key, role: "tabpanel", "aria-labelledby": idPrefix + "-tab-" + key, hidden: active !== key, className: "space-y-4", tabIndex: 0 });
  return <>
    <div {...panel("information")}>
      <h3 className={styles.sectionTitle}>Thông tin cá nhân</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Họ và tên *" required maxLength={100} {...errorProps("fullName")} value={values.fullName} onChange={event => setValues({ ...values, fullName: event.target.value })} />
        <Field label="Số điện thoại" type="tel" {...errorProps("phone")} value={values.phone} onChange={event => setValues({ ...values, phone: event.target.value })} />
      </div>
      <label className="block text-sm font-semibold">Ngày sinh
        <DatePickerField className={control} label="Ngày sinh" name="birthday" invalid={errorProps("birthday")["aria-invalid"]} describedBy={errorProps("birthday")["aria-describedby"]} value={values.birthday} max={businessToday()} onChange={birthday => setValues({ ...values, birthday })} />
      </label>
      <EmployeeAddressFields values={values} setValues={setValues} errorProps={errorProps} />
    </div>
    <div {...panel("work")}><EmployeeEditorWorkFields {...props} /></div>
    <div {...panel("bank")}><EmployeeEditorBankFields {...props} /></div>
    <div {...panel("account")}>
      <h3 className={styles.sectionTitle}>Tài khoản liên kết</h3>
      <p>{baseline?.account ? ["@" + baseline.account.username, baseline.account.displayName, accountLabel(baseline.account.status)].join(" · ") : "Chưa có tài khoản"}</p>
    </div>
  </>;
}
