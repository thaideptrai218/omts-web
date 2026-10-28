import type { RefObject } from "react";
import { useController, type UseFormReturn } from "react-hook-form";
import type { EmployeeEditorValues } from "../schemas/employee-editor-schema";
import type { EmployeeZoneOption } from "../domain/employee-working-details";

export function EmployeeWorkingZones({ form, zones, prefix, groupRef }: Readonly<{
  form: UseFormReturn<EmployeeEditorValues>;
  zones: readonly EmployeeZoneOption[];
  prefix: string;
  groupRef: RefObject<HTMLFieldSetElement | null>;
}>) {
  const { field, fieldState } = useController({ control: form.control, name: "workingZoneIds" });
  const error = fieldState.error?.message;
  const options = zones.filter((zone) => zone.status === "in-use" || field.value.includes(zone.id));
  const unknownCount = field.value.filter((id) => !zones.some((zone) => zone.id === id)).length;
  const helpId = `${prefix}-zones-help`;
  const errorId = `${prefix}-zones-error`;
  return (
    <fieldset ref={(element) => { groupRef.current = element; field.ref(element); }} tabIndex={-1} aria-invalid={Boolean(error)}
      aria-describedby={`${helpId}${error ? ` ${errorId}` : ""}`}
      className="min-w-0 border-t border-border pt-6 focus-visible:outline-2 focus-visible:outline-primary">
      <legend className="text-lg font-semibold text-text">Vùng làm việc</legend>
      <p id={helpId} className="mt-1 text-sm leading-6 text-text-muted">
        Chọn một hoặc nhiều vùng nhân viên làm việc, hoặc để trống. Thông tin này không tự cấp quyền đăng nhập.
      </p>
      <p className="mt-3 text-sm font-medium text-text">Đã chọn {field.value.length} vùng</p>
      <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
        {options.map((zone) => {
          const checked = field.value.includes(zone.id);
          return (
            <label key={zone.id} className={`flex min-h-12 min-w-0 items-center gap-3 rounded-control border p-3 text-sm ${checked ? "border-primary bg-primary-soft" : "border-border"}`}>
              <input type="checkbox" name={field.name} checked={checked} value={zone.id}
                disabled={zone.status !== "in-use" && !checked} onBlur={field.onBlur}
                aria-describedby={error ? errorId : undefined} aria-invalid={Boolean(error)}
                className="size-5 shrink-0 accent-primary"
                onChange={(event) => {
                  const selected = event.target.checked;
                  // Removing a discontinued option unmounts its checkbox.
                  if (!selected && zone.status !== "in-use") groupRef.current?.focus();
                  field.onChange(selected
                    ? [...field.value, zone.id] : field.value.filter((id) => id !== zone.id));
                }} />
              <span className="min-w-0 break-words">{zone.label}
                {zone.status !== "in-use" && <span className="block text-text-muted">Đã ngừng sử dụng · Bỏ chọn để tiếp tục lưu</span>}
              </span>
            </label>
          );
        })}
      </div>
      {!options.length && <p className="mt-3 text-sm text-text-muted">Chưa có vùng đang sử dụng để chọn.</p>}
      {unknownCount > 0 && <p className="mt-3 text-sm text-text-muted">Hồ sơ đang gắn {unknownCount} vùng chưa có trong danh mục hiện tại.</p>}
      {error && <p id={errorId} className="mt-2 text-sm text-danger">{error}</p>}
    </fieldset>
  );
}
