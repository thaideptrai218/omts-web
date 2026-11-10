"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { myWorkRepository as repository } from "./my-work-shared";
import styles from "./my-work-screen.module.css";
import * as c from "./new-module-contracts";
import { ErrorNotice, Field, Note, businessToday } from "./ui";
import { useOperationEditor } from "./use-operation-editor";

/** Pop-up to request leave; the employee is always the signed-in account, never chosen by the client. */
export function LeaveEditor({ onClose, onSaved }: { onClose(): void; onSaved(): void }) {
  const [values, setValues] = useState(() => ({ from: businessToday(), to: businessToday(), reason: "" }));
  const [error, setError] = useState<string>();
  const [initial] = useState(() => JSON.stringify(values));
  const [clientOperationId] = useState(() => crypto.randomUUID());
  const editor = useOperationEditor(onClose, JSON.stringify(values) !== initial);

  async function save() {
    const payload = c.requestLeaveSchema.safeParse({ ...values, clientOperationId });
    if (!payload.success) {
      setError("Chọn khoảng ngày hợp lệ và nhập lý do nghỉ (tối đa 500 ký tự).");
      return;
    }
    setError(undefined);
    const result = await editor.submit(`Gửi yêu cầu nghỉ từ ${values.from} đến ${values.to}?`, () => repository.write("leave", payload.data, c.leaveSchema));
    if (result) onSaved();
  }

  return <Dialog open title="Gửi yêu cầu nghỉ phép" dismissible={!editor.pending} onOpenChange={(open) => { if (!open) void editor.close(); }}>
    {editor.dialog}
    <ErrorNotice error={error || editor.mutation.error} />
    <form className={styles.leaveForm} onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <fieldset disabled={editor.disabled} className="space-y-4">
        <Field label="Nghỉ từ ngày *" type="date" required value={values.from} onChange={(event) => setValues({ ...values, from: event.target.value })} />
        <Field label="Nghỉ đến ngày *" type="date" required min={values.from || undefined} value={values.to} onChange={(event) => setValues({ ...values, to: event.target.value })} />
        <Note label="Lý do nghỉ *" required maxLength={500} value={values.reason} onChange={(event) => setValues({ ...values, reason: event.target.value })} />
        <Button type="submit">Gửi nghỉ phép</Button>
      </fieldset>
    </form>
    {editor.mutation.blocked && <p className="mt-3">Bản nháp đang được giữ. Đối chiếu danh sách nghỉ phép trước khi lập lượt mới; không tự gửi lại.</p>}
    <Button className="mt-4" variant="secondary" disabled={editor.pending} onClick={() => void editor.close()}>Đóng</Button>
  </Dialog>;
}
