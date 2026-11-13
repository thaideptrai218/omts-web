"use client";
import { useCallback, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { NurseryReviewTable } from "@/features/nursery-api/nursery-review-table";
import { ErrorNotice, businessToday, useMutation, useRemote } from "@/features/operations/ui";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { CycleProductSelect } from "./cycle-product-select";
import { CycleStartFields, NurseryBatchSelect } from "./cycle-start-fields";
import { cycleStartFailure, cycleStartForm, emptyCycleStart, validateCycleStart, type CycleStartErrors, type CycleStartValues } from "./cycle-start-model";
import { nurseryBatchLabel, readAvailableNurseryBatches, wholePieces } from "./nursery-batch-options";
import { readFarmableProducts } from "./product-options";
import { writeCycle } from "./repository";

const started = z.object({ cycle: z.object({ id: z.guid() }) });

/**
 * "Bắt đầu chu kỳ nuôi" (NURSERY MODEL V2): a cycle is created by hand on an empty raft in use from ONE finished nursery batch,
 * with the planned total yield, the start date and 1-3 plan photos. Step 1 collects them, step 2 reviews before the multipart submit.
 * `onStarted` receives the id of the new cycle so the screen can open it.
 */
export function CycleStartDialog({ raftId, raftCode, zoneId, zoneLabel, onClose, onStarted }: { raftId: string; raftCode: string; zoneId: string; zoneLabel: string; onClose(): void; onStarted(cycleId: string | undefined): void }) {
  const batches = useRemote(useCallback((signal: AbortSignal) => readAvailableNurseryBatches(zoneId, signal), [zoneId]));
  // The catalogue is read once per dialog; the farmed product is chosen from the products in use.
  const products = useRemote(useCallback((signal: AbortSignal) => readFarmableProducts(signal), []));
  const [values, setValues] = useState<CycleStartValues>(() => emptyCycleStart(businessToday())), [photos, setPhotos] = useState<File[]>([]), [photoBusy, setPhotoBusy] = useState(false);
  const [review, setReview] = useState(false), [errors, setErrors] = useState<CycleStartErrors>({});
  const mutation = useMutation(), confirmation = useActionDialog();
  const batch = batches.data?.find(item => item.id === values.nurseryBatchId), product = products.data?.find(item => item.id === values.productId);
  const server = mutation.failure ? cycleStartFailure(mutation.failure, mutation.error) : undefined;
  const fieldErrors: CycleStartErrors = { ...errors, ...server?.errors };
  // A refusal that names an input sends the user back to step 1, where the message sits at that input.
  const reviewing = review && !Object.keys(server?.errors ?? {}).length;
  const dirty = !!(values.nurseryBatchId || values.productId || values.targetYieldKg || values.note || photos.length);
  const edit = (key: keyof CycleStartValues, value: string) => { mutation.reviewed(); setErrors(current => ({ ...current, [key]: undefined })); setValues(current => ({ ...current, [key]: value })); };
  const leave = async () => { if (!mutation.busy() && !photoBusy && (!dirty || await confirmation.confirm("Bỏ thông tin chu kỳ nuôi chưa lưu?"))) onClose(); };

  async function submit() {
    if (mutation.busy() || mutation.blocked || photoBusy) return;
    const found = validateCycleStart(values, photos.length, businessToday()); setErrors(found);
    if (Object.keys(found).length) { setReview(false); return; }
    if (!reviewing) { mutation.reviewed(); setReview(true); return; }
    const result = await mutation.run(() => writeCycle("start", raftId, cycleStartForm(values, photos)));
    if (result !== undefined) onStarted(started.safeParse(result).data?.cycle.id);
  }
  const batchSelect = <NurseryBatchSelect batches={batches.data} loading={batches.loading} error={batches.error} onReload={batches.reload} value={values.nurseryBatchId} onChange={id => edit("nurseryBatchId", id)} message={fieldErrors.nurseryBatchId} />;
  const productSelect = <CycleProductSelect products={products.data} loading={products.loading} error={products.error} onReload={products.reload} value={values.productId} onChange={id => edit("productId", id)} message={fieldErrors.productId} />;
  return <Dialog open size="lg" title={`Bắt đầu chu kỳ nuôi · ${raftCode}`} dismissible={false} onOpenChange={open => { if (!open) void leave(); }}>{confirmation.dialog}
    <form noValidate onSubmit={event => { event.preventDefault(); void submit(); }}>
      <p className="mb-3 text-sm font-medium">Bước {reviewing ? "2/2 · Xem lại và xác nhận" : "1/2 · Thông tin chu kỳ"}</p>
      <fieldset disabled={mutation.pending || mutation.blocked || photoBusy} className="min-w-0 space-y-3">
        {reviewing ? <NurseryReviewTable rows={[["Bè nuôi", raftCode], ["Đợt ươm", batch ? nurseryBatchLabel(batch) : "—"], ["Loại hàu nuôi", product?.name ?? "—"], ["Sản lượng dự kiến", `${values.targetYieldKg.replace(".", ",")} kg`],
          ["Ngày bắt đầu", formatVietnameseDate(values.startDate)], ["Ảnh kế hoạch", `${photos.length} ảnh`], ...(values.note.trim() ? [["Ghi chú", values.note.trim()] as const] : [])]} />
          : <CycleStartFields raftCode={raftCode} zoneLabel={zoneLabel} values={values} errors={fieldErrors} onValue={edit} batchSelect={batchSelect} productSelect={productSelect} photos={photos}
            onPhotos={files => { setErrors(current => ({ ...current, photos: undefined })); setPhotos(files); }} onPhotoBusy={setPhotoBusy} />}
      </fieldset>
      {reviewing && batch && <p className="text-xs text-text-muted">Đợt {batch.code} còn {wholePieces(batch.remaining)} mảnh trong kho ươm (ước tính); số mảnh thả sẽ ghi ở bước Thả giống.</p>}
      <ErrorNotice error={server && !Object.keys(server.errors).length ? server.general : undefined} />
      {mutation.blocked && <p role="alert" className="text-sm">Hãy đóng cửa sổ và tải lại danh sách để đối chiếu kết quả trước khi ghi lại.</p>}
      <div className="mt-4 flex flex-wrap justify-end gap-2"><Button key="cancel-start-cycle" type="button" variant="secondary" className="w-auto" disabled={mutation.pending || photoBusy} onClick={() => void leave()}>Bỏ qua</Button>
        {reviewing && <Button key="back-start-cycle" type="button" variant="secondary" className="w-auto" disabled={mutation.pending} onClick={() => setReview(false)}>Quay lại</Button>}
        <Button key={reviewing ? "confirm-start-cycle" : "review-start-cycle"} type="submit" className="w-auto" isPending={mutation.pending} disabled={mutation.blocked || photoBusy || !reviewing && !batches.data?.length}>{reviewing ? "Xác nhận bắt đầu chu kỳ" : "Tiếp tục"}</Button></div>
    </form></Dialog>;
}
