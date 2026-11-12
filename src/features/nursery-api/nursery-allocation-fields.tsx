"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UnitField } from "@/components/form/number-fields";
import type { CycleRow } from "@/features/cycles-api/cycle-model";
import type { AllocationInput, NurseryDetail } from "./contracts";
import { quantityText } from "./contracts";
import { allocationDifference, divideByLaneCount, putAllOnRaft } from "./allocation-calculations";

export function NurseryAllocationFields({ rafts, batch, survivors, allocations, onChange }: {
  rafts: readonly CycleRow[]; batch: NurseryDetail; survivors: number; allocations: AllocationInput[]; onChange(next: AllocationInput[]): void;
}) {
  const offered = rafts.filter(row => row.raftStatusId === 101 && (!row.cycle || !!row.cycle.closeDate) || batch.allocations.some(item => item.raftId === row.raftId));
  const selected = (id: string) => allocations.find(item => item.raftId === id);
  const original = (id: string) => batch.allocations.find(item => item.raftId === id);
  const difference = allocationDifference(survivors, allocations);
  const change = (raftId: string, values: Partial<AllocationInput>) => onChange(allocations.map(item => item.raftId === raftId ? { ...item, ...values } : item));
  function spread() {
    const shares = divideByLaneCount(survivors, allocations.map(item => ({ raftId: item.raftId, laneCount: offered.find(raft => raft.raftId === item.raftId)?.laneCount ?? 0 })));
    onChange(shares.map(share => ({ ...selected(share.raftId), ...share })));
  }
  return <section aria-label="Phân bổ cho bè" className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">Phân bổ cho bè cùng vùng</h3>
      <Button type="button" variant="secondary" className="w-auto" disabled={!allocations.length || batch.allocations.some(item => !item.canChange || item.seeded > 0)} onClick={spread}>Chia đều theo số làn</Button></div>
    {!rafts.length && <Link className="inline-flex min-h-9 items-center text-sm text-primary underline" href={`/farming/rafts?zoneId=${encodeURIComponent(batch.zoneId)}&create=1`}>Tạo bè nuôi cho vùng này</Link>}
    {!!rafts.length && !offered.length && <p className="text-sm">Không có bè đang sử dụng và chưa có chu kỳ mở trong vùng này.</p>}
    {survivors === 0 && <p className="text-sm">Không có mảnh sống sót (ước tính): không phân bổ và không tạo chu kỳ nuôi.</p>}
    {offered.map(raft => {
      const item = selected(raft.raftId), old = original(raft.raftId), frozen = old && !old.canChange;
      return <fieldset key={raft.raftId} className="min-w-0 rounded-control border border-border p-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" className="omts-check" checked={!!item} disabled={!!frozen || !!old?.seeded || survivors === 0} onChange={event => onChange(event.target.checked ? [...allocations, { raftId: raft.raftId, quantity: 0 }] : allocations.filter(value => value.raftId !== raft.raftId))} />{raft.raftCode} · {raft.laneCount} làn</label>
          <Button type="button" variant="secondary" className="w-auto" disabled={survivors <= 0 || batch.allocations.some(value => !value.canChange || value.seeded > 0)} onClick={() => onChange(putAllOnRaft(survivors, raft.raftId).map(share => ({ ...selected(share.raftId), ...share })))}>Dồn hết vào một bè</Button></div>
        {item && <div className="mt-3 grid gap-3 sm:grid-cols-2"><UnitField label={`Phân bổ ${raft.raftCode}`} unit="mảnh" decimals={2} value={String(item.quantity)} min={old?.seeded || 0.01} disabled={!!frozen} onChange={value => change(raft.raftId, { quantity: value === "" ? 0 : Number(value) })} />
          <UnitField label={`Sản lượng dự kiến ${raft.raftCode}`} unit="kg" decimals={2} min={0.01} value={item.targetYieldKg == null ? "" : String(item.targetYieldKg)} disabled={!!frozen} onChange={value => change(raft.raftId, { targetYieldKg: value === "" ? undefined : Number(value) })} /></div>}
        {old && <p className="mt-2 text-xs text-text-muted">Đã thả: {quantityText(old.seeded)}{frozen ? " · Chu kỳ đã chốt, giữ nguyên phân bổ." : ""}</p>}
      </fieldset>;
    })}
    <p role="status" className={`text-sm font-medium ${difference ? "text-danger" : "text-primary"}`}>Tổng phân bổ: {quantityText(allocations.reduce((sum, item) => sum + item.quantity, 0))} · {difference > 0 ? `Còn thiếu ${quantityText(difference)}` : difference < 0 ? `Đang thừa ${quantityText(-difference)}` : "Đã khớp số sống sót (ước tính)"}</p>
  </section>;
}
