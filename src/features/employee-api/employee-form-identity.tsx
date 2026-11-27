"use client";
import { useRef, type Dispatch, type SetStateAction } from "react";
import { phoneInputProps, phoneInputValue } from "@/components/form/phone-input-rules";
import { Button } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/management-screen/date-picker-field";
import { managementStyles } from "@/components/ui/management-screen/management-table";
import { SelectBox } from "@/components/ui/select-box";
import type { ApiRecord } from "@/features/api-workspace/workspace-repository";
import { control, Field, Select } from "@/features/operations/ui";
import type { Employee } from "./contracts";
import { employeePhotoTypes } from "./employee-file-contract";
import type { EmployeeFormState } from "./employee-form-model";
import styles from "./employee-form.module.css";

export type EmployeeFormFieldProps = {
  state: EmployeeFormState;
  setState: Dispatch<SetStateAction<EmployeeFormState>>;
  /** Message of the field's first issue. */
  error(path: string): string | undefined;
  errorProps(name: string): { name: string; "aria-invalid": boolean; "aria-describedby": string | undefined };
  /** A profile that has left keeps only phone, address, notes and bank; the other fields are shown but fixed. */
  locked: boolean;
};

export function FieldMessage({ path, error }: { path: string; error: EmployeeFormFieldProps["error"] }) {
  const message = error(path);
  return message ? <p id={`employee-form-error-${path}`} role="alert" className={styles.error}>{message}</p> : null;
}

/** The round photo box at the right of the identity fields: "Thêm ảnh" while empty, the picture with "Đổi ảnh / Xóa ảnh" once chosen. */
export function PhotoPanel({ shown, name, disabled, onPick, onRemove }: { shown: string | undefined; name: string; disabled: boolean; onPick(file: File): void; onRemove(): void }) {
  const input = useRef<HTMLInputElement>(null);
  return <div className={styles.photoColumn}>
    <div className={styles.photoBox} data-filled={shown ? "" : undefined}>
      {shown
        // eslint-disable-next-line @next/next/no-img-element -- a local preview (blob:) or an address signed by the storage
        ? <img src={shown} alt={`Ảnh ${name || "nhân viên"}`} referrerPolicy="no-referrer" />
        : <><Button type="button" variant="secondary" className="w-auto" disabled={disabled} onClick={() => input.current?.click()}>Thêm ảnh</Button><span>Mỗi ảnh không vượt quá 2MB</span></>}
    </div>
    {shown && <div className={styles.photoActions}>
      <button type="button" className={managementStyles.linkButton} disabled={disabled} onClick={() => input.current?.click()}>Đổi ảnh</button>
      <button type="button" className={managementStyles.linkButton} disabled={disabled} onClick={onRemove}>Xóa ảnh</button>
    </div>}
    <input ref={input} type="file" className="sr-only" tabIndex={-1} aria-label="Ảnh nhân viên" accept={employeePhotoTypes.join(",")} disabled={disabled}
      onChange={event => { const file = event.target.files?.[0]; if (file) onPick(file); event.target.value = ""; }} />
  </div>;
}

/** Zones as chips with an x and a list of the rest to add from; a zone that no longer runs stays as a muted chip so it can be removed. */
function ZoneChips({ zones, selected, onChange, disabled, required, invalid, describedBy }: { zones: ApiRecord[]; selected: string[]; onChange(next: string[]): void; disabled: boolean; required: boolean; invalid: boolean; describedBy?: string }) {
  const label = (id: string) => { const zone = zones.find(item => item.id === id); return zone ? `${String(zone.code)} · ${String(zone.name)}` : "Vùng chưa có trong danh mục"; };
  const stopped = (id: string) => zones.find(item => item.id === id)?.statusId !== 101;
  const rest = zones.filter(zone => zone.statusId === 101 && !selected.includes(zone.id));
  return <div className={styles.chipField} aria-invalid={invalid || undefined} aria-describedby={describedBy}>
    <span className={styles.chipLabel}>Vùng làm việc{required ? " *" : ""}</span>
    {selected.length > 0 && <div className={styles.chips}>{selected.map(id => <span key={id} className={styles.chip} data-stopped={stopped(id) ? "" : undefined} title={stopped(id) ? "Vùng đã ngừng sử dụng, bỏ chọn để không giữ vùng này" : undefined}>
      {label(id)}<button type="button" disabled={disabled} aria-label={`Bỏ vùng ${label(id)}`} onClick={() => onChange(selected.filter(item => item !== id))}>×</button>
    </span>)}</div>}
    <SelectBox aria-label="Thêm vùng làm việc" className={control} value="" disabled={disabled || !rest.length} onChange={event => { if (event.target.value) onChange([...selected, event.target.value]); }}>
      <option value="">{rest.length ? "Chọn vùng làm việc" : "Không còn vùng để thêm"}</option>
      {rest.map(zone => <option key={zone.id} value={zone.id}>{String(zone.code)} · {String(zone.name)}</option>)}
    </SelectBox>
  </div>;
}

/** Identity fields of the card "Thông tin khởi tạo"; the photo panel sits beside them. */
export function IdentityFields({ state, setState, error, errorProps, locked, zones, baseline, photo }: EmployeeFormFieldProps & {
  zones: ApiRecord[]; baseline: Employee | null; photo: { shown: string | undefined; disabled: boolean; onPick(file: File): void; onRemove(): void };
}) {
  const patch = (next: Partial<EmployeeFormState>) => setState(current => ({ ...current, ...next }));
  // Zones the profile already holds stay listed (even when stopped) so they can be taken off.
  const known: ApiRecord[] = [...zones, ...(baseline?.workingZones ?? []).filter(zone => !zones.some(item => item.id === zone.id)).map(zone => ({ id: zone.id, code: zone.code, name: zone.name, statusId: 102 }))];
  const typeChanged = !!baseline && !!state.employeeType && state.employeeType !== baseline.employeeType;
  return <div className={styles.identity}>
    <div className={styles.identityFields}>
      <div>
        <Field label="Tên nhân viên *" required maxLength={100} autoComplete="off" disabled={locked} {...errorProps("fullName")} value={state.fullName} onChange={event => patch({ fullName: event.target.value })} />
        <FieldMessage path="fullName" error={error} />
      </div>
      <div>
        <Field label="Mã nhân viên" maxLength={20} pattern="[A-Za-z0-9-]{1,20}" autoComplete="off" placeholder="Tự động" disabled={locked} {...errorProps("code")} value={state.code} onChange={event => patch({ code: event.target.value.toUpperCase() })} />
        <FieldMessage path="code" error={error} />
      </div>
      <div>
        <Field label="Số điện thoại *" {...phoneInputProps} autoComplete="off" {...errorProps("phone")} value={state.phone} onChange={event => patch({ phone: phoneInputValue(event.target.value) })} />
        <FieldMessage path="phone" error={error} />
      </div>
      <div>
        <Select label="Loại nhân viên *" disabled={locked} {...errorProps("employeeType")} value={state.employeeType} onChange={event => patch({ employeeType: event.target.value as EmployeeFormState["employeeType"] })}>
          {!state.employeeType && <option value="">Chọn loại nhân viên</option>}
          <option value="Staff">Nội bộ</option><option value="SeasonalWorker">Thời vụ</option>
        </Select>
        <FieldMessage path="employeeType" error={error} />
      </div>
      {typeChanged && <div className={styles.wide}>
        <span className={styles.fieldLabel}>Áp dụng loại nhân viên từ ngày *</span>
        <DatePickerField label="Áp dụng loại nhân viên từ ngày" name="employeeTypeFrom" className={control} invalid={!!error("employeeTypeFrom")} describedBy={error("employeeTypeFrom") ? "employee-form-error-employeeTypeFrom" : undefined} value={state.employeeTypeFrom} onChange={employeeTypeFrom => patch({ employeeTypeFrom })} />
        <FieldMessage path="employeeTypeFrom" error={error} />
      </div>}
      <div className={styles.wide}>
        <ZoneChips zones={known} selected={state.workingZoneIds} onChange={workingZoneIds => patch({ workingZoneIds })} disabled={locked}
          required={state.employeeType === "Staff"} invalid={!!error("workingZoneIds")} describedBy={error("workingZoneIds") ? "employee-form-error-workingZoneIds" : undefined} />
        {state.employeeType === "SeasonalWorker" && <p className={styles.hint}>Thời vụ: có thể để trống, vùng làm việc theo phân công.</p>}
        <FieldMessage path="workingZoneIds" error={error} />
      </div>
    </div>
    <PhotoPanel {...photo} name={state.fullName} />
  </div>;
}
