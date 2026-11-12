"use client";
import { useEffect, useState, type ReactNode, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { ImageFileInput } from "@/components/form/image-file-input";
import { Dialog } from "@/components/ui/dialog";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { ErrorNotice, Field, Note, businessToday, useMutation } from "@/features/operations/ui";
import type { CultivationLog } from "./log-contracts";
import { logRequest, logSavedSchema } from "./log-repository";
export function photoHref(raw: string) { try { const url = new URL(raw, window.location.origin); return ["https:", "http:"].includes(url.protocol) ? url.href : undefined; } catch { return undefined; } }

/** Corrections stay in the opened record; only a new care log uses a dialog. */
function EditorFrame({ record, pending, close, children }: { record: CultivationLog | null; pending: boolean; close(): void; children: ReactNode }) {
  return record ? <section aria-label="Sửa nhật ký chăm sóc">{children}</section> : <Dialog open title="Ghi nhật ký chăm sóc" dismissible={!pending} onOpenChange={open => { if (!open) close(); }}>{children}</Dialog>;
}
export function LogEditor({ cycleId, record, onClose, onSaved, dirtyRef }: { cycleId: string; record: CultivationLog | null; dirtyRef?: RefObject<boolean>; onClose(): void; onSaved(): void }) {
  const [date, setDate] = useState(record?.visitDate ?? businessToday()), [notes, setNotes] = useState(record?.notes ?? ""), [reason, setReason] = useState("");
  const [files, setFiles] = useState<File[]>([]), [keep, setKeep] = useState(record?.photos.map(photo => photo.key) ?? []), [error, setError] = useState<string>();
  const mutation = useMutation(), confirmation = useActionDialog();
  const dirty = date !== (record?.visitDate ?? businessToday()) || notes !== (record?.notes ?? "") || !!reason || !!files.length || keep.length !== (record?.photos.length ?? 0);
  useEffect(() => { if (dirtyRef) dirtyRef.current = dirty; return () => { if (dirtyRef) dirtyRef.current = false; }; }, [dirty, dirtyRef]);
  const close = async () => { if (!mutation.busy() && (!dirty || await confirmation.confirm("Bỏ các thay đổi nhật ký chưa lưu?"))) onClose(); };
  async function save() {
    if (mutation.busy() || mutation.blocked) return;
    if (keep.length + files.length < 1 || keep.length + files.length > 10) { setError("Nhật ký cần từ 1 đến 10 ảnh."); return; }
    const saved = await mutation.run(() => logRequest(record ? "correct" : "create", record?.id ?? cycleId, logSavedSchema, { visitDate: date, notes: notes || null, ...(record ? { reason, keepPhotoKeys: keep } : {}) }, files));
    if (saved) onSaved();
  }
  return <EditorFrame record={record} pending={mutation.pending} close={() => void close()}>
    {confirmation.dialog}<ErrorNotice error={error || mutation.error} />
    <form className="space-y-4" onSubmit={event => { event.preventDefault(); void save(); }}>
      <fieldset className="space-y-4" disabled={mutation.pending || mutation.blocked}>
        <Field label="Ngày chăm sóc" type="date" required max={businessToday()} value={date} onChange={e => setDate(e.target.value)} />
        <Note label="Nội dung chăm sóc" value={notes} onChange={e => setNotes(e.target.value)} />
        {record && <><Note label="Lý do sửa" required value={reason} onChange={e => setReason(e.target.value)} />
          <div className="space-y-2">{record.photos.map((photo, index) => <label key={photo.key} className="flex items-center gap-2"><input className="omts-check" type="checkbox" checked={keep.includes(photo.key)} onChange={e => setKeep(current => e.target.checked ? [...current, photo.key] : current.filter(key => key !== photo.key))} />Giữ ảnh {index + 1}</label>)}</div></>}
        <ImageFileInput label="Ảnh chăm sóc" multiple accept="image/jpeg,image/png" onChange={e => {
          const next = Array.from(e.target.files ?? []);
          if (next.length + keep.length > 10 || next.some(file => file.size < 1 || file.size > 10 * 1024 * 1024 || !["image/jpeg", "image/png"].includes(file.type))) { setError("Chọn tối đa 10 ảnh JPEG/PNG, mỗi ảnh không quá 10 MB."); e.target.value = ""; setFiles([]); }
          else { setError(undefined); setFiles(next); }
        }} />
        {files.map((file, index) => <p key={index} className="break-words text-xs">{file.name}</p>)}
      </fieldset>
      {mutation.blocked && <p role="alert">Chưa xác định được kết quả. Bản nháp được giữ; hãy đối chiếu nhật ký đã lưu trước khi lập lượt mới.</p>}
      <div className="flex justify-end gap-3"><Button key="discard-log" className="w-auto" type="button" variant="secondary" disabled={mutation.pending} onClick={() => void close()}>Bỏ qua</Button><Button key="save-log" className="w-auto" type="submit" isPending={mutation.pending} disabled={mutation.blocked}>Lưu</Button></div>
    </form>
  </EditorFrame>;
}
