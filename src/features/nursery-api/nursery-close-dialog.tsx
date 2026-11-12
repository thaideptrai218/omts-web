"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { UnsavedGuard } from "@/features/farming-management/use-unsaved-guard";
import { ErrorNotice, Note } from "@/features/operations/ui";
import { quantityText, type NurseryDetail } from "./contracts";
import { nurseryDisplayText } from "./nursery-display-text";
import { nurseryService } from "./service";
import { useNurseryMutation } from "./use-nursery-mutation";

export function NurseryCloseDialog({ batch, guard, onClose, onSaved }: {
  batch: NurseryDetail; guard: UnsavedGuard; onClose(): void; onSaved(batch: NurseryDetail): void;
}) {
  const [reason, setReason] = useState(""), [error, setError] = useState<string>();
  const mutation = useNurseryMutation(), { pending: pendingRef } = guard;
  useEffect(() => {
    if (!mutation.pending) return;
    pendingRef.current = true;
    return () => { pendingRef.current = false; };
  }, [mutation.pending, pendingRef]);
  function close() { if (!mutation.busy()) onClose(); }
  async function submit() {
    if (mutation.busy() || mutation.blocked) return;
    if (batch.statusId !== 4002 || batch.remaining <= 0) { setError("Đợt ươm không còn số mảnh để đóng. Hãy tải lại để đối chiếu."); return; }
    if (reason.trim().length > 1000) { setError("Lý do: nhập tối đa 1.000 ký tự."); return; }
    const record = await mutation.run(() => nurseryService.save("close", batch.zoneId,
      { ...(reason.trim() ? { reason: reason.trim() } : {}), rowVersion: batch.rowVersion }, batch.id));
    if (record) onSaved(record);
  }
  return <Dialog open title={`Đóng đợt ươm ${batch.code}`} dismissible={false} onOpenChange={open => { if (!open) close(); }}>
    <form noValidate onSubmit={event => { event.preventDefault(); void submit(); }}>
      <p className="mb-4 text-sm">{quantityText(batch.remaining)} còn lại sẽ ghi là hao hụt (ước tính). Đợt ươm sẽ kết thúc và không thể thả thêm.</p>
      <Note label="Lý do (tùy chọn)" value={reason} maxLength={1000} disabled={mutation.pending || mutation.blocked} onChange={event => { setReason(event.target.value); setError(undefined); }} />
      <ErrorNotice error={nurseryDisplayText(error ?? mutation.error)} />
      {mutation.blocked && <p role="alert" className="mt-3 text-sm">Đóng hộp thoại và tải lại đợt ươm để đối chiếu trước khi ghi lại.</p>}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button key="cancel-close-nursery" type="button" variant="secondary" className="w-auto" disabled={mutation.pending} onClick={close}>Bỏ qua</Button>
        <Button key="confirm-close-nursery" type="submit" className="w-auto" isPending={mutation.pending} disabled={mutation.pending || mutation.blocked}>Xác nhận đóng đợt ươm</Button>
      </div>
    </form>
  </Dialog>;
}
