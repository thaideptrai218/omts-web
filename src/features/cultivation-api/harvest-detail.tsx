"use client";
import Link from "next/link";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import styles from "./cultivation-flow.module.css";
import { useMemo, useState } from "react";
import { z } from "zod";
import { RecordPhotoPicker } from "./record-photo-picker";
import { Button } from "@/components/ui/button";
import { UnitField } from "@/components/form/number-fields";
import { EvidenceGallery } from "@/components/ui/evidence-gallery";
import { useToast } from "@/components/ui/toast-provider";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { operationAllowed } from "@/features/operations/permissions";
import { createOperationsRepository } from "@/features/operations/repository";
import { ErrorNotice, Note, Skeleton, displayTime, useMutation, useRemote } from "@/features/operations/ui";
import { useOperationEditor } from "@/features/operations/use-operation-editor";
import { harvestDetail, harvestCorrected, harvestCorrection, harvestList } from "./records-contracts";
import { OverPlanConfirm, isOverPlanQuestion } from "./over-plan-confirm";
import { harvestWarningTexts } from "./harvest-warning-text";
import { HarvestCrewDetail } from "./harvest-crew-detail";
import { HarvestCrewPicker } from "./harvest-crew-picker";
const repo = createOperationsRepository("harvest");
type Lot = z.infer<typeof harvestDetail>;
export function HarvestLotButton({ id, label, zoneId, onSaved }: { id: string; label: string; zoneId: string; onSaved(): void }) {
  const [open, setOpen] = useState(false);
  return <><button type="button" className="text-primary underline underline-offset-4" onClick={() => setOpen(true)}>{label}</button>{open && <HarvestLotDetail id={id} zoneId={zoneId} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); onSaved(); }} />}</>;
}
export function HarvestLotDetail({ id, zoneId, onClose, onSaved }: { id: string; zoneId: string; onClose(): void; onSaved(): void }) {
  const remote = useRemote(useMemo(() => (signal: AbortSignal) => repo.read("detail", { id, zoneId }, harvestDetail, signal), [id, zoneId]));
  return <section aria-label={remote.data ? `Lô thu hoạch ${remote.data.lotCode}` : "Hồ sơ lô thu hoạch"}><ErrorNotice error={remote.error} />{remote.loading ? <Skeleton /> : remote.data ? <div className="grid min-w-0 gap-7 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]"><div className="min-w-0"><HarvestCrewDetail crew={remote.data.crew} /><LotForm key={remote.data.rowVersion} record={remote.data} zoneId={zoneId} onClose={onClose} onSaved={onSaved} /></div><aside className="min-w-0 self-start lg:sticky lg:top-16"><EvidenceGallery title="Ảnh chuyến thu hoạch" images={remote.data.photos.map((photo,index) => ({ id: photo.key, url: photo.url, label: `Ảnh thu hoạch ${index+1} · ${remote.data!.lotCode}` }))} /></aside></div> : <Button type="button" variant="secondary" onClick={remote.reload}>Tải lại hồ sơ</Button>}{!remote.data && <Button type="button" className="mt-3" variant="secondary" onClick={onClose}>Đóng</Button>}</section>;
}
function LotForm({ record, zoneId, onClose, onSaved }: { record: Lot; zoneId: string; onClose(): void; onSaved(): void }) {
  const context = useApiWorkspace();
  const { notify } = useToast();
  const allowed = (action: string) => operationAllowed("harvest", context.identity, context.permissions.functionPermissions, action, zoneId);
  const editable = record.canCorrect && allowed("Edit");
  const screen = useRemote(useMemo(() => (signal: AbortSignal) => repo.read("list", { id: record.raftId, zoneId }, harvestList, signal), [record.raftId, zoneId]));
  const [lanes, setLanes] = useState(record.laneNumbers), [finished, setFinished] = useState(record.finishedLaneNumbers), [cages, setCages] = useState(String(record.cageCount)), [kg, setKg] = useState(String(record.estimatedKg)), [reason, setReason] = useState(""), [keep, setKeep] = useState(record.photos.map(v => v.key)), [files, setFiles] = useState<File[]>([]), [error, setError] = useState<string>(), [latest, setLatest] = useState<Lot>(), [overReason, setOverReason] = useState("");
  const originalCrew = record.crew?.map(member => member.id) ?? [], [crew, setCrew] = useState(originalCrew);
  const dirty = JSON.stringify([...crew].sort()) !== JSON.stringify([...originalCrew].sort()) ||JSON.stringify(lanes) !== JSON.stringify(record.laneNumbers) || JSON.stringify(finished) !== JSON.stringify(record.finishedLaneNumbers) || cages !== String(record.cageCount) || kg !== String(record.estimatedKg) || !!reason || keep.length !== record.photos.length || !!files.length;
  const editor = useOperationEditor(onClose, dirty), compare = useMutation();
  const choices = [...new Set([...record.laneNumbers, ...(screen.data?.lanes.filter(v => v.canHarvest).map(v => v.laneNumber) ?? [])])].sort((a,b) => a-b);
  const toggle = (current: number[], n: number) => current.includes(n) ? current.filter(v => v !== n) : [...current,n].sort((a,b) => a-b);
  const failure = editor.mutation.failure, question = isOverPlanQuestion(failure) ? failure.problem : undefined;
  const draft = (confirmed: boolean) => harvestCorrection.safeParse({ laneNumbers: lanes, finishedLaneNumbers: finished, cageCount: Number(cages), estimatedKg: kg ? Number(kg) : null, reason, keepPhotoKeys: keep, rowVersion: record.rowVersion, ...(crew.length ? { crew } : originalCrew.length ? { replaceCrew: true } : {}),...(confirmed ? { confirmOverPlan: true, overPlanReason: overReason } : {}) });
  const send = (values: z.infer<typeof harvestCorrection>) => repo.upload("harvest-correct", files, values, harvestCorrected, record.id, zoneId);
  function done(saved: z.infer<typeof harvestCorrected>) { notify({ tone: "success", title: `Đã cập nhật lô ${record.lotCode}.` }); for (const text of harvestWarningTexts(saved.warnings)) notify({ tone: "warning", title: text }); onSaved(); }
  async function confirmOverPlan() {
    const parsed = draft(true);
    if (!parsed.success) { setError("Nhập lý do vượt kế hoạch (tối đa 1.000 ký tự)."); return; }
    setError(undefined);
    const saved = await editor.mutation.run(() => send(parsed.data));
    if (saved) done(saved);
  }
  async function save() {
    const parsed = draft(false);
    if (!parsed.success) { setError("Chọn làn, số lồng nguyên dương, sản lượng hợp lệ và nhập lý do điều chỉnh."); return; }
    if (keep.length + files.length > 10 || files.some(v => !["image/jpeg", "image/png"].includes(v.type) || v.size < 1 || v.size > 10 * 1024 * 1024)) { setError("Giữ và thêm tối đa 10 ảnh JPEG/PNG, mỗi ảnh tối đa 10 MB."); return; }
    setError(undefined);
    const saved = await editor.submit(`Lưu điều chỉnh lô ${record.lotCode}? ${record.photos.length - keep.length} ảnh cũ sẽ được bỏ.`, () => send(parsed.data));
    if (saved) done(saved);
  }
  return <div className={styles.lotForm}>{editor.dialog}<ErrorNotice error={error || editor.mutation.error || screen.error || compare.error} /><dl className="my-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-text-muted">Bè / vùng</dt><dd><Link href={farmingReferenceHref("raft", { zoneId: record.zoneId, recordId: record.raftId, search: record.raftCode })}>{record.raftCode}</Link> / <Link href={farmingReferenceHref("zone", { recordId: record.zoneId, search: record.zoneCode })}>{record.zoneCode}</Link></dd></div><div><dt className="text-text-muted">Thời điểm thu hoạch</dt><dd>{displayTime(record.harvestedAt)}</dd></div><div><dt className="text-text-muted">Người ghi nhận</dt><dd>{record.recordedByName ?? "—"}</dd></div><div><dt className="text-text-muted">Quy đổi tại thời điểm ghi</dt><dd>{record.kgPerCage.toLocaleString("vi-VN")} kg/lồng</dd></div>{record.overPlanReason && <div className="col-span-2"><dt className="text-text-muted">Lý do thu vượt kế hoạch</dt><dd>{record.overPlanReason}</dd></div>}{([["Đã lập hóa đơn", record.figures.invoicedKg], ["Đã trả", record.figures.returnedKg], ["Đã bán", record.figures.soldKg], ["Còn để bán", record.figures.remainingKg], ["Kg tồn khi đóng lô", record.figures.lostKg]] as const).filter(([label, value]) => label !== "Kg tồn khi đóng lô" || value > 0).map(([label,value]) => <div key={label}><dt className="text-text-muted">{label}</dt><dd>{value.toLocaleString("vi-VN")} kg</dd></div>)}</dl>{record.figures.notFinal && <p className="mb-4 text-sm text-text-muted">Số liệu chưa chốt vì lô còn đang bán.</p>}<form onSubmit={e => { e.preventDefault(); if (editable) void save(); }}><fieldset disabled={!editable || editor.disabled} className="space-y-4"><fieldset><legend className="mb-2 text-sm font-medium">Làn thu hoạch</legend><div className="flex flex-wrap gap-3">{choices.map(n => <label key={n} className="flex gap-2 text-sm"><input type="checkbox" className="omts-check" checked={lanes.includes(n)} onChange={() => { const next = toggle(lanes,n); setLanes(next); setFinished(v => v.filter(x => next.includes(x))); }} />Làn {n}</label>)}</div></fieldset><fieldset><legend className="mb-2 text-sm font-medium">Làn đã thu hết</legend><div className="flex flex-wrap gap-3">{lanes.map(n => <label key={n} className="flex gap-2 text-sm"><input type="checkbox" className="omts-check" checked={finished.includes(n)} onChange={() => setFinished(toggle(finished,n))} />Làn {n}</label>)}</div></fieldset><UnitField key="correction-cages" label="Số lồng *" unit="lồng" decimals={2} step={0.5} min={0.01} max={100000} required value={cages} onChange={setCages} /><UnitField key="correction-estimated-kg" label="Kg ước tính" unit="kg ước tính" decimals={2} min={0.01} value={kg} onChange={setKg} /><p className="text-xs text-text-muted">Để trống để giữ ước tính cũ; nếu đổi số lồng, hệ thống quy đổi theo kg/lồng của lô.</p><RecordPhotoPicker label="Thêm ảnh JPEG/PNG" files={files} onChange={setFiles} /></fieldset><div className="my-4 space-y-2"><h3 className="text-sm font-medium">Ảnh đã lưu ({record.photos.length})</h3>{record.photos.map((photo,i) => <div key={photo.key} className="flex flex-wrap items-center gap-4 text-sm"><a href={photo.url} target="_blank" rel="noreferrer">Xem ảnh {i+1}</a>{editable && <label className="flex gap-2"><input type="checkbox" className="omts-check" disabled={editor.disabled} checked={keep.includes(photo.key)} onChange={e => setKeep(v => e.target.checked ? [...v,photo.key] : v.filter(k => k !== photo.key))} />Giữ ảnh</label>}</div>)}</div>{(editable || record.canRemove && allowed("Delete")) && <>{editable && <HarvestCrewPicker raftId={record.raftId} zoneId={zoneId} values={crew} onChange={setCrew} />}<Note label="Lý do điều chỉnh hoặc gỡ *" required disabled={editor.disabled} value={reason} onChange={e => setReason(e.target.value)} /></>}{editable && question && <OverPlanConfirm problem={question} reason={overReason} onReason={setOverReason} pending={editor.mutation.pending} onConfirm={() => void confirmOverPlan()} onDismiss={() => editor.mutation.reviewed()} />}{editable && <div className="mt-4 flex justify-end gap-2"><Button key="discard-lot" type="button" variant="secondary" disabled={editor.pending} onClick={() => void editor.close()}>Bỏ qua</Button><Button key="save-lot" type="submit" disabled={editor.disabled || screen.loading || !!screen.error || !!question}>Lưu</Button></div>}</form>{record.canRemove && allowed("Delete") && <Button type="button" className="mt-3" variant="secondary" disabled={editor.disabled || !reason.trim()} onClick={async () => { if (await editor.submit(`Gỡ lô ${record.lotCode} và các ảnh của lô? Lý do sẽ được lưu vào nhật ký.`, () => repo.write("remove", { reason, rowVersion: record.rowVersion }, z.object({ done: z.literal(true) }), record.id, zoneId))) { notify({ tone: "success", title: `Đã gỡ lô ${record.lotCode}.` }); onSaved(); } }}>Gỡ lô thu hoạch</Button>}{editor.mutation.blocked && <div className="my-4 space-y-3"><p className="text-sm">Bản nháp được giữ. Đọc hồ sơ hiện tại để đối chiếu; hệ thống không tự gửi lại lệnh.</p><Button type="button" variant="secondary" disabled={compare.pending} onClick={async () => { const value = await compare.run(() => repo.read("detail", { id: record.id, zoneId }, harvestDetail), true); if (value) setLatest(value); }}>Đọc hồ sơ hiện tại</Button>{latest && <p className="text-sm">Hiện tại: {latest.cageCount} lồng · {latest.estimatedKg.toLocaleString("vi-VN")} kg · làn {latest.laneNumbers.join(", ")} · {latest.photos.length} ảnh. Bản nháp phía trên vẫn được giữ.</p>}</div>}{screen.error && <Button type="button" variant="secondary" onClick={screen.reload}>Tải lại danh sách làn</Button>}</div>;
}
