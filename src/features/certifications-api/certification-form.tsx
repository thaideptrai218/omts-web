"use client";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useOptionalToast } from "@/components/ui/toast-provider";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { ErrorNotice, Field, useMutation } from "@/features/operations/ui";
import listStyles from "@/features/suppliers-api/suppliers.module.css";
import { certificationSchema, type Certification } from "./contracts";
import { certificationRequest } from "./repository";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const FILE_TYPES = ["application/pdf", "image/jpeg", "image/png"];

/** The link to the attached file, only when it is a plain http(s) address; anything else is not rendered. */
export function certificationFileHref(record: Certification | null) {
  if (!record?.fileUrl) return undefined;
  try {
    const url = new URL(record.fileUrl, window.location.origin);
    return ["http:", "https:"].includes(url.protocol) ? url.href : undefined;
  } catch { return undefined; }
}

/**
 * The certification form: "Thêm chứng nhận" in a dialog, and "Chỉnh sửa" (`inline`) in the open row with the same fields.
 * A new certification needs its file; an existing one keeps its file unless a new one is chosen.
 */
export function CertificationForm({ record, inline = false, onClose, onSaved }: { record: Certification | null; inline?: boolean; onClose(): void; onSaved(saved: Certification): void }) {
  const [initial] = useState(() => ({ name: record?.name ?? "", number: record?.number ?? "", issuer: record?.issuer ?? "", expiryDate: record?.expiryDate ?? "" }));
  const [values, setValues] = useState(initial), [file, setFile] = useState<File>(), [error, setError] = useState<string>();
  const mutation = useMutation(), confirmation = useActionDialog(), toast = useOptionalToast();
  const dirty = !!file || JSON.stringify(initial) !== JSON.stringify(values);
  const href = certificationFileHref(record);
  const close = async () => { if (!mutation.busy() && (!dirty || await confirmation.confirm("Bỏ các thay đổi chứng nhận chưa lưu?"))) onClose(); };
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!record && !file) { setError("Vui lòng chọn tệp chứng nhận."); return; }
    const result = await mutation.run(() => certificationRequest(record ? "update" : "create", z.object({ certification: certificationSchema }), record?.id,
      { ...values, number: values.number || null, issuer: values.issuer || null, ...(record ? { rowVersion: record.rowVersion } : {}) }, file));
    if (!result) return;
    toast?.notify({ tone: "success", title: record ? `Đã lưu chứng nhận ${result.certification.name}.` : `Đã tạo chứng nhận ${result.certification.name}.` });
    onSaved(result.certification);
  }
  const set = (key: keyof typeof initial) => (event: { target: { value: string } }) => setValues((current) => ({ ...current, [key]: event.target.value }));
  const buttons = <>
    <Button className="w-auto" variant="secondary" disabled={mutation.pending} onClick={() => void close()}>Bỏ qua</Button>
    <Button className="w-auto" type="submit" isPending={mutation.pending} disabled={mutation.blocked || (record !== null && !dirty)}>Lưu</Button>
  </>;
  const content = <>{confirmation.dialog}
    <form onSubmit={submit}>
      <ErrorNotice error={error || mutation.error} />
      <fieldset className="grid min-w-0 gap-4 sm:grid-cols-2" disabled={mutation.pending || mutation.blocked}>
        <Field label="Tên chứng nhận *" maxLength={200} required value={values.name} onChange={set("name")} />
        <Field label="Số chứng nhận" maxLength={100} value={values.number} onChange={set("number")} />
        <Field label="Đơn vị cấp" maxLength={200} value={values.issuer} onChange={set("issuer")} />
        <Field label="Ngày hết hạn *" type="date" required value={values.expiryDate} onChange={set("expiryDate")} />
        <label className="block text-xs font-medium text-text-muted sm:col-span-2">Tệp chứng nhận (PDF, JPEG hoặc PNG, tối đa 10 MB){record ? " — chọn tệp mới để thay tệp hiện tại" : " *"}
          <input className="omts-control mt-1" type="file" accept={FILE_TYPES.join(",")} required={!record} onChange={(event) => {
            const next = event.target.files?.[0];
            if (next && (next.size < 1 || next.size > MAX_FILE_BYTES || !FILE_TYPES.includes(next.type))) { setError("Chọn PDF, JPEG hoặc PNG không quá 10 MB."); event.target.value = ""; setFile(undefined); } else { setError(undefined); setFile(next); }
          }} />
        </label>
      </fieldset>
      {record && href && <p className="mt-3 text-sm"><a className="text-primary underline" href={href} target="_blank" rel="noopener noreferrer">Mở tệp chứng nhận hiện tại</a></p>}
      {mutation.blocked && <p role="alert" className="mt-3 text-sm text-danger">Bản nháp được giữ. Hãy đóng và đối chiếu danh sách mới trước khi lập lượt lưu khác.</p>}
      {inline ? <footer className={listStyles.tabFooter}><div>{buttons}</div></footer> : <div className="mt-5 flex justify-end gap-3">{buttons}</div>}
    </form>
  </>;
  if (inline) return content;
  return <Dialog open size="lg" title={record ? "Hồ sơ chứng nhận" : "Thêm chứng nhận"} dismissible={!mutation.pending} onOpenChange={(open) => { if (!open) void close(); }}>{content}</Dialog>;
}

/** The certification in a dialog, for the places that open one from outside the list (a notification). */
export function CertificationEditor({ record, onClose, onSaved }: { record: Certification | null; onClose(): void; onSaved(): void }) {
  return <CertificationForm record={record} onClose={onClose} onSaved={() => onSaved()} />;
}
