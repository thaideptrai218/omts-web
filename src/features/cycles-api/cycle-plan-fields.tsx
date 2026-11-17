"use client";
import { useCallback } from "react";
import { UnitField } from "@/components/form/number-fields";
import { Field, Note, businessToday, useRemote } from "@/features/operations/ui";
import styles from "@/features/farming-management/farming-management.module.css";
import { DerivedProductNote } from "./cycle-derived-product";
import { farmedSeedText } from "./cycle-farmed-seed";
import { NurseryBatchSelect } from "./cycle-start-fields";
import type { CycleView, PlanDraft, PlanField } from "./cycle-model";
import { cycleNurseryText, readAvailableNurseryBatches, withCurrentBatch } from "./nursery-batch-options";

const fieldError = (text?: string) => text ? <p role="alert" className={styles.fieldError}>{text}</p> : null;

/**
 * Edit fields of "Kế hoạch": start date, planned yield and note always; the nursed batch only while no lane was seeded (`batchLocked`), otherwise it is
 * read only with the reason. The seed is never edited on its own: it follows the nursed batch (and so does the sold loại hàu, derived by the backend).
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
        <div><Field label="Giống" readOnly value={farmedSeedText({ ...cycle, nurseryCode: null })} /><p className="mt-1 text-xs text-text-muted">Giống của đợt ươm, nên cũng không đổi được</p></div></>
      : <div className="sm:col-span-2"><NurseryBatchSelect batches={options} loading={batches.loading} error={batches.error} onReload={batches.reload} value={draft.nurseryBatchId} onChange={id => onChange("nurseryBatchId", id)} message={errors.nurseryBatchId} />
        <p className="mt-1 text-xs text-text-muted">Giống đổi theo đợt ươm.</p><DerivedProductNote batch={picked} /></div>}
    <div className="sm:col-span-2"><Note label="Ghi chú" maxLength={1000} value={draft.note} onChange={event => onChange("note", event.target.value)} /></div>
  </div>;
}
