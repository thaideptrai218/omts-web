"use client";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { ErrorNotice, Skeleton, useMutation, useRemote } from "@/features/operations/ui";
import type { ApiRecord } from "@/features/api-workspace/workspace-repository";
import { supplierDocuments } from "./repository";
import type { SupplierDocuments } from "./contracts";
export function SupplierDocumentsDialog({ id, canEdit, onClose }: { id: string; canEdit: boolean; onClose(saved?: ApiRecord): void }) {
  const confirmation = useActionDialog();
  const load = useCallback((signal: AbortSignal) => supplierDocuments(id, undefined, signal), [id]), remote = useRemote(load), mutation = useMutation();
  const [saved, setSaved] = useState<SupplierDocuments>(), [files, setFiles] = useState<File[]>([]), [error, setError] = useState<string>(), [notice, setNotice] = useState<string>();
  const [reviewed, setReviewed] = useState<SupplierDocuments>();
  const input = useRef<HTMLInputElement>(null), record = reviewed ?? saved ?? remote.data;
  const close = async () => { if (!mutation.busy() && (!files.length || await confirmation.confirm("Bỏ các tệp chưa tải lên?"))) onClose(saved ? reviewed ?? saved : undefined); };
  return <Dialog open title="Chứng nhận nhà cung cấp" size="lg" dismissible={!mutation.pending} onOpenChange={(open) => { if (!open) void close(); }}>{confirmation.dialog}<div className="space-y-4">
    {remote.loading && <Skeleton />}<ErrorNotice error={error || mutation.error || remote.error} />{notice && <p role="status">{notice}</p>}
    {record && <><p className="font-semibold">{record.name} · {record.certificates.length}/10 chứng nhận</p>{!record.certificates.length && <p>Chưa có chứng nhận.</p>}<ul className="space-y-2">{record.certificates.map((file) => <li key={file.index}>{file.url ? <a className="font-semibold text-primary underline" href={file.url} download>Tải chứng nhận {file.index + 1}</a> : <span>Chứng nhận {file.index + 1} chưa thể tải.</span>}</li>)}</ul>
      {canEdit && <form className="space-y-3" onSubmit={async (event) => { event.preventDefault(); if (mutation.busy() || mutation.blocked || !files.length) return; setError(undefined); setNotice(undefined);
        const next = await mutation.run(() => supplierDocuments(id, files)); if (next) { setSaved(next); setReviewed(undefined); setFiles([]); if (input.current) input.current.value = ""; setNotice("Đã tải lên chứng nhận."); }
      }}><label className="block text-sm font-semibold">Tệp chứng nhận<input ref={input} className="mt-2 block w-full" type="file" multiple accept="image/jpeg,image/png,application/pdf" disabled={mutation.pending || mutation.blocked} onChange={(event) => {
        const next = Array.from(event.target.files ?? []); setNotice(undefined);
        if (next.length + record.certificates.length > 10 || next.some((file) => file.size < 1 || file.size > 10 * 1024 * 1024 || !["image/jpeg", "image/png", "application/pdf"].includes(file.type))) { setError("Chọn JPEG, PNG hoặc PDF, tối đa 10 MB mỗi tệp và tổng cộng 10 chứng nhận."); setFiles([]); event.target.value = ""; } else { setFiles(next); setError(undefined); }
      }} /></label>{files.length > 0 && <ul className="break-words">{files.map((file, index) => <li key={index}>{file.name}</li>)}</ul>}<Button type="submit" className="w-auto" isPending={mutation.pending} disabled={!files.length || mutation.blocked}>Tải lên chứng nhận</Button></form>}</>}
    {mutation.blocked && <p>Chưa xác nhận được kết quả tải lên. Hãy đối chiếu danh sách hiện tại trước khi lập lượt mới; lệnh không được gửi lại tự động.</p>}
    <div className="flex flex-wrap gap-3"><Button className="w-auto" variant="secondary" disabled={mutation.pending} onClick={async () => { const next = await mutation.run(() => supplierDocuments(id), true); if (next) setReviewed(next); }}>Tải lại danh sách</Button><Button className="w-auto" variant="secondary" disabled={mutation.pending} onClick={close}>Đóng chứng nhận</Button></div>
  </div></Dialog>;
}
