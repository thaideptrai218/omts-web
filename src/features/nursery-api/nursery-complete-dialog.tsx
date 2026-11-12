"use client";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { DatePickerField } from "@/components/ui/management-screen/date-picker-field";
import { UnitField } from "@/components/form/number-fields";
import { ErrorNotice, Note, Skeleton, businessToday, useRemote } from "@/features/operations/ui";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { readCycles } from "@/features/cycles-api/repository";
import { zoneCycles } from "@/features/cycles-api/contracts";
import { quantityText, type AllocationInput, type NurseryDetail } from "./contracts";
import { nurseryMultipart, nurseryService } from "./service";
import { NurseryPhotoField, type NurseryPhotoDraft } from "./nursery-photo-field";
import { NurseryReviewTable } from "./nursery-review-table";
import { NurseryAllocationFields } from "./nursery-allocation-fields";
import { estimatedLoss } from "./allocation-calculations";
import { validateCompletion } from "./nursery-completion-validation";
import { useNurseryMutation } from "./use-nursery-mutation";

export type CompletionMode = "complete" | "survivors" | "allocations";
const titles: Record<CompletionMode, string> = { complete: "Hoàn tất ươm giống", survivors: "Sửa số sống sót (ước tính)", allocations: "Chuyển phân bổ giữa bè" };
export function NurseryCompleteDialog({ batch, mode, onClose, onSaved }: { batch: NurseryDetail; mode: CompletionMode; onClose(): void; onSaved(batch: NurseryDetail): void }) {
  const rafts = useRemote(useCallback((signal: AbortSignal) => readCycles({ action: "zone", zoneId: batch.zoneId }, zoneCycles, signal), [batch.zoneId]));
  const [survivors, setSurvivors] = useState(batch.survivors == null ? "" : String(batch.survivors)), [completedOn, setCompletedOn] = useState(businessToday);
  const [allocations, setAllocations] = useState<AllocationInput[]>(batch.allocations.map(item => ({ raftId: item.raftId, quantity: item.quantity, ...(item.targetYieldKg != null ? { targetYieldKg: item.targetYieldKg } : {}) })));
  const [photos, setPhotos] = useState<NurseryPhotoDraft[]>([]), [photoBusy, setPhotoBusy] = useState(false), [reason, setReason] = useState("");
  const [review, setReview] = useState(false), [error, setError] = useState<string>();
  const mutation = useNurseryMutation(), confirmation = useActionDialog(), loss = estimatedLoss(batch.quantityIn, Number(survivors));
  async function close() { if (!mutation.busy() && !photoBusy && await confirmation.confirm("Bỏ các thay đổi chưa lưu?")) onClose(); }
  async function submit() {
    if (mutation.busy() || mutation.blocked || photoBusy) return;
    const found = validateCompletion(batch, survivors, allocations)
      ?? (mode === "complete" && (!completedOn || completedOn < batch.startDate || completedOn > businessToday()) ? "Ngày hoàn tất: chọn từ ngày bắt đầu đến hôm nay." : undefined)
      ?? (mode === "complete" && !photos.length ? "Ảnh: cần từ 1 đến 3 ảnh hoàn tất ươm." : undefined)
      ?? (mode !== "complete" && !reason.trim() ? "Lý do: nhập lý do điều chỉnh." : undefined)
      ?? (Number(survivors) > 0 && (!rafts.data || rafts.error) ? "Chưa tải được danh sách bè. Hãy tải lại trước khi xác nhận." : undefined);
    setError(found); if (found) return;
    if (!review) { setReview(true); return; }
    const body = mode === "complete" ? nurseryMultipart({ survivors: Number(survivors), completedOn, allocations, rowVersion: batch.rowVersion }, photos.map(photo => photo.file))
      : { ...(mode === "survivors" ? { survivors: Number(survivors) } : {}), allocations, reason: reason.trim(), rowVersion: batch.rowVersion };
    const result = await mutation.run(() => nurseryService.save(mode, batch.zoneId, body, batch.id));
    if (result) onSaved(result);
  }
  return <Dialog open size="xl" title={`${titles[mode]} · ${batch.code}`} dismissible={false} onOpenChange={open => { if (!open) void close(); }}>{confirmation.dialog}
    <form noValidate onSubmit={event => { event.preventDefault(); void submit(); }}>
      <p className="mb-3 text-sm font-medium">Bước {review ? "2/2 · Xem lại và xác nhận" : "1/2 · Sống sót và phân bổ"}</p>
      <fieldset disabled={mutation.pending || mutation.blocked || photoBusy} className="min-w-0 space-y-4">
        {!review ? <>
          <p className="text-sm">Vào ươm: {quantityText(batch.quantityIn)}{mode === "survivors" ? ` · Sống sót cũ (ước tính): ${quantityText(batch.survivors)}` : ""}</p>
          <div className="grid gap-3 sm:grid-cols-2"><UnitField label={mode === "survivors" ? "Số sống sót mới (ước tính)" : "Số sống sót (ước tính)"} unit="mảnh" decimals={2} min={0} max={batch.quantityIn} value={survivors} disabled={mode === "allocations"} onChange={value => { setSurvivors(value); if (mode === "complete" && value !== "" && Number(value) === 0) setAllocations([]); }} required />
            {mode === "complete" && <DatePickerField label="Ngày hoàn tất ươm" value={completedOn} onChange={setCompletedOn} min={batch.startDate} max={businessToday()} required />}</div>
          {rafts.loading ? <Skeleton /> : rafts.error ? <><ErrorNotice error={rafts.error} /><Button type="button" variant="secondary" onClick={rafts.reload}>Tải lại bè nuôi</Button></> : <NurseryAllocationFields rafts={rafts.data ?? []} batch={batch} survivors={Number(survivors)} allocations={allocations} onChange={setAllocations} />}
          {mode === "complete" ? <NurseryPhotoField photos={photos} onChange={setPhotos} onBusy={setPhotoBusy} /> : <Note label="Lý do điều chỉnh" value={reason} required maxLength={1000} onChange={event => setReason(event.target.value)} />}
        </> : <>
          <NurseryReviewTable rows={[["Số mảnh vào ươm", quantityText(batch.quantityIn)], ...(mode === "survivors" ? [["Sống sót cũ → mới (ước tính)", `${quantityText(batch.survivors)} → ${quantityText(Number(survivors))}`] as const] : [["Số sống sót (ước tính)", quantityText(Number(survivors))] as const]),
            ["Hao hụt (ước tính)", `${quantityText(loss.lossPieces)} · ${loss.lossPercent.toLocaleString("vi-VN")}%`], ...(mode === "complete" ? [["Ngày hoàn tất", completedOn.split("-").reverse().join("/")] as const, ["Ảnh hiện trường", `${photos.length} ảnh`] as const] : [["Lý do điều chỉnh", reason] as const])]} />
          <NurseryReviewTable rows={allocations.map(item => [rafts.data?.find(raft => raft.raftId === item.raftId)?.raftCode ?? batch.allocations.find(old => old.raftId === item.raftId)?.raftCode ?? "Bè nuôi", <span key={item.raftId}>{quantityText(item.quantity)} · Sản lượng dự kiến: {quantityText(item.targetYieldKg, "kg")}</span>])} />
          {mode === "complete" && <p className="text-xs text-text-muted">{Number(survivors) === 0 ? "Hoàn tất đợt ươm, không tạo chu kỳ nuôi." : `Tạo ${allocations.length} chu kỳ nuôi. Bộ ảnh hoàn tất dùng chung cho các kế hoạch nuôi này.`}</p>}
        </>}
      </fieldset>
      <ErrorNotice error={error ?? mutation.error} />
      {mutation.blocked && <p role="alert" className="text-sm">Đóng cửa sổ và tải lại bản ghi để đối chiếu trước khi ghi lại.</p>}
      <div className="mt-4 flex flex-wrap justify-end gap-2"><Button key="cancel-completion" type="button" variant="secondary" className="w-auto" disabled={mutation.pending || photoBusy} onClick={() => void close()}>Bỏ qua</Button>
        {review && <Button key="back-completion" type="button" variant="secondary" className="w-auto" disabled={mutation.pending} onClick={() => setReview(false)}>Quay lại</Button>}
        <Button key={review ? "confirm-completion" : "review-completion"} type="submit" className="w-auto" isPending={mutation.pending} disabled={mutation.blocked || photoBusy}>{review ? mode === "complete" ? Number(survivors) > 0 ? "Xác nhận tạo chu kỳ" : "Xác nhận hoàn tất" : "Xác nhận điều chỉnh" : "Xem lại"}</Button></div>
    </form>
  </Dialog>;
}
