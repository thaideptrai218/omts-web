"use client";
import { Button } from "@/components/ui/button";
import type { CycleRow } from "@/features/cycles-api/cycle-model";
import { quantityText, type NurseryDetail } from "./contracts";
import { allocationDifference, divideByLaneCount, putAllOnRaft } from "./allocation-calculations";
import { allocationInputs, nurseryDraftNumber, type AllocationDraft } from "./nursery-allocation-draft";
import { nurseryRaftOptions } from "./nursery-raft-options";
import { NurseryNoRaftNotice } from "./nursery-no-raft-notice";
import { NurseryRaftCard } from "./nursery-raft-card";

export function NurseryAllocationFields({ rafts, batch, survivors, allocations, onChange }: {
  rafts: readonly CycleRow[]; batch: NurseryDetail; survivors: number; allocations: AllocationDraft[]; onChange(next: AllocationDraft[]): void;
}) {
  const offered = nurseryRaftOptions(rafts, batch), inputs = allocationInputs(allocations);
  const unavailable = allocations.filter(item => !offered.some(raft => raft.raftId === item.raftId));
  const difference = allocationDifference(survivors, inputs), total = inputs.reduce((sum, item) => sum + (Number.isFinite(item.quantity) ? item.quantity : 0), 0);
  const validTotal = Number.isFinite(difference), disabled = survivors <= 0 || !Number.isFinite(survivors);
  const quickDisabled = disabled || batch.allocations.some(item => !item.canChange || item.seeded > 0);
  const selected = (id: string) => allocations.find(item => item.raftId === id);
  function applyShares(shares: ReturnType<typeof divideByLaneCount>) {
    onChange(shares.map(share => ({ raftId: share.raftId, quantity: String(share.quantity), targetYieldKg: selected(share.raftId)?.targetYieldKg ?? "" })));
  }
  function spread() {
    applyShares(divideByLaneCount(survivors, allocations.map(item => ({ raftId: item.raftId, laneCount: offered.find(raft => raft.raftId === item.raftId)?.laneCount ?? 0 }))));
  }
  return <section aria-label="Chuyển sang bè" className="min-w-0 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">Bè còn trống trong vùng {batch.zoneCode}</h3>
      <Button key="divide-by-lanes" type="button" variant="secondary" className="w-auto" disabled={quickDisabled || !allocations.length || allocations.some(item => !offered.find(raft => raft.raftId === item.raftId)?.laneCount)} onClick={spread}>Chia đều theo số làn</Button></div>
    {!offered.length && <NurseryNoRaftNotice batch={batch} rafts={rafts} />}
    {!!unavailable.length && <div role="alert" className="space-y-2 rounded-control border border-danger p-3 text-sm">
      <p>Có bè đã chọn không còn nhận được. Bỏ chọn để chuyển số mảnh sang bè trống khác.</p>
      {unavailable.map(item => <div key={item.raftId} className="flex flex-wrap items-center justify-between gap-2">
        <span>{rafts.find(raft => raft.raftId === item.raftId)?.raftCode ?? "Bè đã chọn"} · {Number.isFinite(nurseryDraftNumber(item.quantity)) ? quantityText(nurseryDraftNumber(item.quantity)) : "Chưa nhập số mảnh"}</span>
        <Button key="remove-unavailable-raft" type="button" variant="secondary" className="w-auto" onClick={() => onChange(allocations.filter(draft => draft.raftId !== item.raftId))}>Bỏ chọn bè</Button>
      </div>)}
    </div>}
    {survivors === 0 ? <p className="text-sm">Không có mảnh nào chuyển sang bè.</p> : <>
      <p className="text-xs text-text-muted">Chọn một hoặc nhiều bè, rồi nhập số mảnh muốn chuyển sang từng bè.</p>
      <div className="grid min-w-0 grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {offered.map(raft => <NurseryRaftCard key={raft.raftId} raft={raft} draft={selected(raft.raftId)} original={batch.allocations.find(item => item.raftId === raft.raftId)}
          disabled={disabled} quickDisabled={quickDisabled}
          onToggle={() => onChange(selected(raft.raftId) ? allocations.filter(item => item.raftId !== raft.raftId) : [...allocations, { raftId: raft.raftId, quantity: "", targetYieldKg: "" }])}
          onChange={values => onChange(allocations.map(item => item.raftId === raft.raftId ? { ...item, ...values } : item))}
          onPutAll={() => applyShares(putAllOnRaft(survivors, raft.raftId))} />)}
      </div>
    </>}
    <p role="status" className={`sticky bottom-0 z-10 rounded-control border border-border bg-surface p-3 text-sm font-medium ${!validTotal || difference ? "text-danger" : "text-primary"}`}>
      Đã chuyển {total.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} / {quantityText(survivors)} sống sót · {!validTotal ? "Điền đủ số mảnh cho các bè đã chọn" : difference > 0 ? `còn thiếu ${quantityText(difference)}` : difference < 0 ? `đang thừa ${quantityText(-difference)}` : "Đã khớp"}
    </p>
  </section>;
}
