"use client";
import { useState } from "react";
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
import { OverPlanConfirm, isOverPlanQuestion } from "./over-plan-confirm";
import { useOperationEditor } from "@/features/operations/use-operation-editor";
import flowStyles from "./cultivation-flow.module.css";
import * as c from "./records-contracts";
import { EditorFrame, LaneChoices, harvestRepo } from "./records-shared";

/**
 * Records one harvest trip: lanes, cage count, optional kg estimate and photos. An over-plan answer (409) is asked inside the form
 * (reason + Bỏ qua/Xác nhận); warnings of the saved lot come back as non-blocking notices.
 */
export function HarvestForm({ zoneId, raftId, data, onClose, onSaved }: { zoneId: string; raftId: string; data: z.infer<typeof c.harvestList>; onClose(): void; onSaved(): void }) {
  const [lanes, setLanes] = useState<number[]>([]), [finished, setFinished] = useState<number[]>([]);
  const [cages, setCages] = useState(""), [kg, setKg] = useState(""), [reason, setReason] = useState("");
  const [error, setError] = useState<string>(), [photos, setPhotos] = useState<File[]>([]);
  const [crew, setCrew] = useState<string[]>([]);
  const { notify } = useToast();
  const editor = useOperationEditor(onClose, !!lanes.length || !!cages || !!kg || !!photos.length || !!crew.length);
  const failure = editor.mutation.failure, question = isOverPlanQuestion(failure) ? failure.problem : undefined;
  // With the finish-lane endpoint (canFinish is reported) the lane is finished by its own action; an older backend still takes it with the trip.
  const finishesWithTrip = !data.lanes.some(lane => lane.canFinish !== undefined && lane.canFinish !== null);
  const estimate = harvestEstimate(Number(cages), kg, data.averageKgPerCage);
  // Any edit makes the over-plan question stale: it is asked again by the next save.
  const edited = <T,>(set: (value: T) => void) => (value: T) => { if (question) editor.mutation.reviewed(); set(value); };

  const values = (confirmed: boolean) => c.harvestValues.safeParse({ laneNumbers: lanes, finishedLaneNumbers: finishesWithTrip ? finished : [], cageCount: Number(cages), estimatedKg: kg ? Number(kg) : null,
    ...(crew.length ? { crew } : {}),
    ...(confirmed ? { confirmOverPlan: true, overPlanReason: reason } : {}) });
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
    const parsed = values(false), bad = invalid();
    if (!parsed.success) { setError("Chọn làn thu hoạch, số lồng lớn hơn 0 (được nhập 0,5; tối đa 2 số lẻ) và kg ước tính lớn hơn 0 nếu nhập."); return; }
    if (bad) { setError(bad); return; }
    setError(undefined);
    const saved = await editor.submit(`Ghi nhận ${cages} lồng từ làn ${lanes.join(", ")}${finishesWithTrip && finished.length ? `; đã thu hết làn ${finished.join(", ")}` : ""}?`, () => send(parsed.data));
    if (saved) done(saved);
  }
  async function confirmOverPlan() {
    const parsed = values(true);
    if (!parsed.success) { setError("Nhập lý do vượt kế hoạch (tối đa 1.000 ký tự)."); return; }
    setError(undefined);
    const saved = await editor.mutation.run(() => send(parsed.data));
    if (saved) done(saved);
  }
  return <EditorFrame title="Ghi nhận chuyến thu hoạch" editor={editor} error={error}>
    <HarvestPlanSummary data={data} extraKg={estimate.effective} />
    <form onSubmit={event => { event.preventDefault(); void save(); }}>
      <fieldset disabled={editor.disabled} className={flowStyles.harvestFormGrid}>
        <CollapsibleSection title="Làn thu hoạch" description="Các làn trong chuyến thu." columns={1}>
          <HarvestLaneChoices lanes={data.lanes} values={lanes} label="Làn thu hoạch *" onChange={edited(next => { setLanes(next); setFinished(current => current.filter(n => next.includes(n))); })} />
          {finishesWithTrip && <div>
            <h4 className="mb-1 text-sm font-semibold">Xác nhận làn đã thu xong</h4>
            <p className={flowStyles.harvestHint}>{lanes.length ? "Tích những làn không còn hàu để thu. Làn không tích vẫn ở trạng thái Đang thu hoạch sau khi lưu." : "Chọn làn thu hoạch ở trên để hiện các ô xác nhận đã thu xong."}</p>
            {lanes.length > 0 && <LaneChoices lanes={lanes} values={finished} onChange={setFinished} label="Làn đã thu hết hàu trong chuyến này" />}
          </div>}
        </CollapsibleSection>
        <CollapsibleSection title="Nhân viên cùng thu" description="Những nhân viên tham gia chuyến thu này." columns={1}><HarvestCrewPicker raftId={raftId} zoneId={zoneId} values={crew} onChange={edited(setCrew)} /></CollapsibleSection>
        <CollapsibleSection title="Số lượng và ảnh" description="Số lồng thu hoạch và ảnh ghi nhận." columns={1}>
          <UnitField key="harvest-cages" label="Số lồng thu hoạch *" unit="lồng" decimals={2} step={0.5} min={0.01} max={100000} required value={cages} onChange={edited(setCages)} />
          <UnitField key="harvest-estimated-kg" label="Kg ước tính (để trống: tính theo số lồng)" unit="kg ước tính" decimals={2} min={0.01} value={kg} onChange={edited(setKg)} />
          <HarvestEstimateHint cages={Number(cages)} typedKg={kg} kgPerCage={data.averageKgPerCage} />
          <RecordPhotoPicker label="Ảnh chuyến thu hoạch (tối đa 10 ảnh JPEG/PNG, 10 MB/ảnh)" files={photos} onChange={setPhotos} />
        </CollapsibleSection>
      </fieldset>
      {question && <OverPlanConfirm problem={question} reason={reason} onReason={setReason} pending={editor.mutation.pending} onConfirm={() => void confirmOverPlan()} onDismiss={() => editor.mutation.reviewed()} />}
      <div className={flowStyles.harvestFormFooter}>
        <Button key="discard-harvest" type="button" variant="secondary" disabled={editor.pending} onClick={() => void editor.close()}>Bỏ qua</Button>
        <Button key="save-harvest" type="submit" disabled={editor.disabled || !!question}>Lưu</Button>
      </div>
    </form>
  </EditorFrame>;
}
