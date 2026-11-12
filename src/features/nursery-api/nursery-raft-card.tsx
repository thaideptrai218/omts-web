import { Button } from "@/components/ui/button";
import { UnitField } from "@/components/form/number-fields";
import { quantityText, type NurseryDetail } from "./contracts";
import { nurseryDraftNumber, type AllocationDraft } from "./nursery-allocation-draft";
import type { NurseryRaftOption } from "./nursery-raft-options";

export function NurseryRaftCard({ raft, draft, original, disabled, quickDisabled, onToggle, onChange, onPutAll }: {
  raft: NurseryRaftOption; draft?: AllocationDraft; original?: NurseryDetail["allocations"][number];
  disabled: boolean; quickDisabled: boolean; onToggle(): void;
  onChange(values: Partial<AllocationDraft>): void; onPutAll(): void;
}) {
  const frozen = !!original && !original.canChange, retained = frozen || !!original?.seeded;
  const count = draft ? nurseryDraftNumber(draft.quantity) : 0;
  return <article className={`min-w-0 rounded-control border ${draft ? "border-primary bg-primary/5" : "border-border bg-surface"}`}>
    <button key="toggle-raft" type="button" aria-pressed={!!draft} aria-label={`${draft ? "Bỏ chọn" : "Chọn"} bè ${raft.raftCode}`}
      disabled={disabled || retained} onClick={onToggle}
      className="flex min-h-16 w-full items-start justify-between gap-2 rounded-control p-3 text-left focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-default">
      <span className="min-w-0"><strong className="block break-words text-sm">{raft.raftCode}</strong>
        <span className="text-xs text-text-muted">{raft.laneCount == null ? "" : `${raft.laneCount} làn · `}{original ? "Bè đã nhận" : "Đang sử dụng · Còn trống"}</span>
      </span><span aria-hidden="true" className="shrink-0 text-primary">{draft ? "✓" : "+"}</span>
    </button>
    {draft && <div className="space-y-3 border-t border-border p-3">
      <p className="text-xs text-text-muted">Đã chọn {Number.isFinite(count) ? quantityText(count) : "—"}</p>
      <UnitField label="Số mảnh chuyển sang bè" accessibleName={`Số mảnh chuyển sang bè ${raft.raftCode}`} unit="mảnh" decimals={2}
        value={draft.quantity} min={original?.seeded || 0.01} disabled={frozen} required onChange={quantity => onChange({ quantity })} />
      <UnitField label="Sản lượng dự kiến (kg)" accessibleName={`Sản lượng dự kiến bè ${raft.raftCode} (kg)`} unit="kg" decimals={2}
        min={0.01} value={draft.targetYieldKg} disabled={frozen} hint={original?.targetYieldKg != null ? `Bỏ trống để giữ ${quantityText(original.targetYieldKg, "kg")}.` : undefined}
        onChange={targetYieldKg => onChange({ targetYieldKg })} />
    </div>}
    <div className="px-3 pb-3"><Button key="put-all-on-raft" type="button" variant="secondary" className="w-auto max-w-full" disabled={quickDisabled} onClick={onPutAll}>Dồn hết vào bè này</Button>
      {original && <p className="mt-2 text-xs text-text-muted">Đã chuyển sang bè {raft.raftCode}: {quantityText(original.quantity)} · Đã thả: {quantityText(original.seeded)}{frozen ? " · Đã kết thúc nuôi, giữ nguyên số mảnh và sản lượng dự kiến." : original.seeded > 0 ? " · Không được giảm dưới số đã thả." : ""}</p>}
    </div>
  </article>;
}
