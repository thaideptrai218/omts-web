"use client";
import { useEffect, useImperativeHandle, useState, type Ref } from "react";
import { Button } from "@/components/ui/button";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { TabFooter } from "@/features/farming-management/detail-parts";
import type { UnsavedGuard } from "@/features/farming-management/use-unsaved-guard";
import { businessToday, ErrorNotice, Field, Note } from "@/features/operations/ui";
import type { NurseryDetail } from "./contracts";
import { nurseryMultipart, nurseryService } from "./service";
import { NurseryPhotoField, type NurseryPhotoDraft } from "./nursery-photo-field";
import { useNurseryMutation } from "./use-nursery-mutation";
import { nurseryDisplayText } from "./nursery-display-text";
import { nurseryQuantityValue } from "./nursery-quantity-value";

export type NurseryEditGuard = { canLeave(): Promise<boolean> };
export function NurseryEditForm({ batch, onClose, onSaved, onReload, leaveRef, guard }: { batch: NurseryDetail; onClose(): void; onSaved(batch: NurseryDetail): void; onReload(): void; leaveRef: Ref<NurseryEditGuard>; guard: UnsavedGuard }) {
  const [quantity, setQuantity] = useState(String(batch.quantityIn)), [date, setDate] = useState(batch.startDate), [note, setNote] = useState(batch.note ?? "");
  const [kept, setKept] = useState(batch.startPhotos), [photos, setPhotos] = useState<NurseryPhotoDraft[]>([]), [photoBusy, setPhotoBusy] = useState(false), [error, setError] = useState<string>();
  const mutation = useNurseryMutation(), confirmation = useActionDialog();
  const photosChanged = kept.length !== batch.startPhotos.length || photos.length > 0;
  const dirty = quantity !== String(batch.quantityIn) || date !== batch.startDate || note !== (batch.note ?? "") || photosChanged;
  const { dirty: dirtyRef, pending: pendingRef } = guard;
  useEffect(() => {
    dirtyRef.current = dirty; pendingRef.current = mutation.pending || photoBusy;
    return () => { dirtyRef.current = false; pendingRef.current = false; };
  }, [dirty, dirtyRef, pendingRef, mutation.pending, photoBusy]);
  async function canLeave() { return !mutation.busy() && !photoBusy && (!dirty || await confirmation.confirm("Bỏ các thay đổi đợt ươm chưa lưu?")); }
  useImperativeHandle(leaveRef, () => ({ canLeave }));
  async function close() { if (await canLeave()) onClose(); }
  async function save() {
    if (mutation.busy() || mutation.blocked || photoBusy || batch.statusId !== 4001 || !batch.canEdit) return;
    if (!quantity || !Number.isFinite(nurseryQuantityValue(quantity)) || nurseryQuantityValue(quantity) <= 0) { setError("Số mảnh vào ươm phải lớn hơn 0, tối đa 2 chữ số thập phân."); return; }
    if (!date || date > businessToday()) { setError("Ngày bắt đầu ươm phải không sau hôm nay."); return; }
    if (photosChanged && (kept.length + photos.length < 1 || kept.length + photos.length > 3)) { setError("Ảnh: cần giữ hoặc chọn từ 1 đến 3 ảnh hiện trường."); return; }
    setError(undefined);
    const form = nurseryMultipart({ quantity: nurseryQuantityValue(quantity), startDate: date, note, rowVersion: batch.rowVersion,
      ...(photosChanged ? { keepPhotoIds: kept.map(photo => photo.id) } : {}) }, photos.map(photo => photo.file));
    const result = await mutation.run(() => nurseryService.save("update", batch.zoneId, form, batch.id));
    if (result) onSaved(result);
  }
  return <form noValidate aria-label={`Chỉnh sửa ${batch.code}`} onSubmit={event => { event.preventDefault(); void save(); }}>{confirmation.dialog}
      <dl className="mb-3 grid gap-2 text-sm sm:grid-cols-2"><div><dt className="text-xs text-text-muted">Vùng ươm</dt><dd>{batch.zoneCode} · {batch.zoneName}</dd></div><div><dt className="text-xs text-text-muted">Lô giống</dt><dd>{batch.seedLot.code}</dd></div></dl>
      <fieldset disabled={mutation.pending || mutation.blocked || photoBusy} className="min-w-0 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2"><Field label="Số mảnh vào ươm" type="text" inputMode="decimal" value={quantity} onChange={event => setQuantity(event.target.value)} required />
          <Field label="Ngày bắt đầu ươm *" type="date" value={date} onChange={event => setDate(event.target.value)} max={businessToday()} required /></div>
        <Note label="Ghi chú" value={note} onChange={event => setNote(event.target.value)} maxLength={1000} />
        <NurseryPhotoField photos={photos} onChange={setPhotos} kept={kept} onRemoveKept={id => setKept(current => current.filter(photo => photo.id !== id))} onBusy={setPhotoBusy} />
      </fieldset>
      <ErrorNotice error={nurseryDisplayText(error ?? mutation.error)} />
      {mutation.blocked && <div role="alert" className="space-y-2 text-sm"><p>Hãy tải lại đợt ươm để đối chiếu kết quả trước khi lưu tiếp.</p>
        <Button key="reload-nursery-edit" type="button" variant="secondary" className="w-auto" onClick={() => void canLeave().then(allowed => { if (allowed) onReload(); })}>Tải lại đợt ươm để đối chiếu</Button></div>}
      <TabFooter right={<><Button key="cancel-nursery-edit" type="button" variant="secondary" className="w-auto" disabled={mutation.pending || photoBusy} onClick={() => void close()}>Bỏ qua</Button>
        <Button key="save-nursery-edit" type="submit" className="w-auto" isPending={mutation.pending} disabled={mutation.blocked || photoBusy}>Lưu thay đổi</Button></>} />
    </form>;
}
