"use client";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ErrorNotice, Note, businessToday, useRemote } from "@/features/operations/ui";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { readCycles } from "@/features/cycles-api/repository";
import { zoneCycles } from "@/features/cycles-api/contracts";
import type { NurseryDetail } from "./contracts";
import { nurseryMultipart, nurseryService } from "./service";
import type { NurseryPhotoDraft } from "./nursery-photo-field";
import { allocationDrafts, allocationInputs, nurseryDraftNumber, type AllocationDraft } from "./nursery-allocation-draft";
import { validateCompletion, validateCompletionResult, validateSurvivors } from "./nursery-completion-validation";
import { nurseryCompletionMessage } from "./nursery-completion-messages";
import { nurseryRaftOptions } from "./nursery-raft-options";
import { NurseryZoneReadonly } from "./nursery-zone-readonly";
import { NurseryResultStep } from "./nursery-result-step";
import { NurseryTransferStep } from "./nursery-transfer-step";
import { NurseryReviewStep } from "./nursery-review-step";
import { NurseryCompletionSteps, type NurseryCompletionStep } from "./nursery-completion-steps";
import { useNurseryMutation } from "./use-nursery-mutation";

export type CompletionMode = "complete" | "survivors" | "allocations";
type CompletionProps = { batch: NurseryDetail; mode: CompletionMode; onClose(): void; onSaved(batch: NurseryDetail): void };
const titles: Record<CompletionMode, string> = { complete: "Hoàn tất ươm giống", survivors: "Sửa số sống sót (ước tính)", allocations: "Chuyển lại số mảnh giữa các bè" };

export function NurseryCompleteDialog(props: CompletionProps) {
  // A mode change starts its own draft, even if the caller keeps the dialog mounted.
  return <NurseryCompletionForm key={`${props.batch.id}-${props.batch.rowVersion}-${props.mode}`} {...props} />;
}

function NurseryCompletionForm({ batch, mode, onClose, onSaved }: CompletionProps) {
  const rafts = useRemote(useCallback((signal: AbortSignal) => readCycles({ action: "zone", zoneId: batch.zoneId }, zoneCycles, signal), [batch.zoneId]));
  const [survivors, setSurvivors] = useState(batch.survivors == null ? "" : String(batch.survivors));
  const [completedOn, setCompletedOn] = useState(businessToday);
  const [allocations, setAllocations] = useState<AllocationDraft[]>(() => allocationDrafts(batch.allocations));
  const [photos, setPhotos] = useState<NurseryPhotoDraft[]>([]), [photoBusy, setPhotoBusy] = useState(false), [reason, setReason] = useState("");
  const [step, setStep] = useState<NurseryCompletionStep>(mode === "complete" ? "result" : "edit");
  const [error, setError] = useState<string>();
  const mutation = useNurseryMutation(), confirmation = useActionDialog();
  const count = nurseryDraftNumber(survivors), review = step === "review";
  const inputs = allocationInputs(allocations).map(item => {
    const old = batch.allocations.find(row => row.raftId === item.raftId);
    // On correction the API keeps an existing target when the optional field is omitted.
    return item.targetYieldKg === undefined && old?.targetYieldKg != null ? { ...item, targetYieldKg: old.targetYieldKg } : item;
  });
  const resultError = mode === "complete" ? validateCompletionResult(batch, survivors, completedOn, photos.length, businessToday()) : validateSurvivors(batch, survivors);
  const offered = nurseryRaftOptions(rafts.data ?? [], batch);
  const transferError = validateCompletion(batch, survivors, inputs)
    ?? (count > 0 && (rafts.loading || !rafts.data || rafts.error) ? "Chưa tải được danh sách bè. Hãy tải lại trước khi xác nhận." : undefined)
    ?? (inputs.some(item => !offered.some(raft => raft.raftId === item.raftId)) ? "Có bè không còn nhận được. Bỏ chọn bè đó và chọn bè trống khác trong vùng." : undefined);
  const disabled = mutation.pending || mutation.blocked || photoBusy;

  function changeSurvivors(value: string) {
    setSurvivors(value); setError(undefined);
    if (nurseryDraftNumber(value) === 0 && !batch.allocations.some(item => !item.canChange || item.seeded > 0)) setAllocations([]);
  }
  async function close() {
    if (!mutation.busy() && !photoBusy && await confirmation.confirm("Bỏ các thay đổi chưa lưu?")) onClose();
  }
  function back() {
    setError(undefined);
    setStep(mode !== "complete" ? "edit" : step === "transfer" || count === 0 ? "result" : "transfer");
  }
  async function submit() {
    if (mutation.busy() || mutation.blocked || photoBusy) return;
    const found = resultError ?? (step !== "result" ? transferError : undefined)
      ?? (mode !== "complete" && (!reason.trim() || reason.trim().length > 1000) ? "Lý do: nhập từ 1 đến 1.000 ký tự." : undefined);
    setError(found); if (found) return;
    if (!review) {
      setStep(mode === "complete" && step === "result" && count > 0 ? "transfer" : "review");
      return;
    }
    const body = mode === "complete" ? nurseryMultipart({ survivors: count, completedOn, allocations: inputs, rowVersion: batch.rowVersion }, photos.map(photo => photo.file))
      : { ...(mode === "survivors" ? { survivors: count } : {}), allocations: inputs, reason: reason.trim(), rowVersion: batch.rowVersion };
    const result = await mutation.run(() => nurseryService.save(mode, batch.zoneId, body, batch.id));
    if (result) onSaved(result);
  }
  return <Dialog open size="xl" title={`${titles[mode]} · ${batch.code}`} dismissible={false} onOpenChange={open => { if (!open) void close(); }}>{confirmation.dialog}
    <form noValidate className="min-w-0" onSubmit={event => { event.preventDefault(); void submit(); }}>
      <NurseryCompletionSteps step={step} complete={mode === "complete"} zero={count === 0} />
      <fieldset disabled={disabled} className="min-w-0 space-y-4">
        <NurseryZoneReadonly batch={batch} />
        {review ? <NurseryReviewStep batch={batch} mode={mode} survivors={count} completedOn={completedOn} photoCount={photos.length} allocations={inputs} rafts={rafts.data ?? []} reason={reason} /> : <>
          {(step === "result" || step === "edit") && <NurseryResultStep batch={batch} mode={mode} survivors={survivors} onSurvivorsChange={changeSurvivors}
            completedOn={completedOn} onDateChange={value => { setCompletedOn(value); setError(undefined); }}
            photos={photos} onPhotosChange={value => { setPhotos(value); setError(undefined); }} onPhotoBusy={setPhotoBusy} />}
          {(step === "transfer" || (step === "edit" && count !== 0)) && <NurseryTransferStep rafts={rafts} batch={batch} survivors={count} allocations={allocations}
            onChange={value => { setAllocations(value); setError(undefined); }} />}
          {step === "edit" && <Note label="Lý do điều chỉnh" value={reason} required maxLength={1000} onChange={event => { setReason(event.target.value); setError(undefined); }} />}
        </>}
      </fieldset>
      <ErrorNotice error={nurseryCompletionMessage(error ?? mutation.error ?? (step === "transfer" ? transferError : undefined))} />
      {mutation.blocked && <p role="alert" className="text-sm">Đóng cửa sổ và tải lại bản ghi để đối chiếu trước khi ghi lại.</p>}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button key="cancel-completion" type="button" variant="secondary" className="w-auto" disabled={mutation.pending || photoBusy} onClick={() => void close()}>Bỏ qua</Button>
        {(review || step === "transfer") && <Button key={`${mode}-${step}-back`} type="button" variant="secondary" className="w-auto" disabled={disabled} onClick={back}>Quay lại</Button>}
        <Button key={`${mode}-${step}-submit`} type="submit" className="w-auto max-w-full" isPending={mutation.pending}
          disabled={disabled || (step === "transfer" && !!transferError)}>{review ? mode === "complete" ? count > 0 ? "Xác nhận hoàn tất và bắt đầu nuôi" : "Xác nhận hoàn tất" : "Xác nhận điều chỉnh" : "Tiếp tục"}</Button>
      </div>
    </form>
  </Dialog>;
}
