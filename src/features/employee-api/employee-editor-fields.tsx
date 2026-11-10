"use client";
import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { VietnameseDateInput } from "@/components/form/vietnamese-date-input";
import type { ApiRecord } from "@/features/api-workspace/workspace-repository";
import type { LinkableEmployeeAccountDto } from "@/features/employee-management/api/employee-contract.schemas";
import { businessToday, control, Field, Note, Select } from "@/features/operations/ui";
import type { Employee } from "./contracts";
import { accountLabel, type EmployeeFormValues } from "./employee-editor-model";
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
  accountOptions,
  lookupsReady,
  accountSelectDisabled,
  onReloadAccounts,
  onUnlink,
}: {
  values: EmployeeFormValues;
  setValues: Dispatch<SetStateAction<EmployeeFormValues>>;
  errorProps: EmployeeErrorProps;
  baseline: Employee | null;
  availableZones: ApiRecord[];
  zoneOptions: ApiRecord[];
  accountOptions: Pick<LinkableEmployeeAccountDto, "id" | "username" | "displayName" | "status">[];
  lookupsReady: boolean;
  accountSelectDisabled: boolean;
  onReloadAccounts(): void;
  onUnlink(): void;
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
          label="Số điện thoại *"
          type="tel"
          required
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
      <Select
        label="Tài khoản đăng nhập"
        {...errorProps("accountId")}
        value={values.accountId}
        disabled={accountSelectDisabled}
        onChange={(event) => setValues({ ...values, accountId: event.target.value })}
      >
        <option value="">{baseline?.account ? "Giữ tài khoản đang liên kết" : "Chưa liên kết tài khoản"}</option>
        {accountOptions.map((account) => (
          <option key={account.id} value={account.id}>
            @{account.username} · {account.displayName} · {accountLabel(account.status)}
          </option>
        ))}
        {values.accountId && !accountOptions.some((option) => option.id === values.accountId) && (
          <option value={values.accountId}>Tài khoản đã chọn không còn trong danh sách hiện tại</option>
        )}
      </Select>
      <Button className="w-auto" variant="secondary" onClick={onReloadAccounts}>
        Tải lại tài khoản có thể liên kết
      </Button>
      {!lookupsReady && <p className="text-sm text-text-muted">Cần tải đủ danh mục vùng và tài khoản trước khi lưu.</p>}
      {baseline?.account && (
        <div className="rounded-control border border-border p-3">
          <p>
            Đang liên kết: @{baseline.account.username} · {accountLabel(baseline.account.status)}
          </p>
          <Button className="mt-3 w-auto" variant="secondary" onClick={onUnlink}>
            Bỏ liên kết tài khoản
          </Button>
        </div>
      )}
      <h3 className={styles.sectionTitle}>Địa chỉ và ghi chú</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          ["address", "Địa chỉ", 500],
          ["area", "Khu vực", 100],
          ["wardCommune", "Phường/Xã", 100],
        ].map(([key, label, max]) => (
          <Field
            key={key}
            label={String(label)}
            maxLength={Number(max)}
            {...errorProps(String(key))}
            value={values[key as "address" | "area" | "wardCommune"]}
            onChange={(event) => setValues({ ...values, [key]: event.target.value })}
          />
        ))}
      </div>
      <Note
        label="Thông tin khác"
        maxLength={1000}
        {...errorProps("otherInformation")}
        value={values.otherInformation}
        onChange={(event) => setValues({ ...values, otherInformation: event.target.value })}
      />
      <Note
        label="Ghi chú"
        maxLength={1000}
        {...errorProps("notes")}
        value={values.notes}
        onChange={(event) => setValues({ ...values, notes: event.target.value })}
      />
    </>
  );
}
