import { VietnameseDateInput } from "@/components/form/vietnamese-date-input";
import { control, Select } from "@/features/operations/ui";
import type { EmployeeEditorFieldsProps } from "./employee-editor-fields";

/** Existing work-type, effective-date, job and zone controls. */
export function EmployeeEditorWorkFields({ values, setValues, errorProps, baseline, availableZones, zoneOptions, jobTypes }: EmployeeEditorFieldsProps) {
  return <>
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
        <legend className="font-semibold">{baseline ? "Vùng làm việc" : "Vùng làm việc *"}</legend>
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
  </>;
}
