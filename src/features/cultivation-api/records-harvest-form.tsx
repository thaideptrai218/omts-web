"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { useToast } from "@/components/ui/toast-provider";
import { CollapsibleSection } from "@/components/ui/management-screen/management-table";
import { Button } from "@/components/ui/button";
import { UnitInput } from "@/components/form/unit-input";
import { PhotoPicker } from "@/components/form/photo-picker";
import { photoValidationMessage } from "@/components/form/photo-compression";
import { SelectBox } from "@/components/ui/select-box";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { lotWeighHref } from "@/features/harvest-lots/lot-labels";
import { operationAllowed } from "@/features/operations/permissions";
import { useOperationEditor } from "@/features/operations/use-operation-editor";
import { fmt } from "@/features/purchase-documents/document-parts";
import type { HarvestPlanTarget } from "@/features/harvest-plans/plan-logic";
import { earlyHarvestQuestion } from "@/features/harvest-plans/plan-maturity";
import { farmingFieldError } from "./farming-problem";
import { harvestWarningTexts } from "./harvest-warning-text";
import { RecordCrewPicker } from "./record-crew-picker";
import { crewAssignmentNotice } from "./record-crew-assignment-notice";
import { useHarvestProducts } from "./harvest-product-lines";
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

/**
 * "Thu hoạch" of a plan line, a same-day action (the only way a harvest is recorded, owner decision 18/11/2026): the raft is the plan line's and the whole raft is harvested, so the one number to give is
 * "Số lồng thu được" (the plan's expected cages to start from). No kg is typed here: the kg are weighed cage by cage at the port. After the save the form shows the next step, weighing the lot cage by cage.
 * Warnings of the saved lot come back as notices.
 */
export function HarvestForm({ zoneId, raftId, plan, onClose, onSaved }: {
  zoneId: string; raftId: string; plan: Pick<HarvestPlanTarget, "lineId" | "planCode" | "raftCode" | "expectedProductId" | "expectedCageCount"> & Partial<Pick<HarvestPlanTarget, "expectedHarvestDate" | "orders">>; onClose(): void; onSaved(): void;
}) {
  const [productId, setProductId] = useState(plan.expectedProductId ?? ""), [cages, setCages] = useState<number | null>(plan.expectedCageCount ?? null);
  const [started] = useState(cages);
  const products = useHarvestProducts();
  const [error, setError] = useState<string>(), [photos, setPhotos] = useState<File[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false), [photoError, setPhotoError] = useState<string>();
  const [crew, setCrew] = useState<string[]>([]), [savedLot, setSavedLot] = useState<{ code: string }>();
  const { notify } = useToast(), router = useRouter(), { identity, permissions } = useApiWorkspace();
  // After the save, closing the window (any way) tells the screen behind it to reload.
  const editor = useOperationEditor(() => (savedLot ? onSaved() : onClose()), !savedLot && (cages !== started || !!photos.length || !!crew.length), photoBusy);
  const product = products.products.find(row => row.id === productId);
  const mayInvoice = operationAllowed("sales-invoices", identity, permissions.functionPermissions, "Create", zoneId);
  const orders = plan.orders ?? [];

  function done(saved: z.infer<typeof c.harvestSaved>) {
    notify({ tone: "success", title: `Đã ghi nhận thu hoạch ${saved.lot.lotCode}.`, description: saved.everySeededLaneHarvested ? "Tất cả làn đã thu xong. Có thể kết thúc chu kỳ." : "Thu xong cả bè thì bấm Hoàn tất thu hoạch bè ở tab Thu hoạch." });
    const crewNotice = crewAssignmentNotice(saved.crewAssignment);
    if (crewNotice) notify({ tone: saved.crewAssignment?.skipped.length ? "warning" : "info", title: crewNotice });
    for (const text of harvestWarningTexts(saved.warnings)) notify({ tone: "warning", title: text });
    setSavedLot({ code: saved.lot.lotCode });
  }
  async function save() {
    const bad = photoValidationMessage(photos.length, false);
    setPhotoError(bad);
    if (!productId) { setError("Chọn sản phẩm thu hoạch."); return; }
    if (bad || photoBusy) return;
    const parsed = c.planHarvestValues.safeParse({ laneNumbers: [], finishedLaneNumbers: [], cageCount: cages, estimatedKg: null, productLines: [{ productId, cageCount: cages, kg: null }],
      harvestPlanLineId: plan.lineId, ...(crew.length ? { crew } : {}) });
    if (!parsed.success) { setError(harvestInvalidFieldText(parsed.error)); return; }
    setError(undefined);
    // Too early for the oysters: only a question to confirm, the harvest is never refused for it.
    const early = earlyHarvestQuestion(plan.expectedHarvestDate);
    const saved = await editor.submit(`${early ? `${early} ` : ""}Ghi nhận ${fmt(cages)} lồng từ bè ${plan.raftCode}?`, () => harvestRepo.upload("harvest-record", photos, parsed.data, c.harvestSaved, raftId, zoneId));
    if (saved) done(saved);
  }

  if (savedLot) return <EditorFrame size="xl" title={`Đã thu hoạch bè ${plan.raftCode}`} editor={editor}>
    <div className="space-y-4">
      <p role="status" className="text-sm">Lô <strong>{savedLot.code}</strong> đang chờ cân. Bước tiếp theo là cân từng lồng tại cảng.</p>
      {mayInvoice && orders.length > 0 && <p className="text-sm text-text-muted">Cân xong, mở lô này và bấm Lập hóa đơn giao khách.</p>}
      <div className={flowStyles.harvestFormFooter}>
        <Button key="close-harvest" type="button" variant="secondary" onClick={() => void editor.close()}>Để sau</Button>
        <Button key="weigh-harvest" type="button" onClick={() => router.push(lotWeighHref(savedLot.code))}>Cân từng lồng ngay</Button>
      </div>
    </div>
  </EditorFrame>;
  return <EditorFrame size="xl" title={`Thu hoạch bè ${plan.raftCode}`} editor={editor} error={error}>
    <form onSubmit={event => { event.preventDefault(); void save(); }}>
      <fieldset disabled={editor.disabled} className="grid gap-4">
        <dl className="grid gap-x-6 gap-y-2 rounded-control border border-border bg-surface-subtle p-3 text-sm sm:grid-cols-2" aria-label="Kế hoạch thu hoạch">
          <div><dt className="text-xs text-text-muted">Kế hoạch</dt><dd>{plan.planCode}</dd></div>
          <div><dt className="text-xs text-text-muted">Sản phẩm</dt><dd>{plan.expectedProductId ? product ? product.name : products.loading ? "Đang tải…" : "Sản phẩm của kế hoạch" : <SelectBox aria-label="Sản phẩm thu hoạch" className="omts-control" disabled={products.loading} value={productId} onChange={event => setProductId(event.target.value)}>
            <option value="">{products.loading ? "Đang tải…" : "Chọn sản phẩm"}</option>{products.products.map(row => <option key={row.id} value={row.id}>{row.name} ({row.code})</option>)}
          </SelectBox>}</dd></div>
          {orders.length > 0 && <div className="sm:col-span-2"><dt className="text-xs text-text-muted">Đơn và khách</dt><dd>{orders.map(order => <span key={order.code} className="block">{order.code}{order.customer?.name ? ` · ${order.customer.name}` : ""}</span>)}</dd></div>}
        </dl>
        <div className="grid gap-2">
          <UnitInput label="Số lồng thu được" unit="lồng" decimals={2} step={0.5} min={0.01} max={100000} value={cages} onChange={setCages} />
          <p className={flowStyles.harvestHint}>{plan.expectedCageCount != null ? `Kế hoạch dự kiến ${fmt(plan.expectedCageCount)} lồng. ` : ""}Thu cả bè. Số kg sẽ cân từng lồng tại cảng.</p>
        </div>
        <CollapsibleSection title="Nhân viên cùng thu" description="Những người đi thu chuyến này." columns={1}><RecordCrewPicker label="Nhân viên cùng thu" raftId={raftId} zoneId={zoneId} values={crew} onChange={setCrew} /></CollapsibleSection>
        <CollapsibleSection title="Ảnh thu hoạch (không bắt buộc, tối đa 3)" defaultOpen={false} columns={1}>
          <PhotoPicker required={false} label="Ảnh chuyến thu hoạch" files={photos} onChange={value => { setPhotos(value); setPhotoError(undefined); }} onBusyChange={setPhotoBusy} error={photoError || farmingFieldError(editor.mutation.failure?.problem, "Photos")} />
        </CollapsibleSection>
      </fieldset>
      <div className={flowStyles.harvestFormFooter}>
        <Button key="discard-harvest" type="button" variant="secondary" disabled={editor.pending} onClick={() => void editor.close()}>Bỏ qua</Button>
        <Button key="save-harvest" type="submit" disabled={editor.disabled}>Lưu</Button>
      </div>
    </form>
  </EditorFrame>;
}
