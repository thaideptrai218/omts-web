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

/** "job" adds a job type; "settings" lists attendance settings and saves a new effective version. */
export function WorkforceSetupDialog({ mode, onClose }: { mode: "job" | "settings"; onClose(): void }) {
  const [values, setValues] = useState({
    name: "",
    effectiveFrom: businessToday(),
    breakFrom: "",
    breakTo: "",
    roundingMinutes: "0",
  });
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
        mode === "settings"
          ? repository.read("settings", {}, c.attendanceSettingsSchema, signal).then((result) => {
              if (!signal.aborted && result.status === "success") reviewed.current();
              if (!signal.aborted && result.status === "success" && !initialized.current) {
                initialized.current = true;
                const current = result.data.current;
                const loaded = { name: "", effectiveFrom: businessToday(), breakFrom: displayClock(current.breakStart), breakTo: displayClock(current.breakEnd), roundingMinutes: String(c.attendanceRoundingMinutes[current.roundingUnit]) };
                setValues(loaded);
                setInitial(JSON.stringify(loaded));
              }
              return result;
            })
          : Promise.resolve({ status: "success" as const, data: undefined }),
      [mode],
    ),
  );

  async function save() {
    const payload =
      mode === "job"
        ? z.strictObject({ name: z.string().trim().min(1).max(200) }).safeParse({ name: values.name })
        : c.saveAttendanceSettingsSchema.safeParse({
            effectiveFrom: values.effectiveFrom,
            breakStart: values.breakFrom || null,
            breakEnd: values.breakTo || null,
            roundingUnit: c.attendanceRoundingSchema.options.find((unit) => c.attendanceRoundingMinutes[unit] === Number(values.roundingMinutes)),
            rowVersion: settings.data?.rowVersion,
          });
    if (!payload.success) {
      setError("Kiểm tra tên công việc hoặc ngày hiệu lực, khoảng nghỉ và mức làm tròn.");
      return;
    }
    setError(undefined);
    const question =
      mode === "job"
        ? `Thêm loại công việc ${values.name}?`
        : `Lưu thiết lập từ ${values.effectiveFrom}, nghỉ ${values.breakFrom || "không có"} đến ${values.breakTo || "không có"}, làm tròn ${values.roundingMinutes} phút?`;
    const result = await editor.submit(question, () =>
      repository.write<unknown>(
        mode,
        payload.data,
        mode === "job" ? z.object({ id: z.guid(), name: z.string() }) : c.attendanceSettingsSavedSchema,
      ),
    );
    if (result) {
      if (mode === "job") onClose();
      else {
        setInitial(JSON.stringify(values));
        setNotice("Đã lưu thiết lập chấm công.");
        settings.reload();
      }
    }
  }

  return (
    <Dialog
      open
      title={mode === "job" ? "Thêm loại công việc" : "Thiết lập chấm công"}
      dismissible={!editor.pending}
      onOpenChange={(open) => {
        if (!open) void editor.close();
      }}
    >
      {editor.dialog}
      <ErrorNotice error={error || editor.mutation.error || settings.error} />
      {notice && <p role="status">{notice}</p>}
      {mode === "settings" && (
        <>
          <Button variant="secondary" disabled={settings.loading || editor.pending} onClick={settings.reload}>
            Tải lại thiết lập
          </Button>
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
        </>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <fieldset disabled={editor.disabled || mode === "settings" && (settings.loading || !settings.data)} className="space-y-4">
          {mode === "job" ? (
            <Field
              label="Tên công việc *"
              required
              maxLength={200}
              value={values.name}
              onChange={(e) => setValues({ ...values, name: e.target.value })}
            />
          ) : (
            <>
              <Field
                label="Ngày hiệu lực *"
                type="date"
                required
                value={values.effectiveFrom}
                onChange={(e) => setValues({ ...values, effectiveFrom: e.target.value })}
              />
              <Field
                label="Nghỉ từ"
                type="time"
                step={1}
                value={values.breakFrom}
                onChange={(e) => setValues({ ...values, breakFrom: e.target.value })}
              />
              <Field
                label="Nghỉ đến"
                type="time"
                step={1}
                value={values.breakTo}
                onChange={(e) => setValues({ ...values, breakTo: e.target.value })}
              />
              <Select
                label="Làm tròn (phút)"
                value={values.roundingMinutes}
                onChange={(e) => setValues({ ...values, roundingMinutes: e.target.value })}
              >
                {[0, 15, 30, 60].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </Select>
            </>
          )}
          <Button type="submit">{mode === "job" ? "Thêm công việc" : "Lưu thiết lập"}</Button>
        </fieldset>
      </form>
      <Button className="mt-4" variant="secondary" disabled={editor.pending} onClick={() => void editor.close()}>
        Đóng
      </Button>
    </Dialog>
  );
}
