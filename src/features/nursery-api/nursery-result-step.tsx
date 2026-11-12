import { UnitField } from "@/components/form/number-fields";
import { Field, businessToday } from "@/features/operations/ui";
import { estimatedLoss } from "./allocation-calculations";
import { quantityText, type NurseryDetail } from "./contracts";
import { nurseryDraftNumber } from "./nursery-allocation-draft";
import { NurseryPhotoField, type NurseryPhotoDraft } from "./nursery-photo-field";

export function NurseryResultStep({ batch, survivors, onSurvivorsChange, completedOn, onDateChange, photos, onPhotosChange, onPhotoBusy, mode }: {
  batch: NurseryDetail; survivors: string; onSurvivorsChange(value: string): void;
  completedOn: string; onDateChange(value: string): void;
  photos: NurseryPhotoDraft[]; onPhotosChange(photos: NurseryPhotoDraft[]): void; onPhotoBusy(busy: boolean): void;
  mode: "complete" | "survivors" | "allocations";
}) {
  const count = nurseryDraftNumber(survivors), valid = Number.isFinite(count) && count >= 0 && count <= batch.quantityIn;
  const loss = estimatedLoss(batch.quantityIn, count);
  return <section aria-label="Kết quả ươm" className="space-y-3">
    <p className="text-sm">Vào ươm: <strong>{quantityText(batch.quantityIn)}</strong>{mode === "survivors" && ` · Sống sót cũ (ước tính): ${quantityText(batch.survivors)}`}</p>
    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
      <div className="min-w-0 space-y-1">
        <UnitField label={mode === "survivors" ? "Số sống sót mới (ước tính)" : "Số sống sót (ước tính)"} unit="mảnh" decimals={2}
          min={0} max={batch.quantityIn} value={survivors} disabled={mode === "allocations"} onChange={onSurvivorsChange} required />
        <p role="status" className="text-xs text-text-muted">Hao hụt (ước tính): {valid ? `${quantityText(loss.lossPieces)} · ${loss.lossPercent.toLocaleString("vi-VN")}%` : "—"}</p>
      </div>
      {mode === "complete" && <Field label="Ngày hoàn tất ươm *" type="date" value={completedOn} onChange={event => onDateChange(event.target.value)} min={batch.startDate} max={businessToday()} required />}
    </div>
    {mode === "complete" && <NurseryPhotoField photos={photos} onChange={onPhotosChange} onBusy={onPhotoBusy} />}
  </section>;
}
