"use client";
import { useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { useToast } from "@/components/ui/toast-provider";
import { CollapsibleSection } from "@/components/ui/management-screen/management-table";
import { Button } from "@/components/ui/button";
import { RecordPhotoPicker } from "./record-photo-picker";
import { UnitField } from "@/components/form/number-fields";
import { HarvestLaneChoices } from "./harvest-lane-choices";
import { HarvestEstimateHint, harvestEstimate } from "./harvest-estimate-hint";
import { HarvestPlanSummary } from "./harvest-plan-summary";
import { harvestWarningTexts } from "./harvest-warning-text";
import { HarvestCrewPicker } from "./harvest-crew-picker";
import { HarvestOrderPicker, defaultHarvestOrderId } from "./harvest-order-picker";
import { laneSummary } from "./harvest-lane-ranges";
import { useOperationEditor } from "@/features/operations/use-operation-editor";
import flowStyles from "./cultivation-flow.module.css";
import * as c from "./records-contracts";
import { EditorFrame, LaneChoices, harvestRepo } from "./records-shared";

/** The first field of the form the check refused, in the words of the screen, so the message never says only "thông tin chưa hợp lệ". */
export function harvestInvalidFieldText(error: z.ZodError): string {
  const field = error.issues[0]?.path[0];
  switch (field) {
    case "purchaseRequestId": return "Chọn yêu cầu mua mà chuyến thu hoạch này phục vụ.";
    case "laneNumbers": return "Làn thu hoạch: chọn ít nhất một làn thu được.";
    case "finishedLaneNumbers": return "Làn đã thu xong phải nằm trong các làn của chuyến này.";
    case "cageCount": return "Số lồng thu hoạch phải lớn hơn 0, tối đa 100.000 và có tối đa 2 số lẻ (được nhập 0,5).";
    case "estimatedKg": return "Kg ước tính phải lớn hơn 0 và có tối đa 2 số lẻ nếu nhập; để trống để tính theo số lồng.";
    case "crew": return "Danh sách nhân viên cùng thu chưa hợp lệ.";
    default: return "Thông tin chuyến thu hoạch chưa hợp lệ. Hãy kiểm tra lại các trường đã nhập.";
  }
}

/**
 * Records one harvest trip: the purchase request it harvests for, lanes, cage count, optional kg estimate, crew and photos. The cycle target is only a plan
 * (owner decision 12/11/2026): a trip above it saves like any other; warnings of the saved lot come back as non-blocking notices.
 */
export function HarvestForm({ zoneId, raftId, data, canConfigure = false, onClose, onSaved }: { zoneId: string; raftId: string; data: z.infer<typeof c.harvestList>; canConfigure?: boolean; onClose(): void; onSaved(): void }) {
  const [lanes, setLanes] = useState<number[]>([]), [finished, setFinished] = useState<number[]>([]);
  const [cages, setCages] = useState(""), [kg, setKg] = useState("");
  const [orderId, setOrderId] = useState(() => defaultHarvestOrderId(data.orders));
  const [error, setError] = useState<string>(), [photos, setPhotos] = useState<File[]>([]);
  const [crew, setCrew] = useState<string[]>([]);
  const { notify } = useToast();
  const editor = useOperationEditor(onClose, !!lanes.length || !!cages || !!kg || !!photos.length || !!crew.length);
  // With the finish-lane endpoint (canFinish is reported) the lane is finished by its own action; an older backend still takes it with the trip.
  const finishesWithTrip = !data.lanes.some(lane => lane.canFinish !== undefined && lane.canFinish !== null);
  const estimate = harvestEstimate(Number(cages), kg, data.averageKgPerCage);

  const values = () => c.harvestValues.safeParse({ purchaseRequestId: orderId, laneNumbers: lanes, finishedLaneNumbers: finishesWithTrip ? finished : [], cageCount: Number(cages), estimatedKg: kg ? Number(kg) : null,
    ...(crew.length ? { crew } : {}) });
  const send = (parsed: z.infer<typeof c.harvestValues>) => harvestRepo.upload("harvest-record", photos, parsed, c.harvestSaved, raftId, zoneId);
  function done(saved: z.infer<typeof c.harvestSaved>) {
    notify({ tone: "success", title: `Đã ghi nhận chuyến thu hoạch ${saved.lot.lotCode}.`, ...(saved.everySeededLaneHarvested ? { description: "Tất cả làn đã thu xong. Có thể kết thúc chu kỳ." } : {}) });
    for (const text of harvestWarningTexts(saved.warnings)) notify({ tone: "warning", title: text });
    onSaved();
  }
  function invalid() {
    if (photos.length > 10 || photos.some(file => !["image/jpeg", "image/png"].includes(file.type) || file.size < 1 || file.size > 10 * 1024 * 1024)) return "Chọn tối đa 10 ảnh JPEG hoặc PNG, mỗi ảnh tối đa 10 MB.";
    return undefined;
  }
  async function save() {
    const parsed = values(), bad = invalid();
    if (!parsed.success) { setError(harvestInvalidFieldText(parsed.error)); return; }
    if (bad) { setError(bad); return; }
    setError(undefined);
    const saved = await editor.submit(`Ghi nhận ${cages} lồng từ ${laneSummary(lanes).toLowerCase()}${finishesWithTrip && finished.length ? `; đã thu hết ${laneSummary(finished).toLowerCase()}` : ""}?`, () => send(parsed.data));
    if (saved) done(saved);
  }
  return <EditorFrame title="Ghi nhận chuyến thu hoạch" editor={editor} error={error}>
    <HarvestPlanSummary data={data} extraKg={estimate.effective} />
    <form onSubmit={event => { event.preventDefault(); void save(); }}>
      <fieldset disabled={editor.disabled} className={flowStyles.harvestFormGrid}>
        <CollapsibleSection title="Yêu cầu mua" description="Chuyến thu này phục vụ yêu cầu mua nào." columns={1}>
          <HarvestOrderPicker orders={data.orders} value={orderId} onChange={setOrderId} />
        </CollapsibleSection>
        <CollapsibleSection title="Làn thu hoạch" description="Các làn trong chuyến thu." columns={1}>
          <HarvestLaneChoices lanes={data.lanes} values={lanes} label="Làn thu hoạch *" onChange={next => { setLanes(next); setFinished(current => current.filter(n => next.includes(n))); }} />
          {finishesWithTrip && <div>
            <h4 className="mb-1 text-sm font-semibold">Xác nhận làn đã thu xong</h4>
            <p className={flowStyles.harvestHint}>{lanes.length ? "Tích những làn không còn hàu để thu. Làn không tích vẫn ở trạng thái Đang thu hoạch sau khi lưu." : "Chọn làn thu hoạch ở trên để hiện các ô xác nhận đã thu xong."}</p>
            {lanes.length > 0 && <LaneChoices lanes={lanes} values={finished} onChange={setFinished} label="Làn đã thu hết hàu trong chuyến này" />}
          </div>}
        </CollapsibleSection>
        <CollapsibleSection title="Nhân viên cùng thu" description="Những nhân viên tham gia chuyến thu này." columns={1}><HarvestCrewPicker raftId={raftId} zoneId={zoneId} values={crew} onChange={setCrew} /></CollapsibleSection>
        <CollapsibleSection title="Số lượng và ảnh" description="Số lồng thu hoạch và ảnh ghi nhận." columns={1}>
          <UnitField key="harvest-cages" label="Số lồng thu hoạch *" unit="lồng" decimals={2} step={0.5} min={0.01} max={100000} required value={cages} onChange={setCages} />
          <UnitField key="harvest-estimated-kg" label="Kg ước tính (để trống: tính theo số lồng)" unit="kg ước tính" decimals={2} min={0.01} value={kg} onChange={setKg} />
          <HarvestEstimateHint cages={Number(cages)} typedKg={kg} kgPerCage={data.averageKgPerCage} />
          <p className="text-xs text-text-muted">kg/lồng hiện tại: {data.averageKgPerCage.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}{" "}
            ({canConfigure ? <Link className="underline underline-offset-2 focus-visible:outline-2" href="/settings?section=harvest">Cài đặt → Thiết lập thu hoạch</Link> : "Cài đặt → Thiết lập thu hoạch"})</p>
          <RecordPhotoPicker label="Ảnh chuyến thu hoạch (tối đa 10 ảnh JPEG/PNG, 10 MB/ảnh)" files={photos} onChange={setPhotos} />
        </CollapsibleSection>
      </fieldset>
      <div className={flowStyles.harvestFormFooter}>
        <Button key="discard-harvest" type="button" variant="secondary" disabled={editor.pending} onClick={() => void editor.close()}>Bỏ qua</Button>
        <Button key="save-harvest" type="submit" disabled={editor.disabled || !data.orders.length}>Lưu</Button>
      </div>
    </form>
  </EditorFrame>;
}
