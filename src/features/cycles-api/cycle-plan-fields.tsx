"use client";
import { useCallback } from "react";
import { UnitField } from "@/components/form/number-fields";
import { Field, Note, businessToday, useRemote } from "@/features/operations/ui";
import styles from "@/features/farming-management/farming-management.module.css";
import { DerivedProductNote, planProductText } from "./cycle-derived-product";
import { NurseryBatchSelect } from "./cycle-start-fields";
import type { CycleView, PlanDraft, PlanField } from "./cycle-model";
import { cycleNurseryText, readAvailableNurseryBatches, withCurrentBatch } from "./nursery-batch-options";

const fieldError = (text?: string) => text ? <p role="alert" className={styles.fieldError}>{text}</p> : null;

/**
 * Edit fields of "Kế hoạch": start date, planned yield and note always; the nursed batch only while no lane was seeded (`batchLocked`), otherwise it is
 * read only with the reason. The loại hàu is never edited: it follows the seed item of the nursed batch, so changing the batch re-derives it.
 */
export function CyclePlanFields({ cycle, zoneId, draft, errors, batchLocked, onChange }: { cycle: CycleView; zoneId: string; draft: PlanDraft; errors: Partial<Record<PlanField, string>>; batchLocked: boolean; onChange(key: PlanField, value: string): void }) {
  const batches = useRemote(useCallback((signal: AbortSignal) => batchLocked ? Promise.resolve({ status: "success" as const, data: [] }) : readAvailableNurseryBatches(zoneId, signal), [batchLocked, zoneId]));
  const options = withCurrentBatch(batches.data ?? [], cycle), picked = options.find(option => option.id === draft.nurseryBatchId);
  return <div className={styles.fields}>
    <div><Field label="Ngày bắt đầu *" type="date" name="startDate" max={businessToday()} value={draft.startDate} aria-invalid={!!errors.startDate} onChange={event => onChange("startDate", event.target.value)} />{fieldError(errors.startDate)}</div>
    <div><UnitField label={`Sản lượng dự kiến (kg)${draft.nurseryBatchId ? " *" : ""}`} unit="kg" decimals={2} min={0.01} value={draft.targetYieldKg} onChange={value => onChange("targetYieldKg", value)}
      hint="Tổng sản lượng giống này dự kiến thu về" error={errors.targetYieldKg} /></div>
    {batchLocked
      ? <><div><Field label="Đợt ươm" readOnly value={cycleNurseryText(cycle)} /><p className="mt-1 text-xs text-text-muted">Đã thả giống, không đổi được đợt ươm</p></div>
        <div><Field label="Loại hàu" readOnly value={cycle.productName ? planProductText(cycle) : "Chưa xác định loại hàu"} /><p className="mt-1 text-xs text-text-muted">Loại hàu theo giống của đợt ươm, nên cũng không đổi được</p></div></>
      : <div className="sm:col-span-2"><NurseryBatchSelect batches={options} loading={batches.loading} error={batches.error} onReload={batches.reload} value={draft.nurseryBatchId} onChange={id => onChange("nurseryBatchId", id)} message={errors.nurseryBatchId} />
        <p className="mt-1 text-xs text-text-muted">Loại hàu đổi theo đợt ươm.</p><DerivedProductNote batch={picked} /></div>}
    <div className="sm:col-span-2"><Note label="Ghi chú" maxLength={1000} value={draft.note} onChange={event => onChange("note", event.target.value)} /></div>
  </div>;
}
