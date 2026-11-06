"use client";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { DataTable, ErrorNotice, Field, OperationHeading, Skeleton, useMutation, useRemote } from "@/features/operations/ui";
import { certificationSchema, type Certification } from "./contracts";
import { certificationRequest } from "./repository";
const load = (signal: AbortSignal) => certificationRequest("list", z.array(certificationSchema), undefined, undefined, undefined, signal);
export function CertificationsScreen() {
  const context = useApiWorkspace();
  if (context.identity.subjectType !== "CooperativeOwner") return <p role="alert">Bạn không có quyền quản lý chứng nhận hợp tác xã.</p>;
  return <CertificationDirectory />;
}
function CertificationDirectory() {
  const remote = useRemote(load), mutation = useMutation(), confirmation = useActionDialog();
  const [editor, setEditor] = useState<Certification | null>(), [notice, setNotice] = useState("");
  return <section>{confirmation.dialog}<OperationHeading title="Chứng nhận hợp tác xã" description="Quản lý hồ sơ chứng nhận, thời hạn hiệu lực và tệp đính kèm của hợp tác xã." icon="document"><Button className="w-auto" onClick={() => setEditor(null)}>Thêm chứng nhận</Button></OperationHeading>
    <Button className="w-auto" variant="secondary" disabled={remote.loading || mutation.pending} onClick={remote.reload}>Tải lại danh sách</Button><ErrorNotice error={remote.error || mutation.error} />{notice && <p role="status" className="my-3">{notice}</p>}
    {remote.loading ? <Skeleton /> : <DataTable headings={["Chứng nhận", "Số chứng nhận", "Đơn vị cấp", "Ngày hết hạn", "Hiệu lực", "Thao tác"]} empty={!remote.data?.length}>{remote.data?.map(row => <tr key={row.id}><td>{row.name}</td><td>{row.number ?? "—"}</td><td>{row.issuer ?? "—"}</td><td>{row.expiryDate ?? "—"}</td><td>{{ Valid: "Còn hiệu lực", ExpiringSoon: "Sắp hết hạn", Expired: "Đã hết hạn" }[row.state]}</td><td><div className="flex flex-wrap gap-2"><Button className="w-auto" variant="secondary" onClick={() => setEditor(row)}>Xem / sửa</Button><Button className="w-auto" variant="secondary" disabled={mutation.pending || mutation.blocked} onClick={async () => { if (await confirmation.confirm(`Xóa chứng nhận “${row.name}” và tệp đính kèm?`)) { const result = await mutation.run(() => certificationRequest("remove", z.object({ messageCode: z.string() }), row.id, { rowVersion: row.rowVersion })); if (result) { remote.reload(); setNotice("Đã xóa chứng nhận."); } } }}>Xóa</Button></div></td></tr>)}</DataTable>}
    {mutation.blocked && <p role="alert">Hãy tải lại danh sách và đối chiếu kết quả trước khi lập lượt thao tác mới.</p>}
    {editor !== undefined && <CertificationEditor record={editor} onClose={() => setEditor(undefined)} onSaved={() => { setEditor(undefined); remote.reload(); setNotice("Đã lưu chứng nhận hợp tác xã."); }} />}
  </section>;
}
export function CertificationEditor({ record, onClose, onSaved }: { record: Certification | null; onClose(): void; onSaved(): void }) {
  const initial = { name: record?.name ?? "", number: record?.number ?? "", issuer: record?.issuer ?? "", expiryDate: record?.expiryDate ?? "" };
  const [values, setValues] = useState(initial), [file, setFile] = useState<File>(), [error, setError] = useState<string>();
  const mutation = useMutation(), confirmation = useActionDialog(), dirty = !!file || JSON.stringify(initial) !== JSON.stringify(values);
  const close = async () => { if (!mutation.busy() && (!dirty || await confirmation.confirm("Bỏ các thay đổi chứng nhận chưa lưu?"))) onClose(); };
  let href: string | undefined; try { if (record?.fileUrl) { const url = new URL(record.fileUrl, window.location.origin); if (["http:","https:"].includes(url.protocol)) href = url.href; } } catch { /* Invalid file links are not rendered. */ }
  return <Dialog open title={record ? "Hồ sơ chứng nhận" : "Thêm chứng nhận"} dismissible={!mutation.pending} onOpenChange={open => { if (!open) void close(); }}>{confirmation.dialog}<ErrorNotice error={error || mutation.error} />
    <form className="space-y-4" onSubmit={async event => { event.preventDefault(); if (!record && !file) { setError("Vui lòng chọn tệp chứng nhận."); return; } const result = await mutation.run(() => certificationRequest(record ? "update" : "create", z.object({ certification: certificationSchema }), record?.id, { ...values, number: values.number || null, issuer: values.issuer || null, ...(record ? { rowVersion: record.rowVersion } : {}) }, file)); if (result) onSaved(); }}>
      <fieldset className="grid gap-4 sm:grid-cols-2" disabled={mutation.pending || mutation.blocked}>{([ ["name","Tên chứng nhận",200], ["number","Số chứng nhận",100], ["issuer","Đơn vị cấp",200] ] as const).map(([key,label,max]) => <Field key={key} label={label} maxLength={max} required={key === "name"} value={values[key]} onChange={e => setValues(current => ({ ...current, [key]: e.target.value }))} />)}<Field label="Ngày hết hạn" type="date" required value={values.expiryDate} onChange={e => setValues(current => ({ ...current, expiryDate: e.target.value }))} />
        <label className="block text-sm font-medium sm:col-span-2">Tệp chứng nhận (PDF, JPEG hoặc PNG, tối đa 10 MB)<input className="mt-2 block w-full" type="file" accept="application/pdf,image/jpeg,image/png" required={!record} onChange={e => { const next = e.target.files?.[0]; if (next && (next.size < 1 || next.size > 10 * 1024 * 1024 || !["application/pdf","image/jpeg","image/png"].includes(next.type))) { setError("Chọn PDF, JPEG hoặc PNG không quá 10 MB."); e.target.value = ""; setFile(undefined); } else { setError(undefined); setFile(next); } }} /></label>
      </fieldset>{href && <a className="text-primary underline" href={href} target="_blank" rel="noopener noreferrer">Mở tệp chứng nhận hiện tại</a>}{mutation.blocked && <p role="alert">Bản nháp được giữ. Hãy đối chiếu danh sách mới trước khi lập lượt lưu khác.</p>}
      <div className="flex gap-3"><Button className="w-auto" type="submit" isPending={mutation.pending} disabled={mutation.blocked}>Lưu chứng nhận</Button><Button className="w-auto" type="button" variant="secondary" disabled={mutation.pending} onClick={() => void close()}>Đóng</Button></div>
    </form></Dialog>;
}
