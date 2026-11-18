"use client";
import { useState } from "react";
import { z } from "zod";
import { useToast } from "@/components/ui/toast-provider";
import { CollapsibleSection } from "@/components/ui/management-screen/management-table";
import { Button } from "@/components/ui/button";
import { UnitInput } from "@/components/form/unit-input";
import { PhotoPicker } from "@/components/form/photo-picker";
import { photoValidationMessage } from "@/components/form/photo-compression";
import { SelectBox } from "@/components/ui/select-box";
import { cageUnitOf } from "@/features/products/product-helpers";
import { useOperationEditor } from "@/features/operations/use-operation-editor";
import { fmt } from "@/features/purchase-documents/document-parts";
import type { HarvestPlanTarget } from "@/features/harvest-plans/plan-logic";
import { farmingFieldError } from "./farming-problem";
import { harvestWarningTexts } from "./harvest-warning-text";
import { RecordCrewPicker } from "./record-crew-picker";
import { crewAssignmentNotice } from "./record-crew-assignment-notice";
import { useHarvestProducts } from "./harvest-product-lines";
import { harvestPlanWeights } from "./harvest-plan-weights";
import flowStyles from "./cultivation-flow.module.css";
import * as c from "./records-contracts";
import { EditorFrame, harvestRepo } from "./records-shared";

/** The first field of the form the check refused, in the words of the screen, so the message never says only "thông tin chưa hợp lệ". */
export function harvestInvalidFieldText(error: z.ZodError): string {
  const field = error.issues[0]?.path[0];
  switch (field) {
    case "productLines": return "Sản phẩm thu hoạch: chọn sản phẩm và nhập số lồng lớn hơn 0, tối đa 2 số lẻ (được nhập 0,5).";
    case "cageCount": return "Số lồng thu được phải lớn hơn 0, tối đa 100.000 và có tối đa 2 số lẻ (được nhập 0,5).";
    case "crew": return "Danh sách nhân viên cùng thu chưa hợp lệ.";
    default: return "Thông tin chuyến thu hoạch chưa hợp lệ. Hãy kiểm tra lại các trường đã nhập.";
  }
}

const cageValue = c.harvestLineValues.shape.cageCount;
/** Body of a harvest from a plan line: no lane (the API takes every harvestable lane of the raft), no kg (cages only; the kg come from the port weighing). */
const planHarvestValues = z.strictObject({
  laneNumbers: z.array(z.number()).max(0), finishedLaneNumbers: z.array(z.number()).max(0), cageCount: cageValue, estimatedKg: z.null(),
  productLines: z.array(z.strictObject({ productId: z.guid(), cageCount: cageValue, kg: z.null() })).length(1),
  harvestPlanLineId: z.guid(), crew: z.array(z.guid()).optional(),
});

/**
 * Records the harvest of one raft FROM a line of a harvest plan (the only way a harvest is recorded, owner decision 18/11/2026): the raft is the plan line's, the whole raft is harvested (no lane to pick) and the one number
 * to give is "Số lồng thu được"; the kg and tấn beside it are a read-only conversion (the real kg come from the port weighing). Crew and photos as in the old form. Warnings of the saved lot come back as notices.
 */
export function HarvestForm({ zoneId, raftId, plan, onClose, onSaved }: {
  zoneId: string; raftId: string; plan: Pick<HarvestPlanTarget, "lineId" | "planCode" | "raftCode" | "expectedProductId" | "expectedCageCount">; onClose(): void; onSaved(): void;
}) {
  const [productId, setProductId] = useState(plan.expectedProductId ?? ""), [cages, setCages] = useState<number | null>(plan.expectedCageCount ?? null);
  const [started] = useState(cages);
  const products = useHarvestProducts();
  const [error, setError] = useState<string>(), [photos, setPhotos] = useState<File[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false), [photoError, setPhotoError] = useState<string>();
  const [crew, setCrew] = useState<string[]>([]);
  const { notify } = useToast();
  const editor = useOperationEditor(onClose, cages !== started || !!photos.length || !!crew.length, photoBusy);
  const product = products.products.find(row => row.id === productId);
  const weights = harvestPlanWeights(cages, cageUnitOf(product?.units ?? [])?.factor);

  function done(saved: z.infer<typeof c.harvestSaved>) {
    notify({ tone: "success", title: `Đã ghi nhận thu hoạch ${saved.lot.lotCode}. Lô chờ cân tại cảng.`, ...(saved.everySeededLaneHarvested ? { description: "Tất cả làn đã thu xong. Có thể kết thúc chu kỳ." } : {}) });
    const crewNotice = crewAssignmentNotice(saved.crewAssignment);
    if (crewNotice) notify({ tone: saved.crewAssignment?.skipped.length ? "warning" : "info", title: crewNotice });
    for (const text of harvestWarningTexts(saved.warnings)) notify({ tone: "warning", title: text });
    onSaved();
  }
  async function save() {
    const bad = photoValidationMessage(photos.length);
    setPhotoError(bad);
    if (!productId) { setError("Chọn sản phẩm thu hoạch."); return; }
    if (bad || photoBusy) return;
    const parsed = planHarvestValues.safeParse({ laneNumbers: [], finishedLaneNumbers: [], cageCount: cages, estimatedKg: null, productLines: [{ productId, cageCount: cages, kg: null }],
      harvestPlanLineId: plan.lineId, ...(crew.length ? { crew } : {}) });
    if (!parsed.success) { setError(harvestInvalidFieldText(parsed.error)); return; }
    setError(undefined);
    const saved = await editor.submit(`Ghi nhận ${fmt(cages)} lồng từ bè ${plan.raftCode}?`, () => harvestRepo.upload("harvest-record", photos, parsed.data, c.harvestSaved, raftId, zoneId));
    if (saved) done(saved);
  }
  return <EditorFrame size="xl" title={`Thu hoạch theo kế hoạch ${plan.planCode}`} editor={editor} error={error}>
    <form onSubmit={event => { event.preventDefault(); void save(); }}>
      <fieldset disabled={editor.disabled} className={flowStyles.harvestFormGrid}>
        <CollapsibleSection title="Sản lượng thu được" description={`Bè ${plan.raftCode}: thu cả bè theo kế hoạch ${plan.planCode}, không chọn làn.`} columns={1}>
          {plan.expectedProductId
            ? <p className="text-sm">Sản phẩm: <strong>{product ? product.name : products.loading ? "Đang tải…" : "Sản phẩm của kế hoạch"}</strong></p>
            : <SelectBox aria-label="Sản phẩm thu hoạch" className="omts-control" disabled={products.loading} value={productId} onChange={event => setProductId(event.target.value)}>
              <option value="">{products.loading ? "Đang tải…" : "Chọn sản phẩm"}</option>{products.products.map(row => <option key={row.id} value={row.id}>{row.name} ({row.code})</option>)}
            </SelectBox>}
          {plan.expectedCageCount != null && <p className={flowStyles.harvestHint}>Kế hoạch dự kiến {fmt(plan.expectedCageCount)} lồng.</p>}
          <UnitInput label="Số lồng thu được" unit="lồng" decimals={2} step={0.5} min={0.01} max={100000} value={cages} onChange={setCages} />
          <dl className="grid grid-cols-2 gap-3 text-sm" aria-label="Quy đổi tạm tính">
            <div><dt className="text-xs text-text-muted">Quy đổi kg (tạm tính)</dt><dd className="tabular-nums">{weights ? `${fmt(weights.kg)} kg` : "—"}</dd></div>
            <div><dt className="text-xs text-text-muted">Quy đổi tấn (tạm tính)</dt><dd className="tabular-nums">{weights ? `${fmt(weights.tons)} tấn` : "—"}</dd></div>
          </dl>
          <p className={flowStyles.harvestHint}>Chỉ để tham khảo ({weights ? `1 lồng = ${fmt(weights.kgPerCage)} kg` : "theo quy đổi Lồng"}). Số kg thật là số cân tại cảng, nhập khi cân lô.</p>
        </CollapsibleSection>
        <CollapsibleSection title="Nhân viên cùng thu" description="Những nhân viên tham gia chuyến thu này." columns={1}><RecordCrewPicker label="Nhân viên cùng thu" raftId={raftId} zoneId={zoneId} values={crew} onChange={setCrew} /></CollapsibleSection>
        <CollapsibleSection title="Ảnh thu hoạch" description="Ảnh ghi nhận tại hiện trường." columns={1}>
          <PhotoPicker label="Ảnh chuyến thu hoạch" files={photos} onChange={value => { setPhotos(value); setPhotoError(undefined); }} onBusyChange={setPhotoBusy} error={photoError || farmingFieldError(editor.mutation.failure?.problem, "Photos")} />
        </CollapsibleSection>
      </fieldset>
      <div className={flowStyles.harvestFormFooter}>
        <Button key="discard-harvest" type="button" variant="secondary" disabled={editor.pending} onClick={() => void editor.close()}>Bỏ qua</Button>
        <Button key="save-harvest" type="submit" disabled={editor.disabled}>Lưu</Button>
      </div>
    </form>
  </EditorFrame>;
}
