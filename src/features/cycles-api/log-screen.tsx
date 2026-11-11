"use client";
import { useCallback, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { DataTable, ErrorNotice, Field, Note, Skeleton, businessToday, displayTime, useMutation, useRemote } from "@/features/operations/ui";
import type { CultivationLog } from "./log-contracts";
import { logListSchema, logRequest, logSavedSchema } from "./log-repository";
export function photoHref(raw: string) { try { const url = new URL(raw, window.location.origin); return ["https:","http:"].includes(url.protocol) ? url.href : undefined; } catch { return undefined; } }
export function CultivationLogsDialog({ cycleId, openCycle, onClose }: { cycleId: string; openCycle: boolean; onClose(): void }) {
  const context = useApiWorkspace(), confirmation = useActionDialog(), mutation = useMutation();
  const allowed = (action: string) => context.identity.subjectType === "CooperativeOwner" || context.permissions.functionPermissions.some(p => p.functionCode === "CULTIVATION_LOGS" && p.action === action);
  const remote = useRemote(useCallback((signal: AbortSignal) => logRequest("list", cycleId, logListSchema, undefined, undefined, signal), [cycleId]));
  const [editor, setEditor] = useState<CultivationLog | null>(), [notice, setNotice] = useState("");
  return <Dialog open title="Nhật ký chăm sóc" size="xl" dismissible={!mutation.pending && editor === undefined} onOpenChange={open => { if (!open && editor === undefined) onClose(); }}>{confirmation.dialog}
    <div className="flex flex-wrap gap-3">{openCycle && allowed("Create") && <Button className="w-auto" onClick={() => setEditor(null)}>Ghi nhật ký chăm sóc</Button>}<Button className="w-auto" variant="secondary" disabled={remote.loading || mutation.pending} onClick={remote.reload}>Tải lại nhật ký</Button></div>
    <ErrorNotice error={remote.error || mutation.error} />{notice && <p role="status" className="my-3">{notice}</p>}
    {remote.loading ? <Skeleton /> : <DataTable headings={["Ngày chăm sóc", "Nội dung", "Người ghi", "Ảnh", "Thao tác"]} empty={!remote.data?.length}>{remote.data?.map(log => <tr key={log.id}><td>{log.visitDate}</td><td className="max-w-sm whitespace-pre-wrap break-words">{log.notes ?? "—"}</td><td>{log.recordedByName ?? "—"}<p className="text-xs text-text-muted">{displayTime(log.recordedAt)}</p></td><td>{log.photos.map((photo, index) => { const href = photoHref(photo.url); return href ? <a key={photo.key} className="mr-2 text-primary underline" href={href} target="_blank" rel="noopener noreferrer">Ảnh {index + 1}</a> : <span key={photo.key}>Ảnh {index + 1} không khả dụng</span>; })}</td><td>{log.canCorrect && allowed("Edit") && <div className="flex flex-wrap gap-2"><Button className="w-auto" variant="secondary" disabled={mutation.pending || mutation.blocked} onClick={() => setEditor(log)}>Sửa</Button><Button className="w-auto" variant="secondary" disabled={mutation.pending || mutation.blocked} onClick={async () => { const reason = await confirmation.prompt("Lý do gỡ nhật ký chăm sóc"); if (reason) { const result = await mutation.run(() => logRequest("remove", log.id, z.object({ removed: z.literal(true) }), { reason })); if (result) { remote.reload(); setNotice("Đã gỡ nhật ký chăm sóc."); } } }}>Gỡ nhật ký</Button></div>}</td></tr>)}</DataTable>}
    {mutation.blocked && <p role="alert">Hãy tải lại danh sách để đối chiếu trước khi lập lượt thao tác mới. Hệ thống không tự gửi lại lệnh.</p>}
    {editor !== undefined && <LogEditor cycleId={cycleId} record={editor} onClose={() => setEditor(undefined)} onSaved={() => { setEditor(undefined); remote.reload(); setNotice("Đã lưu nhật ký chăm sóc."); }} />}
  </Dialog>;
}
export function LogEditor({ cycleId, record, onClose, onSaved }: { cycleId: string; record: CultivationLog | null; onClose(): void; onSaved(): void }) {
  const [date, setDate] = useState(record?.visitDate ?? businessToday()), [notes, setNotes] = useState(record?.notes ?? ""), [reason, setReason] = useState(""), [files, setFiles] = useState<File[]>([]), [keep, setKeep] = useState(record?.photos.map(photo => photo.key) ?? []), [error, setError] = useState<string>();
  const mutation = useMutation(), confirmation = useActionDialog();
  const dirty = date !== (record?.visitDate ?? businessToday()) || notes !== (record?.notes ?? "") || !!reason || !!files.length || keep.length !== (record?.photos.length ?? 0);
  const close = async () => { if (!mutation.busy() && (!dirty || await confirmation.confirm("Bỏ các thay đổi nhật ký chưa lưu?"))) onClose(); };
  return <Dialog open title={record ? "Sửa nhật ký chăm sóc" : "Ghi nhật ký chăm sóc"} dismissible={!mutation.pending} onOpenChange={open => { if (!open) void close(); }}>{confirmation.dialog}<ErrorNotice error={error || mutation.error} />
    <form className="space-y-4" onSubmit={async event => { event.preventDefault(); if (keep.length + files.length < 1 || keep.length + files.length > 10) { setError("Nhật ký cần từ 1 đến 10 ảnh."); return; } const saved = await mutation.run(() => logRequest(record ? "correct" : "create", record?.id ?? cycleId, logSavedSchema, { visitDate: date, notes: notes || null, ...(record ? { reason, keepPhotoKeys: keep } : {}) }, files)); if (saved) onSaved(); }}>
      <fieldset className="space-y-4" disabled={mutation.pending || mutation.blocked}><Field label="Ngày chăm sóc" type="date" required max={businessToday()} value={date} onChange={e => setDate(e.target.value)} /><Note label="Nội dung chăm sóc" value={notes} onChange={e => setNotes(e.target.value)} />
        {record && <><Note label="Lý do sửa" required value={reason} onChange={e => setReason(e.target.value)} /><div className="space-y-2">{record.photos.map((photo, index) => <label key={photo.key} className="flex items-center gap-2"><input type="checkbox" checked={keep.includes(photo.key)} onChange={e => setKeep(current => e.target.checked ? [...current, photo.key] : current.filter(key => key !== photo.key))} />Giữ ảnh {index + 1}</label>)}</div></>}
        <label className="block text-sm font-medium">Ảnh chăm sóc<input className="mt-2 block w-full" type="file" multiple accept="image/jpeg,image/png" onChange={e => { const next = Array.from(e.target.files ?? []); if (next.length + keep.length > 10 || next.some(file => file.size < 1 || file.size > 10 * 1024 * 1024 || !["image/jpeg","image/png"].includes(file.type))) { setError("Chọn tối đa 10 ảnh JPEG/PNG, mỗi ảnh không quá 10 MB."); e.target.value = ""; setFiles([]); } else { setError(undefined); setFiles(next); } }} /></label>{files.map((file, index) => <p key={index} className="break-words text-xs">{file.name}</p>)}
      </fieldset>{mutation.blocked && <p role="alert">Chưa xác định được kết quả. Bản nháp được giữ; hãy đối chiếu nhật ký đã lưu trước khi lập lượt mới.</p>}
      <div className="flex gap-3"><Button className="w-auto" type="submit" isPending={mutation.pending} disabled={mutation.blocked}>Lưu nhật ký</Button><Button className="w-auto" type="button" variant="secondary" disabled={mutation.pending} onClick={() => void close()}>Đóng</Button></div>
    </form></Dialog>;
}
