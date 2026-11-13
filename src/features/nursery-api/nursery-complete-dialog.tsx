"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ErrorNotice, Note, businessToday } from "@/features/operations/ui";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import type { NurseryDetail } from "./contracts";
import { nurseryMultipart, nurseryService } from "./service";
import type { NurseryPhotoDraft } from "./nursery-photo-field";
import { nurseryDraftNumber } from "./nursery-inventory";
import { validateCompletionResult, validateSurvivors } from "./nursery-completion-validation";
import { NurseryZoneReadonly } from "./nursery-zone-readonly";
import { NurseryResultStep } from "./nursery-result-step";
import { NurseryReviewStep } from "./nursery-review-step";
import { NurseryCompletionSteps, type NurseryCompletionStep } from "./nursery-completion-steps";
import { useNurseryMutation } from "./use-nursery-mutation";

export type CompletionMode = "complete" | "survivors";
type CompletionProps = { batch: NurseryDetail; mode: CompletionMode; onClose(): void; onSaved(batch: NurseryDetail): void };
const titles: Record<CompletionMode, string> = { complete: "Hoàn tất ươm", survivors: "Sửa số sống sót (ước tính)" };

export function NurseryCompleteDialog(props: CompletionProps) {
  return <NurseryCompletionForm key={`${props.batch.id}-${props.batch.rowVersion}-${props.mode}`} {...props} />;
}

function NurseryCompletionForm({ batch, mode, onClose, onSaved }: CompletionProps) {
  const [survivors, setSurvivors] = useState(batch.survivors == null ? "" : String(batch.survivors));
  const [completedOn, setCompletedOn] = useState(businessToday);
  const [photos, setPhotos] = useState<NurseryPhotoDraft[]>([]), [photoBusy, setPhotoBusy] = useState(false), [reason, setReason] = useState("");
  const [step, setStep] = useState<NurseryCompletionStep>("result"), [error, setError] = useState<string>();
  const mutation = useNurseryMutation(), confirmation = useActionDialog();
  const review = step === "review", disabled = mutation.pending || mutation.blocked || photoBusy;

  async function close() {
    if (!mutation.busy() && !photoBusy && await confirmation.confirm("Bỏ các thay đổi chưa lưu?")) onClose();
  }
  async function submit() {
    if (mutation.busy() || mutation.blocked || photoBusy) return;
    const found = (mode === "complete" ? validateCompletionResult(batch, survivors, completedOn, photos.length, businessToday()) : validateSurvivors(batch, survivors))
      ?? (mode === "survivors" && (!reason.trim() || reason.trim().length > 1000) ? "Lý do: nhập từ 1 đến 1.000 ký tự." : undefined);
    setError(found); if (found) return;
    if (!review) { setStep("review"); return; }
    const count = nurseryDraftNumber(survivors);
    const body = mode === "complete" ? nurseryMultipart({ survivors: count, completedOn, rowVersion: batch.rowVersion }, photos.map(photo => photo.file))
      : { survivors: count, reason: reason.trim(), rowVersion: batch.rowVersion };
    const result = await mutation.run(() => nurseryService.save(mode, batch.zoneId, body, batch.id));
    if (result) onSaved(result);
  }
  return <Dialog open size="lg" title={`${titles[mode]} · ${batch.code}`} dismissible={false} onCloseRequest={() => void close()} onOpenChange={open => { if (!open) void close(); }}>{confirmation.dialog}
    <form noValidate className="min-w-0" onSubmit={event => { event.preventDefault(); void submit(); }}>
      <NurseryCompletionSteps step={step} complete={mode === "complete"} />
      <fieldset disabled={disabled} className="min-w-0 space-y-4">
        <NurseryZoneReadonly batch={batch} />
        {review ? <NurseryReviewStep batch={batch} mode={mode} survivors={nurseryDraftNumber(survivors)} completedOn={completedOn} photoCount={photos.length} reason={reason} /> : <>
          <NurseryResultStep batch={batch} mode={mode} survivors={survivors} onSurvivorsChange={value => { setSurvivors(value); setError(undefined); }}
            completedOn={completedOn} onDateChange={value => { setCompletedOn(value); setError(undefined); }}
            photos={photos} onPhotosChange={value => { setPhotos(value); setError(undefined); }} onPhotoBusy={setPhotoBusy} />
          {mode === "survivors" && <Note label="Lý do điều chỉnh" value={reason} required maxLength={1000} onChange={event => { setReason(event.target.value); setError(undefined); }} />}
        </>}
      </fieldset>
      <ErrorNotice error={error ?? mutation.error} />
      {mutation.blocked && <p role="alert" className="text-sm">Đóng cửa sổ và tải lại bản ghi để đối chiếu trước khi ghi lại.</p>}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button key="cancel-completion" type="button" variant="secondary" className="w-auto" disabled={mutation.pending || photoBusy} onClick={() => void close()}>Bỏ qua</Button>
        {review && <Button key={`${mode}-${step}-back`} type="button" variant="secondary" className="w-auto" disabled={disabled} onClick={() => { setError(undefined); setStep("result"); }}>Quay lại</Button>}
        <Button key={`${mode}-${step}-submit`} type="submit" className="w-auto max-w-full" isPending={mutation.pending} disabled={disabled}>
          {review ? mode === "complete" ? "Xác nhận hoàn tất ươm" : "Xác nhận điều chỉnh" : "Tiếp tục"}</Button>
      </div>
    </form>
  </Dialog>;
}
