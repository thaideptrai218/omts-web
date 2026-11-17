"use client";
import { useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { useToast } from "@/components/ui/toast-provider";
import { CollapsibleSection } from "@/components/ui/management-screen/management-table";
import { Button } from "@/components/ui/button";
import { PhotoPicker } from "@/components/form/photo-picker";
import { photoValidationMessage } from "@/components/form/photo-compression";
import { farmingFieldError } from "./farming-problem";
import { RecordLanePercentFields } from "./record-lane-percent-fields";
import { selectedLanePercents, lanePercentsProblem } from "./record-lane-percents";
import { harvestRemainingByLane, shownHarvestPercents } from "./harvest-lane-remaining-percent";
import { overRemainingPercentProblem } from "./seeding-lane-remaining-percent";
import { HarvestLaneChoices } from "./harvest-lane-choices";
import { HarvestEstimateHint, harvestEstimate } from "./harvest-estimate-hint";
import { HarvestPlanSummary } from "./harvest-plan-summary";
import { harvestWarningTexts } from "./harvest-warning-text";
import { RecordCrewPicker } from "./record-crew-picker";
import { crewAssignmentNotice } from "./record-crew-assignment-notice";
import { HarvestCycleProductBanner } from "./harvest-cycle-product-banner";
import { laneSummary } from "./harvest-lane-ranges";
import { useOperationEditor } from "@/features/operations/use-operation-editor";
import type { HarvestPlanTarget } from "@/features/harvest-plans/plan-logic";
import { HarvestProductLines, blankLine, linesPayload, linesProblem, linesTotals, useHarvestProducts, type HarvestLine } from "./harvest-product-lines";
import flowStyles from "./cultivation-flow.module.css";
import * as c from "./records-contracts";
import { EditorFrame, LaneChoices, harvestRepo } from "./records-shared";

/** The first field of the form the check refused, in the words of the screen, so the message never says only "thông tin chưa hợp lệ". */
export function harvestInvalidFieldText(error: z.ZodError): string {
  const field = error.issues[0]?.path[0];
  switch (field) {
    case "productLines": return "Sản phẩm thu hoạch: chọn sản phẩm và nhập số lồng lớn hơn 0, tối đa 2 số lẻ (được nhập 0,5).";
    case "laneNumbers": return "Làn thu hoạch: chọn ít nhất một làn thu được.";
    case "finishedLaneNumbers": return "Làn đã thu xong phải nằm trong các làn của chuyến này.";
    case "cageCount": return "Số lồng thu hoạch phải lớn hơn 0, tối đa 100.000 và có tối đa 2 số lẻ (được nhập 0,5).";
    case "estimatedKg": return "Kg ước tính phải lớn hơn 0 và có tối đa 2 số lẻ nếu nhập; để trống để tính theo số lồng.";
    case "crew": return "Danh sách nhân viên cùng thu chưa hợp lệ.";
    default: return "Thông tin chuyến thu hoạch chưa hợp lệ. Hãy kiểm tra lại các trường đã nhập.";
  }
}

/**
 * Records one harvest trip: lanes, the product lines (product, cages, kg), crew and photos; from the raft's harvest screen it may also name the purchase request it
 * harvests for. With `plan` (a line of a harvest plan) the trip is recorded from that line: the raft and the lanes still to harvest are fixed by the plan, the product
 * line starts from what the line expects, and the line id goes with the lot so the API ties it to the plan. The cycle target is only a plan (owner decision
 * 12/11/2026): a trip above it saves like any other; warnings of the saved lot come back as non-blocking notices.
 */
export function HarvestForm({ zoneId, raftId, data, plan, canConfigure = false, onClose, onSaved }: {
  zoneId: string; raftId: string;
  /** The raft's harvest screen data; a harvest from a plan line needs none, the plan fixes the lanes. */
  data?: z.infer<typeof c.harvestList>;
  plan?: Pick<HarvestPlanTarget, "lineId" | "planCode" | "laneNumbers" | "expectedProductId" | "expectedCageCount">;
  canConfigure?: boolean; onClose(): void; onSaved(): void;
}) {
  const [lanes, setLanes] = useState<number[]>(() => plan?.laneNumbers ?? []), [finished, setFinished] = useState<number[]>([]);
  // The lot must carry the product the cycle farms: the first line starts from it (or from what the plan line expects).
  const cycleProductId = data?.cycleProductId ?? data?.cycle?.productId ?? undefined, cycleProductName = data?.cycleProductName ?? data?.cycle?.productName ?? undefined;
  const [lines, setLines] = useState<HarvestLine[]>(() => [plan?.expectedProductId ? { ...blankLine(), productId: plan.expectedProductId, cages: plan.expectedCageCount ? String(plan.expectedCageCount) : "" } : cycleProductId ? { ...blankLine(), productId: cycleProductId } : blankLine()]);
  const [started] = useState(() => JSON.stringify(lines.map(line => [line.productId, line.cages])));
  // The cycle's own product stays offered even when it is no longer sold: the lot carries it.
  const products = useHarvestProducts(cycleProductId ? [{ productId: cycleProductId, productCode: "", productName: cycleProductName ?? "" }] : []);
  const [error, setError] = useState<string>(), [photos, setPhotos] = useState<File[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false), [photoError, setPhotoError] = useState<string>();
  const [percents, setPercents] = useState<Record<string, string>>({}), [percentError, setPercentError] = useState<string>();
  const [crew, setCrew] = useState<string[]>([]);
  const [laneDirty, setLaneDirty] = useState(false), [lanePending, setLanePending] = useState(false);
  const { notify } = useToast();
  const linesChanged = JSON.stringify(lines.map(line => [line.productId, line.cages])) !== started;
  const editor = useOperationEditor(onClose, plan ? !!finished.length || !!photos.length || !!crew.length || linesChanged : !!lanes.length || lines.some(line => line.productId || line.cages) || !!photos.length || !!crew.length || Object.keys(percents).length > 0 || laneDirty, lanePending || photoBusy);
  // With the finish-lane endpoint (canFinish is reported) the lane is finished by its own action; an older backend still takes it with the trip.
  const finishesWithTrip = !data || !data.lanes.some(lane => lane.canFinish !== undefined && lane.canFinish !== null);
  const totals = linesTotals(lines);
  const allKgTyped = lines.length > 0 && lines.every(line => line.kg.trim() !== "");
  const estimate = harvestEstimate(totals.cages, allKgTyped ? String(totals.kg) : "", data?.averageKgPerCage ?? 0);

  // Picking a lane fills "Phần trăm thu thêm" with what is left on it (100% for an untouched lane); the supervisor only edits the lanes not fully harvested.
  const remainingByLane = data ? harvestRemainingByLane(data.lanes) : {}, shownPercents = shownHarvestPercents(lanes, percents, remainingByLane);
  // With product lines the lot's cages are their sum and the kg are theirs, or the lot's kg per cage when a line leaves them empty.
  const values = () => c.harvestValues.safeParse({ ...(data ? { lanePercents: selectedLanePercents(lanes, shownPercents) } : {}), laneNumbers: lanes, finishedLaneNumbers: finishesWithTrip ? finished : [], cageCount: totals.cages, estimatedKg: null, productLines: linesPayload(lines),
    ...(plan ? { harvestPlanLineId: plan.lineId } : {}), ...(crew.length ? { crew } : {}) });
  const send = (parsed: z.infer<typeof c.harvestValues>) => harvestRepo.upload("harvest-record", photos, parsed, c.harvestSaved, raftId, zoneId);
  function done(saved: z.infer<typeof c.harvestSaved>) {
    notify({ tone: "success", title: `Đã ghi nhận chuyến thu hoạch ${saved.lot.lotCode}.`, ...(saved.everySeededLaneHarvested ? { description: "Tất cả làn đã thu xong. Có thể kết thúc chu kỳ." } : {}) });
    const crewNotice = crewAssignmentNotice(saved.crewAssignment);
    if (crewNotice) notify({ tone: saved.crewAssignment?.skipped.length ? "warning" : "info", title: crewNotice });
    for (const text of harvestWarningTexts(saved.warnings)) notify({ tone: "warning", title: text });
    onSaved();
  }
  async function save() {
    if (lanePending || laneDirty) { setError("Lưu hoặc bỏ thay đổi của làn trước khi lưu chuyến thu hoạch."); return; }
    const linesBad = linesProblem(lines, true);
    if (linesBad) { setError(linesBad); return; }
    const parsed = values(), bad = photoValidationMessage(photos.length);
    const percentBad = data ? lanePercentsProblem(lanes, shownPercents) ?? overRemainingPercentProblem(lanes, shownPercents, remainingByLane, "thu") : undefined;
    setPhotoError(bad); setPercentError(percentBad);
    if (bad || percentBad || photoBusy) return;
    if (!parsed.success) { setError(harvestInvalidFieldText(parsed.error)); return; }
    setError(undefined);
    const saved = await editor.submit(`Ghi nhận ${totals.cages.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} lồng từ ${laneSummary(lanes).toLowerCase()}${finishesWithTrip && finished.length ? `; đã thu hết ${laneSummary(finished).toLowerCase()}` : ""}?`, () => send(parsed.data));
    if (saved) done(saved);
  }
  return <EditorFrame size="xl" title={plan ? `Thu hoạch theo kế hoạch ${plan.planCode}` : "Ghi nhận chuyến thu hoạch"} editor={editor} error={error}>
    {data?.cycle && <HarvestCycleProductBanner cycle={data.cycle} />}
    {data && <HarvestPlanSummary data={data} extraKg={estimate.effective} />}
    <form onSubmit={event => { event.preventDefault(); void save(); }}>
      <fieldset disabled={editor.disabled || laneDirty} className={flowStyles.harvestFormGrid}>
        <CollapsibleSection title="Làn thu hoạch" description={plan ? `Các làn còn lại của kế hoạch ${plan.planCode} (cố định).` : "Các làn trong chuyến thu."} columns={1}>
          {data && !plan
            ? <HarvestLaneChoices lanes={data.lanes} values={lanes} label="Làn thu hoạch *" onChange={next => { setLanes(next); setFinished(current => current.filter(n => next.includes(n))); }}
              onDirty={setLaneDirty} onPending={setLanePending} scope={{ raftId, zoneId, cycleId: data.cycle?.id, cycleRowVersion: data.cycle?.rowVersion, readOnly: editor.mutation.pending || !data.canRecordHarvest, onChanged: () => {} }} />
            : <LaneChoices lanes={plan?.laneNumbers ?? []} values={lanes} disabled onChange={setLanes} label={`Làn thu hoạch theo kế hoạch ${plan?.planCode ?? ""} (cố định)`} />}
          {data && !plan && <RecordLanePercentFields lanes={lanes} values={shownPercents} onChange={value => { setPercents(value); setPercentError(undefined); }} kind="harvest" remaining={remainingByLane} error={percentError || farmingFieldError(editor.mutation.failure?.problem, "LanePercent")} />}
          {finishesWithTrip && <div>
            <h4 className="mb-1 text-sm font-semibold">Xác nhận làn đã thu xong</h4>
            <p className={flowStyles.harvestHint}>{lanes.length ? "Tích những làn không còn hàu để thu. Làn không tích vẫn ở trạng thái Đang thu hoạch sau khi lưu." : "Chọn làn thu hoạch ở trên để hiện các ô xác nhận đã thu xong."}</p>
            {lanes.length > 0 && <LaneChoices lanes={lanes} values={finished} onChange={setFinished} label="Làn đã thu hết hàu trong chuyến này" />}
          </div>}
        </CollapsibleSection>
        <CollapsibleSection title="Nhân viên cùng thu" description="Những nhân viên tham gia chuyến thu này." columns={1}><RecordCrewPicker label="Nhân viên cùng thu" raftId={raftId} zoneId={zoneId} values={crew} onChange={setCrew} /></CollapsibleSection>
        <CollapsibleSection title="Sản phẩm thu hoạch và ảnh" description="Sản phẩm của chu kỳ: số lồng, số kg và ảnh ghi nhận." columns={1}>
          <HarvestProductLines lines={lines} products={products.products} loading={products.loading} error={products.error} disabled={editor.disabled} onChange={setLines} />
          <p className={flowStyles.harvestHint}>Mỗi lô thu hoạch chỉ có một sản phẩm: loại hàu của giống đang nuôi trong chu kỳ{cycleProductName ? ` (${cycleProductName})` : ""}.</p>
          <p className={flowStyles.harvestHint}>Số kg tự tính theo quy đổi Lồng của sản phẩm và sửa được; để trống thì hệ thống quy đổi theo kg/lồng của lô. Thời điểm thu hoạch được hệ thống ghi khi lưu.</p>
          {data && <HarvestEstimateHint cages={totals.cages} typedKg={allKgTyped ? String(totals.kg) : ""} kgPerCage={data.averageKgPerCage} />}
          {data && <p className="text-xs text-text-muted">kg/lồng hiện tại: {data.averageKgPerCage.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}{" "}
            ({canConfigure ? <Link className="underline underline-offset-2 focus-visible:outline-2" href="/settings?section=harvest">Cài đặt → Thiết lập thu hoạch</Link> : "Cài đặt → Thiết lập thu hoạch"})</p>}
          <PhotoPicker label="Ảnh chuyến thu hoạch" files={photos} onChange={value => { setPhotos(value); setPhotoError(undefined); }} onBusyChange={setPhotoBusy} error={photoError || farmingFieldError(editor.mutation.failure?.problem, "Photos")} />
        </CollapsibleSection>
      </fieldset>
      <div className={flowStyles.harvestFormFooter}>
        <Button key="discard-harvest" type="button" variant="secondary" disabled={editor.pending} onClick={() => void editor.close()}>Bỏ qua</Button>
        <Button key="save-harvest" type="submit" disabled={editor.disabled || laneDirty}>Lưu</Button>
      </div>
    </form>
  </EditorFrame>;
}
