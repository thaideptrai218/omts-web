"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import * as c from "./new-module-contracts";
import { DataTable, ErrorNotice, Field, Select, Skeleton, businessToday, useRemote } from "./ui";
import { useOperationEditor } from "./use-operation-editor";
import { workforceRepository as repository } from "./workforce-shared";

const displayClock = (value: string | null) => value?.length === 8 && value.endsWith(":00") ? value.slice(0, 5) : value || "";

/**
 * Lists the attendance settings and saves a new effective version.
 * Job types are NOT created here: the backend only has /api/job-types (see JobTypeCreateDialog, opened from the workforce menu).
 */
export function WorkforceSetupDialog({ onClose }: { onClose(): void }) {
  const [values, setValues] = useState({ effectiveFrom: businessToday(), breakFrom: "", breakTo: "", roundingMinutes: "0" });
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
            const loaded = { effectiveFrom: businessToday(), breakFrom: displayClock(current.breakStart), breakTo: displayClock(current.breakEnd), roundingMinutes: String(c.attendanceRoundingMinutes[current.roundingUnit]) };
            setValues(loaded);
            setInitial(JSON.stringify(loaded));
          }
          return result;
        }),
      [],
    ),
  );

  async function save() {
    const payload = c.saveAttendanceSettingsSchema.safeParse({
      effectiveFrom: values.effectiveFrom,
      breakStart: values.breakFrom || null,
      breakEnd: values.breakTo || null,
      roundingUnit: c.attendanceRoundingSchema.options.find((unit) => c.attendanceRoundingMinutes[unit] === Number(values.roundingMinutes)),
      rowVersion: settings.data?.rowVersion,
    });
    if (!payload.success) {
      setError("Kiểm tra ngày hiệu lực, khoảng nghỉ và mức làm tròn.");
      return;
    }
    setError(undefined);
    const question = `Lưu thiết lập từ ${values.effectiveFrom}, nghỉ ${values.breakFrom || "không có"} đến ${values.breakTo || "không có"}, làm tròn ${values.roundingMinutes} phút?`;
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
        <DataTable headings={["Hiệu lực", "Nghỉ từ", "Nghỉ đến", "Làm tròn (phút)"]} empty={!settings.data.versions.length}>
          {settings.data.versions.map((r) => (
            <tr key={r.effectiveFrom}>
              <td>{r.effectiveFrom}</td>
              <td>{displayClock(r.breakStart) || "—"}</td>
              <td>{displayClock(r.breakEnd) || "—"}</td>
              <td>{c.attendanceRoundingMinutes[r.roundingUnit]}</td>
            </tr>
          ))}
        </DataTable>
      )}
      <form onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <fieldset disabled={editor.disabled || settings.loading || !settings.data} className="space-y-4">
          <Field label="Ngày hiệu lực *" type="date" required value={values.effectiveFrom} onChange={(e) => setValues({ ...values, effectiveFrom: e.target.value })} />
          <Field label="Nghỉ từ" type="time" step={1} value={values.breakFrom} onChange={(e) => setValues({ ...values, breakFrom: e.target.value })} />
          <Field label="Nghỉ đến" type="time" step={1} value={values.breakTo} onChange={(e) => setValues({ ...values, breakTo: e.target.value })} />
          <Select label="Làm tròn (phút)" value={values.roundingMinutes} onChange={(e) => setValues({ ...values, roundingMinutes: e.target.value })}>
            {[0, 15, 30, 60].map((v) => <option key={v} value={v}>{v}</option>)}
          </Select>
          <Button type="submit">Lưu thiết lập</Button>
        </fieldset>
      </form>
      <Button className="mt-4" variant="secondary" disabled={editor.pending} onClick={() => void editor.close()}>Đóng</Button>
    </Dialog>
  );
}
