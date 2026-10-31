"use client";
import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { createOperationsRepository } from "@/features/operations/repository";
import { raftCostsSchema } from "@/features/operations/contracts";
import { operationAllowed } from "@/features/operations/permissions";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { businessToday, DataTable, ErrorNotice, Field, money, Skeleton, useMutation, useRemote } from "@/features/operations/ui";
import { conditionSchema, raftSchema, stateLabel, type Condition, type Raft } from "./contracts";

const dateLabel = (value: string | null) => value ? value.split("-").reverse().join("/") : "—";
export function RaftWorkspace({ raftId, canEdit, onClose }: { raftId: string; canEdit: boolean; onClose(saved?: Raft): void }) {
  const repository = useMemo(() => createOperationsRepository("raft-details"), []), mutation = useMutation();
  const [date, setDate] = useState(businessToday), [saved, setSaved] = useState<Raft>(), [latest, setLatest] = useState<Raft>(), [file, setFile] = useState<File>(), [fileError, setFileError] = useState<string>(), [discard, setDiscard] = useState(false), [fileKey, setFileKey] = useState(0);
  const detail = useRemote(useCallback((signal: AbortSignal) => repository.read("detail", { id: raftId }, raftSchema, signal), [repository, raftId]));
  const condition = useRemote(useCallback((signal: AbortSignal) => repository.read("condition", { id: raftId, date }, conditionSchema, signal), [repository, raftId, date]));
  const record = saved ?? detail.data;
  function close() { if (mutation.busy()) return; if (file) setDiscard(true); else onClose(saved); }
  async function upload() {
    if (!file || !canEdit || mutation.busy() || mutation.blocked) return;
    const result = await mutation.run(() => repository.upload("upload-photo", [file], {}, raftSchema, raftId));
    if (result) { setSaved(result); setFile(undefined); setFileKey((value) => value + 1); }
  }
  return <Dialog open title={`Ảnh và sơ đồ bè${record ? ` · ${record.code}` : ""}`} size="xl" dismissible={!mutation.pending} onOpenChange={(open) => { if (!open) close(); }}>
    <ErrorNotice error={detail.error || condition.error || mutation.error || fileError} />
    {(detail.error || condition.error) && <Button className="w-auto" variant="secondary" onClick={() => { detail.reload(); condition.reload(); }}>Tải lại dữ liệu bè</Button>}
    {detail.loading ? <Skeleton /> : record && <>
      <p className="mb-4">Vùng {record.zone.code} · {record.zone.name}</p>
      <RaftMaterialCosts raftId={raftId} zoneId={record.zone.id} />
      {saved && <p role="status" className="my-3 text-primary">Đã cập nhật ảnh bè.</p>}
      {record.photoUrl ? <a href={record.photoUrl} target="_blank" rel="noreferrer" className="block text-primary"><Image key={record.rowVersion} src={record.photoUrl} alt={`Ảnh bè ${record.code}`} width={900} height={500} unoptimized className="max-h-80 w-full rounded-control object-contain" /><span className="underline">Xem ảnh gốc</span></a> : <p>Chưa có ảnh bè.</p>}
      {canEdit && <form className="my-4 space-y-3" onSubmit={(event) => { event.preventDefault(); void upload(); }}><fieldset disabled={mutation.pending || mutation.blocked}>
        <Field key={fileKey} label="Ảnh bè (JPEG/PNG, tối đa 10 MB)" type="file" accept="image/jpeg,image/png" required onChange={(event) => {
          const selected = event.target.files?.[0]; setFile(undefined); setFileError(undefined);
          if (selected && (selected.size < 1 || selected.size > 10 * 1024 * 1024 || !["image/jpeg", "image/png"].includes(selected.type))) { setFileError("Ảnh phải là JPEG hoặc PNG, tối đa 10 MB."); event.target.value = ""; } else setFile(selected);
        }} /></fieldset><Button className="w-auto" type="submit" isPending={mutation.pending} disabled={!file || mutation.blocked}>Lưu ảnh bè</Button></form>}
      {mutation.blocked && <div className="my-4 rounded-control border border-border p-4"><p>Chưa gửi lại ảnh. Hãy đối chiếu ảnh hiện tại trên hệ thống.</p><Button className="mt-3 w-auto" variant="secondary" isPending={mutation.pending} onClick={async () => {
        const current = await mutation.run(() => repository.read("detail", { id: raftId }, raftSchema), true); if (current) setLatest(current);
      }}>Tải ảnh hiện tại để đối chiếu</Button>{latest && <div className="mt-3 space-y-3">{latest.photoUrl ? <Image key={latest.rowVersion} src={latest.photoUrl} alt="Ảnh hiện tại trên hệ thống" width={600} height={350} unoptimized className="max-h-64 w-full object-contain" /> : <p>Chưa có ảnh trên hệ thống.</p>}
        <Button className="w-auto" variant="secondary" onClick={() => { setSaved(latest); setLatest(undefined); setFile(undefined); setFileKey((value) => value + 1); mutation.reviewed(); }}>Đã đối chiếu, dùng dữ liệu hiện tại</Button></div>}</div>}
      <h2 className="mt-6 text-xl font-semibold">Lịch sử sơ đồ làn</h2>
      <DataTable headings={["Phiên bản", "Số làn", "Hiệu lực từ", "Đến ngày", "Tra cứu"]} empty={!record.layoutVersions.length}>{record.layoutVersions.map((version) => <tr key={version.versionNumber}><td>v{version.versionNumber}</td><td>{version.laneCount}</td><td>{dateLabel(version.validFrom)}</td><td>{dateLabel(version.validTo)}</td>
        <td><button className="text-primary underline" onClick={() => setDate(version.validFrom)}>Xem từ {dateLabel(version.validFrom)}</button></td></tr>)}</DataTable>
      <Field label="Ngày xem tình trạng bè" type="date" required value={date} onChange={(event) => { if (event.target.value) setDate(event.target.value); }} />
      {condition.loading ? <Skeleton /> : condition.data && <ConditionDiagram key={`${condition.data.date}-${condition.data.layoutVersion}-${condition.data.cycleId}`} condition={condition.data} />}
    </>}
    {discard && <div className="my-4 rounded-control border border-border p-4"><p>Bỏ ảnh chưa lưu?</p><div className="mt-3 flex flex-wrap gap-3"><Button className="w-auto" variant="secondary" onClick={() => setDiscard(false)}>Tiếp tục xem</Button><Button className="w-auto" onClick={() => onClose(saved)}>Bỏ ảnh đã chọn</Button></div></div>}
    <Button className="mt-5 w-auto" variant="secondary" disabled={mutation.pending} onClick={close}>Đóng sơ đồ bè</Button>
  </Dialog>;
}
export function RaftMaterialCosts({ raftId, zoneId }: { raftId: string; zoneId: string }) {
  const context = useApiWorkspace();
  return operationAllowed("purchase-receipts", context.identity, context.permissions.functionPermissions, "View", zoneId)
    ? <LoadedCosts raftId={raftId} zoneId={zoneId} /> : <p className="my-3">Bạn không có quyền xem chi phí phiếu nhập của bè.</p>;
}
function LoadedCosts({ raftId, zoneId }: { raftId: string; zoneId: string }) {
  const repository = useMemo(() => createOperationsRepository("purchase-receipts"), []);
  const costs = useRemote(useCallback((signal: AbortSignal) => repository.read("costs", { raftId, zoneId }, raftCostsSchema, signal), [repository, raftId, zoneId]));
  const row = costs.data?.find((entry) => entry.raft.id === raftId);
  return <div className="my-4 rounded-control border border-border p-3"><h2 className="font-semibold">Chi phí vật tư từ phiếu nhập</h2><ErrorNotice error={costs.error} />
    {costs.loading ? <Skeleton /> : costs.error ? <Button className="w-auto" variant="secondary" onClick={costs.reload}>Tải lại chi phí</Button> : row?.receipts.length ? <><p className="mt-2">Tổng chi phí: {money(row.materialCost)}</p><details className="mt-3"><summary className="cursor-pointer text-primary">Phiếu làm căn cứ</summary>
      <ul className="mt-2 space-y-2">{row.receipts.map((receipt) => <li key={receipt.receiptId}>{receipt.code} · {dateLabel(receipt.receiptDate)} · {money(receipt.materialCost)}</li>)}</ul></details></> : <p className="mt-2">Chưa có số liệu chi phí.</p>}
  </div>;
}
const colors = { NotSeeded: "bg-slate-200 text-slate-900", Growing: "bg-emerald-700 text-white", Harvested: "bg-sky-700 text-white", WrittenOff: "bg-amber-200 text-slate-900" };
export function ConditionDiagram({ condition }: { condition: Condition }) {
  const [portion, setPortion] = useState<{ lane: number; value: Condition["lanes"][number]["portions"][number] }>();
  return <section className="mt-5" aria-label="Sơ đồ tình trạng làn"><h2 className="text-xl font-semibold">Tình trạng ngày {dateLabel(condition.date)} · sơ đồ v{condition.layoutVersion}</h2>
    <p className="mt-2">{condition.cycleId ? `Chu kỳ: ${condition.cycleId}` : "Bè chưa có chu kỳ tại ngày xem."}</p>
    <ul className="my-4 flex flex-wrap gap-3" aria-label="Chú giải">{Object.entries(colors).map(([value, style]) => <li key={value} className={`rounded-control px-3 py-2 ${style}`}>{stateLabel(value)}</li>)}</ul>
    {condition.lanes.map((lane) => <div key={lane.laneNumber} className="my-4 rounded-control border border-border p-3"><h3 className="font-semibold">Làn {lane.laneNumber} · {lane.length} m · {stateLabel(lane.summary)}</h3>
      <div className="mt-3 overflow-x-auto"><div className="flex min-w-[480px] border border-border" aria-label={`Tình trạng làn ${lane.laneNumber}`}>
        {lane.portions.map((part, index) => <button key={index} className={`min-h-12 overflow-hidden border-r border-surface px-1 text-xs focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 ${colors[part.condition]}`} style={{ width: `${lane.length > 0 ? (part.to - part.from) / lane.length * 100 : 100}%` }}
          aria-label={`Làn ${lane.laneNumber}, ${part.from}–${part.to} m, ${stateLabel(part.condition)}`} title={`${part.from}–${part.to} m · ${stateLabel(part.condition)}`} onClick={() => setPortion({ lane: lane.laneNumber, value: part })}>{part.from}–{part.to} m</button>)}
      </div></div>
      {lane.plannedHarvests.length > 0 && <div className="mt-3"><h4 className="font-semibold">Dự kiến thu</h4><ul>{lane.plannedHarvests.map((source) => <li key={source.id}>{source.from}–{source.to} m · {dateLabel(source.date)} · {source.recordedBy ?? "—"}</li>)}</ul></div>}
    </div>)}
    {portion && <section className="my-5 rounded-control border border-primary p-4" aria-label="Nguồn tình trạng đoạn làn"><h3 className="font-semibold">Làn {portion.lane} · {portion.value.from}–{portion.value.to} m · {stateLabel(portion.value.condition)}</h3>
      {!portion.value.segments.length && <p className="mt-3">Chưa có sự kiện thả, thu hoặc ghi giảm cho đoạn này.</p>}
      {portion.value.segments.map((source) => <dl key={source.id} className="mt-4 space-y-2 border-t border-border pt-3"><div><dt>Sự kiện nguồn</dt><dd>{stateLabel(source.type)} · {dateLabel(source.date)} · {source.from}–{source.to} m</dd></div>
        <div><dt>Người ghi / xác nhận</dt><dd>{source.recordedBy ?? "—"} / {source.confirmedBy ?? "—"}</dd></div>
        {source.seedLotCode && <div><dt>Lô giống</dt><dd>{source.seedLotCode}</dd></div>}{source.seedingEventId && <div><dt>Mã buổi thả</dt><dd className="break-all">{source.seedingEventId}</dd></div>}
        {source.writeOffReason && <div><dt>Lý do ghi giảm</dt><dd>{source.writeOffReason}</dd></div>}</dl>)}
    </section>}
  </section>;
}
