"use client";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { createOperationsRepository } from "@/features/operations/repository";
import { ErrorNotice, Field, Note, Select, Skeleton, useRemote } from "@/features/operations/ui";
import { corrected, preview, seedLotOptions, type SeedingItem } from "./correction-contracts";
import { CorrectionConfirmStep, previewRows } from "./correction-confirm-step";
import { buildSeeding, seedingDraftOf } from "./correction-draft";
import { useCorrectionFlow } from "./use-correction-flow";
import { formatDay } from "./trace-format";
import s from "./lot-tracing.module.css";

const repo = createOperationsRepository("lot-tracing");
type Props = { item: SeedingItem; raftId: string; onClose(): void; onSaved(published: string[]): void };

/** Sửa phiên thả giống (TRACE-03.0): ngày, lô giống, luống, số lượng và lý do; lưu kèm phiên bản đã đọc (NFR-09). */
export function SeedingCorrectionDialog({ item, raftId, onClose, onSaved }: Props) {
  const lots = useRemote(useCallback((signal: AbortSignal) => repo.read("seed-lots", { id: raftId }, seedLotOptions, signal), [raftId]));
  return (
    <Dialog open size="lg" title={`Sửa phiên thả giống ${formatDay(item.seedingDate)}`} onOpenChange={(open) => !open && onClose()}>
      <div className={s.dialogBody}>
        {lots.loading && <Skeleton />}
        <ErrorNotice error={lots.error} />
        {lots.error && <Button className="w-auto" variant="secondary" onClick={lots.reload}>Tải lại</Button>}
        {lots.data && <SeedingForm item={item} options={lots.data.lots} onClose={onClose} onSaved={onSaved} />}
      </div>
    </Dialog>
  );
}

function SeedingForm({ item, options, onClose, onSaved }: { item: SeedingItem; options: { id: string; code: string; itemName: string | null; supplierName: string }[] } & Pick<Props, "onClose" | "onSaved">) {
  const [draft, setDraft] = useState(() => seedingDraftOf(item));
  const choices = options.some((o) => o.id === item.seedLot.id) ? options : [{ ...item.seedLot }, ...options];
  const flow = useCorrectionFlow({
    build: () => buildSeeding(draft),
    preview: (value) => repo.write("seeding-preview", value, preview, item.id),
    save: (value, ownerApproved) => repo.write("seeding-correct", { ...value, rowVersion: item.rowVersion, ownerApproved }, corrected, item.id),
  }, onSaved);
  const busy = flow.mutation.pending;
  const set = (patch: Partial<typeof draft>) => setDraft((d) => ({ ...d, ...patch }));

  if (flow.reviewed) return <CorrectionConfirmStep rows={previewRows(flow.reviewed.preview)} preview={flow.reviewed.preview} pending={busy} error={flow.mutation.error} onBack={flow.back} onConfirm={() => void flow.confirm()} />;
  return (
    <form onSubmit={(event) => { event.preventDefault(); void flow.review(); }}>
      <div className={s.formGrid}>
        <Field label="Ngày thả giống" type="date" required value={draft.seedingDate} disabled={busy} onChange={(e) => set({ seedingDate: e.target.value })} />
        <Select label="Lô giống" required value={draft.seedLotId} disabled={busy} onChange={(e) => set({ seedLotId: e.target.value })}>
          {choices.map((o) => <option key={o.id} value={o.id}>{o.itemName ?? "Lô giống"} · {o.code} · {o.supplierName}</option>)}
        </Select>
        <Field label="Luống (cách nhau bởi dấu phẩy)" inputMode="numeric" required value={draft.lanes} disabled={busy} onChange={(e) => set({ lanes: e.target.value })} />
        <Field label="Số lượng (dây)" inputMode="decimal" required value={draft.quantity} disabled={busy} onChange={(e) => set({ quantity: e.target.value })} />
      </div>
      <Note label="Lý do sửa" required maxLength={1000} value={draft.reason} disabled={busy} onChange={(e) => set({ reason: e.target.value })} />
      {item.lotCodes.length > 0 && <p className={s.hint}>Phiên này đang thuộc nguồn gốc của lô {item.lotCodes.join(", ")}.</p>}
      <ErrorNotice error={flow.mutation.error} />
      {!flow.built.ok && <p className={s.hint}>{flow.built.problem}</p>}
      <div className={s.dialogActions}>
        <Button className="w-auto" variant="secondary" disabled={busy} onClick={onClose}>Hủy</Button>
        <Button className="w-auto" type="submit" disabled={!flow.built.ok} isPending={busy} pendingLabel="Đang kiểm tra...">Xem lại thay đổi</Button>
      </div>
    </form>
  );
}
