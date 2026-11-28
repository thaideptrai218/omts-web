"use client";
import { useEffect, useState, type ReactNode, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { ImageFileInput } from "@/components/form/image-file-input";
import { Dialog } from "@/components/ui/dialog";
import { PhotoThumbnails, useFilePreviews } from "@/components/form/photo-thumbnails";
import { CollapsibleSection } from "@/components/ui/management-screen/management-table";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { ErrorNotice, Field, Note, Select, businessToday, useMutation } from "@/features/operations/ui";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { DEFAULT_LOG_TYPE, logTypes, type CultivationLog } from "./log-contracts";
import { logRequest, logSavedSchema } from "./log-repository";
import { logPhotoSrc } from "./log-photo-src";
/** A care log may carry several photos; the limit is the one the form always had. */
const MAX_PHOTOS = 10;
export function photoHref(raw: string) { try { const url = new URL(raw, window.location.origin); return ["https:", "http:"].includes(url.protocol) ? url.href : undefined; } catch { return undefined; } }

/** Corrections stay in the opened record; only a new care log uses a dialog. */
function EditorFrame({ record, pending, close, children }: { record: CultivationLog | null; pending: boolean; close(): void; children: ReactNode }) {
  return record ? <section aria-label="Sửa nhật ký chăm sóc">{children}</section> : <Dialog open title="Ghi nhật ký chăm sóc" dismissible={!pending} onOpenChange={open => { if (!open) close(); }}>{children}</Dialog>;
}
/** `raftId` makes a new log on the raft (the backend puts it in the cycle open on the date, or in none); otherwise it is made on `cycleId`. */
export function LogEditor({ cycleId, raftId, startDate, zoneId, record, onClose, onSaved, dirtyRef }: { cycleId?: string | null; raftId?: string; startDate?: string; /** Lets the photos already on a log show as thumbnails. */ zoneId?: string; record: CultivationLog | null; dirtyRef?: RefObject<boolean>; onClose(): void; onSaved(): void }) {
  const [date, setDate] = useState(record?.visitDate ?? businessToday()), [notes, setNotes] = useState(record?.notes ?? ""), [reason, setReason] = useState("");
  const [logType, setLogType] = useState<string>(record?.logType || DEFAULT_LOG_TYPE), [files, setFiles] = useState<File[]>([]), [keep, setKeep] = useState(record?.photos.map(photo => photo.key) ?? []), [error, setError] = useState<string>();
  const mutation = useMutation(), confirmation = useActionDialog(), previews = useFilePreviews(files);
  const dirty = date !== (record?.visitDate ?? businessToday()) || logType !== (record?.logType || DEFAULT_LOG_TYPE) || notes !== (record?.notes ?? "") || !!reason || !!files.length || keep.length !== (record?.photos.length ?? 0);
  useEffect(() => { if (dirtyRef) dirtyRef.current = dirty; return () => { if (dirtyRef) dirtyRef.current = false; }; }, [dirty, dirtyRef]);
  const close = async () => { if (!mutation.busy() && (!dirty || await confirmation.confirm("Bỏ các thay đổi nhật ký chưa lưu?"))) onClose(); };
  async function save() {
    if (mutation.busy() || mutation.blocked) return;
    if (!date) { setError("Chọn ngày chăm sóc."); return; }
    if (startDate && date < startDate) { setError(`Ngày chăm sóc không được trước ngày bắt đầu chu kỳ (${formatVietnameseDate(startDate)}).`); return; }
    if (record && !reason.trim()) { setError("Nhập lý do sửa nhật ký."); return; }
    if (keep.length + files.length < 1 || keep.length + files.length > MAX_PHOTOS) { setError(`Nhật ký cần từ 1 đến ${MAX_PHOTOS} ảnh.`); return; }
    setError(undefined);
    const saved = await mutation.run(() => logRequest(record ? "correct" : raftId ? "raft-create" : "create", record?.id ?? raftId ?? cycleId ?? "", logSavedSchema, { visitDate: date, logType, notes: notes || null, ...(record ? { reason, keepPhotoKeys: keep } : {}) }, files));
    if (saved) onSaved();
  }
  return <EditorFrame record={record} pending={mutation.pending} close={() => void close()}>
    {confirmation.dialog}<ErrorNotice error={error || (mutation.failure?.status === "error" && mutation.failure.code === "MSG-GEN-01" ? "Loại nhật ký hoặc nội dung chưa hợp lệ. Hãy kiểm tra lại các trường đã nhập." : mutation.error)} />
    <form className="space-y-4" noValidate onSubmit={event => { event.preventDefault(); void save(); }}>
      <fieldset className="space-y-4" disabled={mutation.pending || mutation.blocked}>
        <CollapsibleSection title="Thông tin nhật ký" description="Ngày chăm sóc và nội dung." columns={1}>
          <Field label="Ngày chăm sóc" type="date" required min={startDate} max={businessToday()} value={date} onChange={e => setDate(e.target.value)} />
          <Select label="Loại nhật ký *" required value={logType} onChange={e => setLogType(e.target.value)}>{logTypes.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</Select>
          <Note label="Nội dung chăm sóc" value={notes} onChange={e => setNotes(e.target.value)} />
          {record && <Note label="Lý do sửa" required value={reason} onChange={e => setReason(e.target.value)} />}
        </CollapsibleSection>
        <CollapsibleSection title="Ảnh chăm sóc" description={`Từ 1 đến ${MAX_PHOTOS} ảnh JPEG/PNG, mỗi ảnh tối đa 10 MB.`} columns={1}>
          {record && <PhotoThumbnails items={record.photos.filter(photo => keep.includes(photo.key)).map(photo => ({ key: photo.key, src: zoneId ? logPhotoSrc(record.id, zoneId, record.photos.indexOf(photo)) : "", label: `Ảnh ${record.photos.indexOf(photo) + 1}` }))}
            onRemove={key => setKeep(current => current.filter(item => item !== key))} />}
          <PhotoThumbnails items={previews} onRemove={key => setFiles(current => current.filter((file, index) => `new-${index}-${file.name}` !== key))} />
          <ImageFileInput label="Thêm ảnh" multiple accept="image/jpeg,image/png" onChange={e => {
            const next = [...files, ...Array.from(e.target.files ?? [])];
            e.target.value = "";
            if (next.length + keep.length > MAX_PHOTOS || next.some(file => file.size < 1 || file.size > 10 * 1024 * 1024 || !["image/jpeg", "image/png"].includes(file.type))) setError(`Chọn tối đa ${MAX_PHOTOS} ảnh JPEG/PNG, mỗi ảnh không quá 10 MB.`);
            else { setError(undefined); setFiles(next); }
          }} />
        </CollapsibleSection>
      </fieldset>
      {mutation.blocked && <p role="alert">Chưa xác định được kết quả. Bản nháp được giữ; hãy đối chiếu nhật ký đã lưu trước khi lập lượt mới.</p>}
      <div className="flex justify-end gap-3"><Button key="discard-log" className="w-auto" type="button" variant="secondary" disabled={mutation.pending} onClick={() => void close()}>Bỏ qua</Button><Button key="save-log" className="w-auto" type="submit" isPending={mutation.pending} disabled={mutation.blocked}>Lưu</Button></div>
    </form>
  </EditorFrame>;
}
