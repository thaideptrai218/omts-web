"use client";
import type { Dispatch, SetStateAction } from "react";
import { VietnameseDateInput } from "@/components/form/vietnamese-date-input";
import type { ApiRecord } from "@/features/api-workspace/workspace-repository";
import { businessToday, control, Field, Select } from "@/features/operations/ui";
import type { Employee } from "./contracts";
import { accountLabel, type EmployeeFormValues } from "./employee-editor-model";
import { EmployeeAddressFields } from "./employee-address-fields";
import styles from "./employee-screen.module.css";

/** Builds name / aria-invalid / aria-describedby props for a field path. */
export type EmployeeErrorProps = (name: string) => {
  name: string;
  "aria-invalid": boolean;
  "aria-describedby": string | undefined;
};

/** All editable sections of the employee profile form (personal, zones, bank, account, address, notes). */
export function EmployeeEditorFields({
  values,
  setValues,
  errorProps,
  baseline,
  availableZones,
  zoneOptions,
  jobTypes,
}: {
  values: EmployeeFormValues;
  setValues: Dispatch<SetStateAction<EmployeeFormValues>>;
  errorProps: EmployeeErrorProps;
  baseline: Employee | null;
  availableZones: ApiRecord[];
  zoneOptions: ApiRecord[];
  jobTypes: { id: string; name: string }[];
}) {
  return (
    <>
      <h3 className={styles.sectionTitle}>Thông tin cá nhân</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Họ và tên *"
          required
          maxLength={100}
          {...errorProps("fullName")}
          value={values.fullName}
          onChange={(event) => setValues({ ...values, fullName: event.target.value })}
        />
        <Field
          label="Số điện thoại"
          type="tel"
          {...errorProps("phone")}
          value={values.phone}
          onChange={(event) => setValues({ ...values, phone: event.target.value })}
        />
      </div>
      <label className="block text-sm font-semibold">
        Ngày sinh
        <VietnameseDateInput
          className={control}
          {...errorProps("birthday")}
          value={values.birthday}
          max={businessToday()}
          onValueChange={(birthday) => setValues({ ...values, birthday })}
          calendarLabel="Chọn ngày sinh"
        />
      </label>
      <Select label={baseline ? "Loại nhân viên" : "Loại nhân viên *"} required={!baseline} {...errorProps("employeeType")} value={values.employeeType} onChange={event => setValues({ ...values, employeeType: event.target.value })}>
        {(!baseline || !baseline.employeeType) && <option value="">Chọn loại nhân viên</option>}
        <option value="SeasonalWorker">Thời vụ</option><option value="Staff">Nhân viên</option>
      </Select>
      {baseline && values.employeeType && values.employeeType !== baseline.employeeType && <label className="block text-sm font-semibold">
        Áp dụng từ ngày *
        <VietnameseDateInput className={control} required {...errorProps("employeeTypeFrom")} value={values.employeeTypeFrom} onValueChange={employeeTypeFrom => setValues({ ...values, employeeTypeFrom })} calendarLabel="Chọn ngày áp dụng" />
      </label>}
      <fieldset className="rounded-control border border-border p-3" tabIndex={-1} {...errorProps("jobTypeIds")}>
        <legend className="font-semibold">Loại công việc</legend>
        {[...jobTypes, ...(baseline?.jobTypes ?? []).filter(job => !jobTypes.some(option => option.id === job.id))].map(job => <label key={job.id} className="flex min-h-12 items-center gap-3">
          <input type="checkbox" checked={values.jobTypeIds.includes(job.id)} onChange={event => setValues({ ...values, jobTypeIds: event.target.checked ? [...values.jobTypeIds, job.id] : values.jobTypeIds.filter(id => id !== job.id) })} />{job.name}
        </label>)}
      </fieldset>
      <fieldset className="rounded-control border border-border p-3" tabIndex={-1} {...errorProps("workingZoneIds")}>
        <legend className="font-semibold">Vùng làm việc</legend>
        {availableZones.map((zone) => (
          <label key={zone.id} className="flex min-h-12 items-center gap-3">
            <input
              type="checkbox"
              checked={values.workingZoneIds.includes(zone.id)}
              onChange={(event) =>
                setValues({
                  ...values,
                  workingZoneIds: event.target.checked
                    ? [...values.workingZoneIds, zone.id]
                    : values.workingZoneIds.filter((id) => id !== zone.id),
                })
              }
            />
            {String(zone.code)} · {String(zone.name)}
            {zone.statusId !== 101 ? " (đã ngừng — cần bỏ chọn)" : ""}
          </label>
        ))}
        {/* Selected zones missing from the catalogue can only be unticked. */}
        {values.workingZoneIds
          .filter((id) => !zoneOptions.some((zone) => zone.id === id))
          .map((id) => (
            <label key={id} className="flex min-h-12 items-center gap-3">
              <input
                type="checkbox"
                checked
                onChange={() =>
                  setValues({ ...values, workingZoneIds: values.workingZoneIds.filter((zoneId) => zoneId !== id) })
                }
              />
              Vùng chưa có trong danh mục
            </label>
          ))}
      </fieldset>
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
      <h3 className={styles.sectionTitle}>Tài khoản liên kết</h3>
      <p>{baseline?.account ? `@${baseline.account.username} · ${baseline.account.displayName} · ${accountLabel(baseline.account.status)}` : "Chưa có tài khoản"}</p>
      <EmployeeAddressFields values={values} setValues={setValues} errorProps={errorProps} />
    </>
  );
}
