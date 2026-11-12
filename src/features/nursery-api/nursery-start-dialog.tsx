"use client";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { DatePickerField } from "@/components/ui/management-screen/date-picker-field";
import { UnitField } from "@/components/form/number-fields";
import { ErrorNotice, Note, Select, Skeleton, businessToday, useRemote } from "@/features/operations/ui";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import type { ZoneRow } from "@/features/zones-api/zone-model";
import { quantityText, type NurseryDetail } from "./contracts";
import { nurseryMultipart, nurseryService } from "./service";
import { NurseryPhotoField, type NurseryPhotoDraft } from "./nursery-photo-field";
import { NurseryReviewTable } from "./nursery-review-table";
import { useNurseryMutation } from "./use-nursery-mutation";

export function NurseryStartDialog({ zones, initialZone, onClose, onSaved }: { zones: readonly ZoneRow[]; initialZone: string; onClose(): void; onSaved(batch: NurseryDetail): void }) {
  const [zoneId, setZoneId] = useState(zones.some(zone => zone.id === initialZone) ? initialZone : zones[0]?.id ?? "");
  return <Dialog open size="lg" title="Bắt đầu ươm giống" onOpenChange={open => { if (!open) onClose(); }} dismissible={false}>
    <StartForm key={zoneId} zones={zones} zoneId={zoneId} onZone={setZoneId} onClose={onClose} onSaved={onSaved} />
  </Dialog>;
}
function StartForm({ zones, zoneId, onZone, onClose, onSaved }: { zones: readonly ZoneRow[]; zoneId: string; onZone(id: string): void; onClose(): void; onSaved(batch: NurseryDetail): void }) {
  const lots = useRemote(useCallback((signal: AbortSignal) => nurseryService.lots(zoneId, signal), [zoneId]));
  const [lotId, setLotId] = useState(""), [quantity, setQuantity] = useState(""), [date, setDate] = useState(businessToday), [note, setNote] = useState("");
  const [photos, setPhotos] = useState<NurseryPhotoDraft[]>([]), [photoBusy, setPhotoBusy] = useState(false), [review, setReview] = useState(false), [error, setError] = useState<string>();
  const mutation = useNurseryMutation(), confirmation = useActionDialog(), lot = lots.data?.lots.find(item => item.id === lotId);
  async function leave(action: () => void) { if (!mutation.busy() && !photoBusy && (!(quantity || note || photos.length || lotId) || await confirmation.confirm("Bỏ thông tin ươm giống chưa lưu?"))) action(); }
  function validate() {
    if (!lot) return "Lô giống: chọn lô giống trong kho.";
    if (!quantity || Number(quantity) <= 0) return "Số mảnh: nhập số lớn hơn 0.";
    if (!date || date > businessToday()) return "Ngày bắt đầu: chọn ngày không sau hôm nay.";
    if (photos.length < 1 || photos.length > 3) return "Ảnh: cần từ 1 đến 3 ảnh hiện trường.";
    return undefined;
  }
  async function submit() {
    if (mutation.busy() || mutation.blocked || photoBusy) return;
    const found = validate(); setError(found); if (found) return;
    if (!review) { setReview(true); return; }
    const result = await mutation.run(() => nurseryService.save("create", zoneId, nurseryMultipart({ seedLotId: lotId, quantity: Number(quantity), startDate: date, note }, photos.map(photo => photo.file))));
    if (result) onSaved(result);
  }
  return <form noValidate onSubmit={event => { event.preventDefault(); void submit(); }}>{confirmation.dialog}
    <p className="mb-3 text-sm font-medium">Bước {review ? "2/2 · Xem lại và xác nhận" : "1/2 · Thông tin ươm giống"}</p>
    <fieldset disabled={mutation.pending || mutation.blocked || photoBusy} className="min-w-0 space-y-3">
      {!review ? <>
        <Select label="Vùng nuôi" value={zoneId} onChange={event => void leave(() => onZone(event.target.value))}>{zones.map(zone => <option key={zone.id} value={zone.id}>{zone.code} · {zone.name}</option>)}</Select>
        {lots.loading ? <Skeleton /> : lots.error ? <><ErrorNotice error={lots.error} /><Button type="button" variant="secondary" onClick={lots.reload}>Tải lại lô giống</Button></> : <Select label="Lô giống trong kho (mảnh)" value={lotId} onChange={event => setLotId(event.target.value)}><option value="">Chọn lô giống</option>{lots.data?.lots.filter(item => (item.onHand ?? 0) > 0).map(item => <option key={item.id} value={item.id}>{item.code} · {item.itemName} · Tồn {quantityText(item.onHand)}</option>)}</Select>}
        {!lots.loading && !lots.error && !lots.data?.lots.length && <p className="text-sm">Không có lô giống còn tồn kho trong vùng này.</p>}
        <div className="grid gap-3 sm:grid-cols-2"><UnitField label="Số mảnh vào ươm" unit="mảnh" decimals={2} value={quantity} onChange={setQuantity} min={0.01} required /><DatePickerField label="Ngày bắt đầu ươm" value={date} onChange={setDate} max={businessToday()} required /></div>
        <Note label="Ghi chú" value={note} onChange={event => setNote(event.target.value)} maxLength={1000} />
        <NurseryPhotoField photos={photos} onChange={setPhotos} onBusy={setPhotoBusy} />
      </> : <NurseryReviewTable rows={[["Vùng nuôi", zones.find(zone => zone.id === zoneId)?.name], ["Lô giống", lot?.code], ["Nhà cung cấp", lot?.supplierName ?? "—"], ["Số mảnh vào ươm", quantityText(Number(quantity))], ["Ngày bắt đầu", date.split("-").reverse().join("/")], ["Tồn trước khi ươm", quantityText(lot?.onHand)], ["Tồn sau khi ươm", lot?.onHand == null ? "—" : quantityText(lot.onHand - Number(quantity))], ["Ảnh hiện trường", `${photos.length} ảnh`], ["Ghi chú", note || "—"]]} />}
    </fieldset>
    <ErrorNotice error={error ?? mutation.error} />
    {mutation.blocked && <p role="alert" className="text-sm">Hãy đóng cửa sổ và tải lại danh sách để đối chiếu kết quả trước khi ghi lại.</p>}
    <div className="mt-4 flex flex-wrap justify-end gap-2"><Button key="cancel-start" type="button" variant="secondary" className="w-auto" disabled={mutation.pending || photoBusy} onClick={() => void leave(onClose)}>Bỏ qua</Button>
      {review && <Button key="back-start" type="button" variant="secondary" className="w-auto" disabled={mutation.pending} onClick={() => setReview(false)}>Quay lại</Button>}
      <Button key={review ? "confirm-start" : "review-start"} type="submit" className="w-auto" isPending={mutation.pending} disabled={mutation.blocked || photoBusy}>{review ? "Xác nhận bắt đầu ươm" : "Xem lại"}</Button></div>
  </form>;
}
