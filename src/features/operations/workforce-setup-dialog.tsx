"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import * as c from "./new-module-contracts";
import { DatePickerField } from "@/components/ui/management-screen/date-picker-field";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { UnitField } from "@/components/form/number-fields";
import { DataTable, ErrorNotice, Field, Select, Skeleton, businessToday, useRemote } from "./ui";
import { useOperationEditor } from "./use-operation-editor";
import { workforceRepository as repository } from "./workforce-shared";

const displayClock = (value: string | null) => value?.length === 8 && value.endsWith(":00") ? value.slice(0, 5) : value || "";
/** "3 giờ", "2 giờ 30 phút", "45 phút". */
export const shiftLengthText = (minutes: number) => minutes % 60 === 0 ? `${minutes / 60} giờ` : minutes < 60 ? `${minutes} phút` : `${Math.floor(minutes / 60)} giờ ${minutes % 60} phút`;
const SHIFT_LENGTH_MESSAGE = `Số giờ của 1 ca từ ${shiftLengthText(c.SHIFT_MINUTES_MIN)} đến ${shiftLengthText(c.SHIFT_MINUTES_MAX)}.`;

/**
 * Lists the attendance settings and saves a new effective version.
 * Job types are NOT created here: the backend only has /api/job-types (see JobTypeCreateDialog, opened from the workforce menu).
 */
export function WorkforceSetupDialog({ onClose }: { onClose(): void }) {
  const [values, setValues] = useState({ effectiveFrom: businessToday(), breakFrom: "", breakTo: "", roundingMinutes: "0", shiftHours: "3", shiftExtraMinutes: "0", tolerance: "15" });
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  // Reset after a settings save so the dialog is no longer considered dirty.
  const [initial, setInitial] = useState(() => JSON.stringify(values));
  const editor = useOperationEditor(onClose, JSON.stringify(values) !== initial);
  const reviewed = useRef(editor.mutation.reviewed);
  useEffect(() => { reviewed.current = editor.mutation.reviewed; }, [editor.mutation.reviewed]);
  const initialized = useRef(false);
  const settings = useRemote<z.infer<typeof c.attendanceSettingsSchema> | undefined>(
    useMemo(
      () => (signal: AbortSignal) =>
        repository.read("settings", {}, c.attendanceSettingsSchema, signal).then((result) => {
          if (!signal.aborted && result.status === "success") reviewed.current();
          if (!signal.aborted && result.status === "success" && !initialized.current) {
            initialized.current = true;
            const current = result.data.current;
            const loaded = { effectiveFrom: businessToday(), breakFrom: displayClock(current.breakStart), breakTo: displayClock(current.breakEnd), roundingMinutes: String(c.attendanceRoundingMinutes[current.roundingUnit]), shiftHours: String(Math.floor(current.shiftMinutes / 60)), shiftExtraMinutes: String(current.shiftMinutes % 60), tolerance: String(current.shiftToleranceMinutes) };
            setValues(loaded);
            setInitial(JSON.stringify(loaded));
          }
          return result;
        }),
      [],
    ),
  );

  async function save() {
    const shiftMinutes = Number(values.shiftHours || 0) * 60 + Number(values.shiftExtraMinutes || 0), tolerance = Number(values.tolerance || 0);
    if (!Number.isInteger(shiftMinutes) || shiftMinutes < c.SHIFT_MINUTES_MIN || shiftMinutes > c.SHIFT_MINUTES_MAX) { setError(SHIFT_LENGTH_MESSAGE); return; }
    if (!Number.isInteger(tolerance) || tolerance < 0 || tolerance * 2 > shiftMinutes) { setError(`Phút cho phép thiếu từ 0 đến ${Math.floor(shiftMinutes / 2)} (tối đa một nửa ca).`); return; }
    const payload = c.saveAttendanceSettingsSchema.safeParse({
      effectiveFrom: values.effectiveFrom,
      breakStart: values.breakFrom || null,
      breakEnd: values.breakTo || null,
      roundingUnit: c.attendanceRoundingSchema.options.find((unit) => c.attendanceRoundingMinutes[unit] === Number(values.roundingMinutes)),
      shiftMinutes, shiftToleranceMinutes: tolerance,
      rowVersion: settings.data?.rowVersion,
    });
    if (!payload.success) {
      setError("Kiểm tra ngày hiệu lực, khoảng nghỉ và mức làm tròn.");
      return;
    }
    setError(undefined);
    const question = `Lưu thiết lập từ ${formatVietnameseDate(values.effectiveFrom)}, nghỉ ${values.breakFrom || "không có"} đến ${values.breakTo || "không có"}, làm tròn xuống ${values.roundingMinutes} phút, 1 ca = ${shiftLengthText(shiftMinutes)}, cho phép thiếu ${tolerance} phút?`;
    const result = await editor.submit(question, () => repository.write<unknown>("settings", payload.data, c.attendanceSettingsSavedSchema));
    if (result) {
      setInitial(JSON.stringify(values));
      setNotice("Đã lưu thiết lập chấm công.");
      settings.reload();
    }
  }

  return (
    <Dialog open title="Thiết lập chấm công" dismissible={!editor.pending} onOpenChange={(open) => { if (!open) void editor.close(); }}>
      {editor.dialog}
      <ErrorNotice error={error || editor.mutation.error || settings.error} />
      {notice && <p role="status">{notice}</p>}
      <Button variant="secondary" disabled={settings.loading || editor.pending} onClick={settings.reload}>Tải lại thiết lập</Button>
      {settings.loading && <Skeleton />}
      {settings.data && (
        <DataTable headings={["Hiệu lực", "Nghỉ từ", "Nghỉ đến", "Làm tròn xuống (phút)", "Giờ của 1 ca", "Cho phép thiếu (phút)"]} empty={!settings.data.versions.length}>
          {settings.data.versions.map((r) => (
            <tr key={r.effectiveFrom}>
              <td>{formatVietnameseDate(r.effectiveFrom)}</td>
              <td>{displayClock(r.breakStart) || "—"}</td>
              <td>{displayClock(r.breakEnd) || "—"}</td>
              <td>{c.attendanceRoundingMinutes[r.roundingUnit]}</td>
              <td>{shiftLengthText(r.shiftMinutes)}</td>
              <td>{r.shiftToleranceMinutes}</td>
            </tr>
          ))}
        </DataTable>
      )}
      <form onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <fieldset disabled={editor.disabled || settings.loading || !settings.data} className="space-y-4">
          <DatePickerField label="Ngày hiệu lực *" required value={values.effectiveFrom} onChange={(next) => setValues({ ...values, effectiveFrom: next })} />
          <Field label="Nghỉ từ" type="time" step={1} value={values.breakFrom} onChange={(e) => setValues({ ...values, breakFrom: e.target.value })} />
          <Field label="Nghỉ đến" type="time" step={1} value={values.breakTo} onChange={(e) => setValues({ ...values, breakTo: e.target.value })} />
          <Select label="Làm tròn xuống (phút)" value={values.roundingMinutes} onChange={(e) => setValues({ ...values, roundingMinutes: e.target.value })}>
            {[0, 15, 30, 60].map((v) => <option key={v} value={v}>{v}</option>)}
          </Select>
          <div>
            <p className="text-xs font-medium text-text-muted">Số giờ của 1 ca *</p>
            <div className="grid grid-cols-2 gap-3">
              <UnitField label="Giờ" accessibleName="Số giờ của 1 ca: giờ" unit="giờ" decimals={0} min={0} max={12} value={values.shiftHours} onChange={(next) => setValues({ ...values, shiftHours: next })} />
              <UnitField label="Phút" accessibleName="Số giờ của 1 ca: phút" unit="phút" decimals={0} min={0} max={59} value={values.shiftExtraMinutes} onChange={(next) => setValues({ ...values, shiftExtraMinutes: next })} />
            </div>
          </div>
          <UnitField label="Phút cho phép thiếu *" accessibleName="Phút cho phép thiếu" unit="phút" decimals={0} min={0} max={360} value={values.tolerance} onChange={(next) => setValues({ ...values, tolerance: next })} />
          <p className="text-xs text-text-muted">Số ca = (giờ làm − nghỉ trưa + phút cho phép) ÷ giờ một ca, tính theo nửa ca.</p>
          <Button type="submit">Lưu thiết lập</Button>
        </fieldset>
      </form>
      <Button className="mt-4" variant="secondary" disabled={editor.pending} onClick={() => void editor.close()}>Đóng</Button>
    </Dialog>
  );
}
