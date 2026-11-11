"use client";
import Image from "next/image";
import Link from "next/link";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { createOperationsRepository } from "@/features/operations/repository";
import { getRaftCosts } from "@/features/purchase-documents/repository";
import { operationAllowed } from "@/features/operations/permissions";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { DataTable, ErrorNotice, Field, money, Skeleton, useMutation, useRemote } from "@/features/operations/ui";
import { raftSchema, type Raft } from "./contracts";

const laneStatusLabel = (statusId: number) => statusId === 2001 ? "Đang sử dụng" : statusId === 2002 ? "Đã gỡ" : "Không xác định";
const dateLabel = (value: string | null) => value ? value.split("-").reverse().join("/") : "—";
export function RaftWorkspace({ raftId, canEdit, onClose }: { raftId: string; canEdit: boolean; onClose(saved?: Raft): void }) {
  const repository = useMemo(() => createOperationsRepository("raft-details"), []), mutation = useMutation();
  const [saved, setSaved] = useState<Raft>(), [latest, setLatest] = useState<Raft>(), [file, setFile] = useState<File>(), [fileError, setFileError] = useState<string>(), [discard, setDiscard] = useState(false), [fileKey, setFileKey] = useState(0);
  const detail = useRemote(useCallback((signal: AbortSignal) => repository.read("detail", { id: raftId }, raftSchema, signal), [repository, raftId]));
  const record = saved ?? detail.data, { notify } = useToast();
  function close() { if (mutation.busy()) return; if (file) setDiscard(true); else onClose(saved); }
  async function upload() {
    if (!file || !canEdit || mutation.busy() || mutation.blocked) return;
    const result = await mutation.run(() => repository.upload("upload-photo", [file], {}, raftSchema, raftId));
    if (result) { notify({ tone: "success", title: `Đã thêm ảnh bè ${result.code}.` }); setSaved(result); setFile(undefined); setFileKey((value) => value + 1); }
  }
  return <section aria-label={`Ảnh và làn của bè${record ? ` · ${record.code}` : ""}`}>
    <ErrorNotice error={detail.error || mutation.error || fileError} />
    {detail.error && <Button type="button" className="w-auto" variant="secondary" onClick={detail.reload}>Tải lại dữ liệu bè</Button>}
    {detail.loading ? <Skeleton /> : record && <>
      <p className="mb-4"><Link className="text-primary underline" href={farmingReferenceHref("zone", { recordId: record.zone.id, search: record.zone.code })}>Vùng {record.zone.code} · {record.zone.name}</Link></p>
      <RaftMaterialCosts raftId={raftId} zoneId={record.zone.id} />
      {record.photos.length ? <ul className="grid gap-3 sm:grid-cols-3" aria-label="Ảnh bè">{record.photos.map((photo) => <li key={photo.id}><a href={photo.url} target="_blank" rel="noreferrer" className="block text-primary"><Image key={record.rowVersion} src={photo.url} alt={`Ảnh ${photo.sortOrder} của bè ${record.code}`} width={600} height={400} unoptimized className="max-h-60 w-full rounded-control object-contain" /><span className="underline">Xem ảnh gốc</span></a></li>)}</ul> : <p>Chưa có ảnh bè.</p>}
      {canEdit && record.photos.length >= 3 && <p className="my-4">Bè đã có đủ 3 ảnh.</p>}
      {canEdit && record.photos.length < 3 && <form className="my-4 space-y-3" onSubmit={(event) => { event.preventDefault(); void upload(); }}><fieldset disabled={mutation.pending || mutation.blocked}>
        <Field key={fileKey} label="Ảnh bè (JPEG/PNG, tối đa 10 MB)" type="file" accept="image/jpeg,image/png" required onChange={(event) => {
          const selected = event.target.files?.[0]; setFile(undefined); setFileError(undefined);
          if (selected && (selected.size < 1 || selected.size > 10 * 1024 * 1024 || !["image/jpeg", "image/png"].includes(selected.type))) { setFileError("Ảnh phải là JPEG hoặc PNG, tối đa 10 MB."); event.target.value = ""; } else setFile(selected);
        }} /></fieldset><div className="flex justify-end gap-3"><Button key="discard-photo" type="button" className="w-auto" variant="secondary" disabled={mutation.pending} onClick={() => { setFile(undefined); setFileKey(value => value + 1); }}>Bỏ qua</Button><Button key="save-photo" className="w-auto" type="submit" isPending={mutation.pending} disabled={!file || mutation.blocked}>Lưu ảnh bè</Button></div></form>}
      {mutation.blocked && <div className="my-4 rounded-control border border-border p-4"><p>Chưa gửi lại ảnh. Hãy đối chiếu ảnh hiện tại trên hệ thống.</p><Button type="button" className="mt-3 w-auto" variant="secondary" isPending={mutation.pending} onClick={async () => {
        const current = await mutation.run(() => repository.read("detail", { id: raftId }, raftSchema), true); if (current) setLatest(current);
      }}>Tải ảnh hiện tại để đối chiếu</Button>{latest && <div className="mt-3 space-y-3">{latest.photos.length ? <p>Hệ thống đang có {latest.photos.length} ảnh bè.</p> : <p>Chưa có ảnh trên hệ thống.</p>}
        <Button type="button" className="w-auto" variant="secondary" onClick={() => { setSaved(latest); setLatest(undefined); setFile(undefined); setFileKey((value) => value + 1); mutation.reviewed(); }}>Đã đối chiếu, dùng dữ liệu hiện tại</Button></div>}</div>}
      <h2 className="mt-6 text-xl font-semibold">Các làn của bè</h2>
      <DataTable headings={["Làn", "Trạng thái"]} empty={!record.lanes.length}>{record.lanes.map((lane) => <tr key={lane.id}><td>Làn {lane.laneNumber}</td><td>{laneStatusLabel(lane.statusId)}</td></tr>)}</DataTable>
    </>}
    {discard && <div className="my-4 rounded-control border border-border p-4"><p>Bỏ ảnh chưa lưu?</p><div className="mt-3 flex flex-wrap gap-3"><Button type="button" className="w-auto" variant="secondary" onClick={() => setDiscard(false)}>Tiếp tục xem</Button><Button type="button" className="w-auto" onClick={() => onClose(saved)}>Bỏ ảnh đã chọn</Button></div></div>}
    <Button type="button" className="mt-5 w-auto" variant="secondary" disabled={mutation.pending} onClick={close}>Thu gọn ảnh và làn</Button>
  </section>;
}
export function RaftMaterialCosts({ raftId, zoneId }: { raftId: string; zoneId: string }) {
  const context = useApiWorkspace();
  return operationAllowed("purchase-receipts", context.identity, context.permissions.functionPermissions, "View", zoneId)
    ? <LoadedCosts raftId={raftId} zoneId={zoneId} /> : <p className="my-3">Bạn không có quyền xem chi phí phiếu nhập của bè.</p>;
}
/** Material cost comes from the material used on the raft, each use priced at the item's latest purchase price. */
function LoadedCosts({ raftId, zoneId }: { raftId: string; zoneId: string }) {
  const costs = useRemote(useCallback((signal: AbortSignal) => getRaftCosts(raftId, signal), [raftId]));
  const row = costs.data?.rafts.find((entry) => entry.raft.id === raftId);
  return <div className="my-4 rounded-control border border-border p-3"><h2 className="font-semibold">Chi phí vật tư đã sử dụng</h2><ErrorNotice error={costs.error} />
    {costs.loading ? <Skeleton /> : costs.error ? <Button type="button" className="w-auto" variant="secondary" onClick={costs.reload}>Tải lại chi phí</Button> : row?.usages.length ? <><p className="mt-2">Tổng chi phí tháng này: {money(row.materialCost)}{row.unpricedCount ? ` · ${row.unpricedCount} lần dùng chưa có giá nhập` : ""}</p><details className="mt-3"><summary className="cursor-pointer text-primary">Các lần sử dụng vật tư</summary>
      <ul className="mt-2 space-y-2">{row.usages.map((usage) => <li key={usage.usageId}><Link className="text-primary underline" href={farmingReferenceHref("material", { zoneId, raftId, recordId: usage.usageId })}>{dateLabel(usage.date)}</Link> · <Link className="text-primary underline" href={farmingReferenceHref("inputItem", { code: usage.itemCode })}>{usage.itemName}</Link> · {usage.quantity.toLocaleString("vi-VN")} {usage.unit} × {usage.unpriced ? "chưa có giá nhập" : money(usage.unitPrice)} = {money(usage.amount)}</li>)}</ul></details></> : <p className="mt-2">Chưa có lần sử dụng vật tư nào trong tháng này.</p>}
  </div>;
}
