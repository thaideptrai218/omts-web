"use client";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import * as c from "./new-module-contracts";
import { DataTable, ErrorNotice, Field, Select, businessToday, useRemote } from "./ui";
import { useOperationEditor } from "./use-operation-editor";
import { workforceRepository as repository } from "./workforce-shared";

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
  const settings = useRemote(
    useMemo(
      () => (signal: AbortSignal) =>
        mode === "settings"
          ? repository.read("settings", {}, z.array(c.attendanceSettingsSchema), signal)
          : Promise.resolve({ status: "success" as const, data: [] }),
      [mode],
    ),
  );

  async function save() {
    const payload =
      mode === "job"
        ? z.strictObject({ name: z.string().trim().min(1).max(200) }).safeParse({ name: values.name })
        : c.saveAttendanceSettingsSchema.safeParse({
            effectiveFrom: values.effectiveFrom,
            breakFrom: values.breakFrom || null,
            breakTo: values.breakTo || null,
            roundingMinutes: Number(values.roundingMinutes),
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
        mode === "job" ? z.object({ id: z.guid(), name: z.string() }) : c.attendanceSettingsSchema,
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
          {settings.data && (
            <DataTable headings={["Hiệu lực", "Nghỉ từ", "Nghỉ đến", "Làm tròn (phút)"]} empty={!settings.data.length}>
              {settings.data.map((r) => (
                <tr key={r.id}>
                  <td>{r.effectiveFrom}</td>
                  <td>{r.breakFrom || "—"}</td>
                  <td>{r.breakTo || "—"}</td>
                  <td>{r.roundingMinutes}</td>
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
        <fieldset disabled={editor.disabled} className="space-y-4">
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
                value={values.breakFrom}
                onChange={(e) => setValues({ ...values, breakFrom: e.target.value })}
              />
              <Field
                label="Nghỉ đến"
                type="time"
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
