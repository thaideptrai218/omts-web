"use client";
import { PhotoPicker } from "@/components/form/photo-picker";
import { photoValidationMessage } from "@/components/form/photo-compression";
import { RecordLanePercentFields } from "./record-lane-percent-fields";
import { selectedLanePercents, lanePercentsProblem } from "./record-lane-percents";
import { farmingFieldError } from "./farming-problem";
import { useMemo, useState } from "react";
import { z } from "zod";
import { useToast } from "@/components/ui/toast-provider";
import { Button } from "@/components/ui/button";
import { UnitField } from "@/components/form/number-fields";
import { farmingStepLink } from "@/features/farming-management/entity-links";
import { SeedingLanePicker } from "./seeding-lane-picker";
import { SeedingNurseryQuantitySummary } from "./seeding-nursery-quantity-summary";
import { backdateProblem, backdateWindow } from "@/shared/format/backdate-window";
import { PlanBar } from "@/features/farming-management/plan-bar";
import { inputRepository } from "@/features/input-items/repository";
import { Field, Note, Select, businessToday, useRemote } from "@/features/operations/ui";
import { useOperationEditor } from "@/features/operations/use-operation-editor";
import { farmingErrorText } from "./farming-error-text";
import { OverPlanConfirm, isOverPlanQuestion } from "./over-plan-confirm";
import * as c from "./records-contracts";
import { EditorFrame, RecordFormFooter, seedRepo } from "./records-shared";
import { useSeedingPlan } from "./use-seeding-plan";
import { laneIsUnavailable } from "./lane-availability";
import { seedingLaneChoices } from "./seeding-lane-choices";
import { nurseryUsedUpMessage } from "./seeding-completion-prompt";
import { defaultSeedingPercents, overRemainingPercentProblem, remainingPercentByLane } from "./seeding-lane-remaining-percent";

const labels: Record<string, string> = { seedingDate: "Ngày thả giống phải đúng ngày/tháng/năm", seedLotId: "Chọn lô giống", laneNumbers: "Chọn ít nhất một làn", quantity: "Số lượng giống phải lớn hơn 0" };
const n = (value: number) => value.toLocaleString("vi-VN", { maximumFractionDigits: 3 });

/** Records a new seeding, or corrects/removes an existing one (a reason is required for both). */
export function SeedingForm({ zoneId, raftId, cycleId, cycleStartDate, data, record, allowed, onClose, onSaved }: {
  zoneId: string; raftId: string; cycleId: string;
  /** Seeding cannot be dated before the cycle starts; undefined when the caller does not know it. */
  cycleStartDate?: string;
  data: z.infer<typeof c.seedingList>; record: z.infer<typeof c.seedingRecord> | null; allowed(action: string): boolean; onClose(): void; onSaved(): void;
}) {
  const fromNursery = !!data.nurseryBatchId;
  const lots = useRemote(useMemo(() => (signal: AbortSignal) => fromNursery ? Promise.resolve({ status: "success" as const, data: { raftId, lots: [] } }) : seedRepo.read("seed-lots", { id: raftId, zoneId }, c.seedLots, signal), [raftId, zoneId, fromNursery]));
  // Whether the cooperative lets stock go negative (a failed read, e.g. for staff, means "unknown": the backend still decides with MSG-INPUT-01).
  const settings = useRemote(useMemo(() => (signal: AbortSignal) => inputRepository.settings(signal), []));
  const dateWindow = useMemo(() => backdateWindow(businessToday(), cycleStartDate), [cycleStartDate]);
  const [date, setDate] = useState(record?.seedingDate ?? businessToday()), [lot, setLot] = useState(record?.seedLot.id ?? "");
  const [quantity, setQuantity] = useState(String(record?.quantity ?? "")), [lanes, setLanes] = useState(record?.laneNumbers ?? []);
  const [reason, setReason] = useState(""), [overReason, setOverReason] = useState(""), [asked, setAsked] = useState(false), [error, setError] = useState<string>();
  const [laneDirty, setLaneDirty] = useState(false), [lanePending, setLanePending] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]), [photoBusy, setPhotoBusy] = useState(false);
  const [kept, setKept] = useState(record?.photos ?? []), [photoError, setPhotoError] = useState<string>();
  const [percents, setPercents] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(record?.lanePercents ?? {}).map(([lane, value]) => [lane, String(value)])));
  const [percentError, setPercentError] = useState<string>();
  const remaining = data.nurseryRemaining ?? null;
  // A correction first releases its own quantity, then takes the replacement from the shared pool.
  const capacityNursery = remaining == null ? null : remaining + (record?.quantity ?? 0);
  const nurseryExhausted = fromNursery && capacityNursery !== null && capacityNursery <= 0;
  const dirty = !!photos.length || kept.length !== (record?.photos?.length ?? 0) || JSON.stringify(percents) !== JSON.stringify(Object.fromEntries(Object.entries(record?.lanePercents ?? {}).map(([lane, value]) => [lane, String(value)]))) || date !== (record?.seedingDate ?? businessToday()) || lot !== (record?.seedLot.id ?? "") || quantity !== String(record?.quantity ?? "") || JSON.stringify(lanes) !== JSON.stringify(record?.laneNumbers ?? []) || !!reason;
  // The unit always comes from the Vật tư & Giống catalogue (the lot's unit), never a fixed word.
  const selectedLot = lots.data?.lots.find(v => v.id === lot);
  const seedUnit = selectedLot?.unit ?? record?.seedLot.unit ?? "mảnh";
  const { notify } = useToast();
  const editor = useOperationEditor(onClose, dirty || laneDirty, lanePending || photoBusy);
  const plan = useSeedingPlan(cycleId, quantity, record?.quantity ?? 0);
  const question = !fromNursery && (asked || isOverPlanQuestion(editor.mutation.failure));
  const onHand = selectedLot?.onHand ?? null, capacity = onHand === null ? null : onHand + (record && record.seedLot.id === lot ? record.quantity : 0);
  const noNegative = settings.data?.allowNegativeQuantity === false, over = capacity !== null && Number(quantity) > capacity;
  // Stock check (409 MSG-INPUT-01): on hand and balance after, in the lot's own unit.
  const stockError = editor.mutation.failure ? farmingErrorText(editor.mutation.failure, seedUnit) : undefined;
  const editable = !data.seedingCompletedOn && (record ? record.canCorrect && allowed("Edit") : data.canRecord && allowed("Create"));
  const blockedLanes = data.lanes.filter(laneIsUnavailable).map(lane => lane.laneNumber);
  const choices = seedingLaneChoices(data.lanes, record?.laneNumbers, data.seedableLaneNumbers);
  const poolExceeded = fromNursery && capacityNursery !== null && Number(quantity) > capacityNursery;
  const quantityError = poolExceeded ? `Chỉ còn ${n(capacityNursery!)} mảnh trong kho ươm${record ? " (đã tính số mảnh của bản ghi đang sửa)" : ""}.` : farmingFieldError(editor.mutation.failure?.problem, "Quantity");
  const edited = <T,>(set: (value: T) => void) => (value: T) => { setAsked(false); if (editor.mutation.failure) editor.mutation.reviewed(); set(value); };
  // A new seeding defaults each picked lane to what is left of it (100% minus the percent already seeded); the user may lower it, never exceed it.
  const remainingByLane = useMemo(() => record ? undefined : remainingPercentByLane(data.lanes), [record, data.lanes]);
  const shownPercents = remainingByLane ? { ...defaultSeedingPercents(lanes, remainingByLane), ...percents } : percents;
  const percentsProblem = () => lanePercentsProblem(lanes, shownPercents, record ? undefined : 100) ?? (remainingByLane ? overRemainingPercentProblem(lanes, shownPercents, remainingByLane) : undefined);

  const values = (confirmed: boolean) => c.seedValues.safeParse({ cycleId, seedingDate: date, ...(!fromNursery ? { seedLotId: lot } : {}), lanePercents: selectedLanePercents(lanes, shownPercents, record ? undefined : 100), quantity: Number(quantity), laneNumbers: lanes, ...(confirmed ? { confirmOverPlan: true, overPlanReason: overReason } : {}) });
  const send = (parsed: z.infer<typeof c.seedValues>) => seedRepo.upload(record ? "seeding-correct" : "seeding-record", photos, { ...parsed, ...(record ? { reason, rowVersion: record.rowVersion, ...(photos.length || kept.length !== (record.photos?.length ?? 0) ? { keepPhotoIds: kept.map(photo => photo.id).filter((id): id is string => !!id) } : {}) } : {}) }, z.object({ record: c.seedingRecord }), record?.id ?? cycleId, zoneId);
  const done = () => { notify({ tone: "success", title: `Đã lưu lần thả giống${fromNursery ? ` từ ${data.nurseryCode ?? "đợt ươm"}` : ` ${record?.seedLot.code ?? selectedLot?.code ?? ""}`}.`, action: { label: "Bước tiếp theo →", href: farmingStepLink("harvest", { zoneId, raftId, cycleId }) } });
    // This save used the last nursed pieces: say so now; the panel keeps the same prompt as a banner above the records.
    if (fromNursery && capacityNursery !== null && capacityNursery - Number(quantity) <= 0) notify({ tone: "success", title: nurseryUsedUpMessage(data.nurseryCode) });
    onSaved();
  };
  /** Date, fields, reason, stock and the 150% ceiling: the problem text, or undefined when the form may be sent. */
  function problem(parsed: ReturnType<typeof values>) {
    const dateProblem = date !== record?.seedingDate ? backdateProblem(date, dateWindow, "Ngày thả giống", !!cycleStartDate) : undefined;
    if (dateProblem) return dateProblem;
    if (nurseryExhausted) return "Kho ươm không còn mảnh nào để thả thêm.";
    if (poolExceeded) return quantityError;
    if (!parsed.success) return `${[...new Set(parsed.error.issues.map(issue => labels[String(issue.path[0])] ?? "Kiểm tra thông tin thả giống"))].join(". ")}.`;
    if (lanes.some(lane => blockedLanes.includes(lane))) return "Không thể thả giống trên làn đang hỏng, đã mất giống hoặc ngừng hoạt động.";
    if (lanes.some(lane => !choices.includes(lane))) return "Làn đã đủ 100% hoặc không còn được thả thêm. Chọn lại làn có thể thả giống.";
    if (record && !reason.trim()) return "Nhập lý do điều chỉnh hoặc xóa bản ghi.";
    if (!fromNursery && !lot) return "Chọn lô giống.";
    if (!fromNursery && noNegative && over) return `Số lượng vượt tồn kho: lô còn ${n(capacity!)} ${seedUnit} và hợp tác xã không cho xuất âm kho. Hãy giảm số lượng hoặc nhập thêm giống.`;
    if (!fromNursery && plan.hard) return `Tổng giống thả sẽ là ${plan.percent}% kế hoạch, vượt 150% nên không thể xác nhận. Hãy sửa lại số liệu hoặc điều chỉnh kế hoạch chu kỳ.`;
    return undefined;
  }
  async function save() {
    if (lanePending || laneDirty) { setError("Lưu hoặc bỏ thay đổi của làn trước khi lưu lần thả giống."); return; }
    const photosBad = photoValidationMessage(kept.length + photos.length, !record || !!record.photos?.length);
    const percentsBad = percentsProblem();
    setPhotoError(photosBad); setPercentError(percentsBad);
    if (photosBad || percentsBad || photoBusy) return;
    const parsed = values(false), blocked = problem(parsed);
    if (blocked || !parsed.success) { setError(blocked); return; }
    setError(undefined);
    if (!fromNursery && plan.soft) { setAsked(true); return; }
    const saved = await editor.submit(record ? "Lưu điều chỉnh thả giống?" : "Ghi nhận lần thả giống này?", () => send(parsed.data));
    if (saved) done();
  }
  async function confirmOver() {
    const photosBad = photoValidationMessage(kept.length + photos.length, !record || !!record.photos?.length);
    const percentsBad = percentsProblem();
    setPhotoError(photosBad); setPercentError(percentsBad);
    if (lanePending || laneDirty || photoBusy || photosBad || percentsBad) return;
    const parsed = values(true), blocked = problem(parsed);
    if (blocked || !parsed.success) { setError(blocked ?? "Nhập lý do vượt kế hoạch (tối đa 1.000 ký tự)."); return; }
    setError(undefined);
    const saved = await editor.mutation.run(() => send(parsed.data));
    if (saved) { setAsked(false); done(); }
  }
  return <EditorFrame size="xl" inline={!!record} title={record ? "Bản ghi thả giống" : "Ghi nhận thả giống"} editor={editor} error={error || stockError || lots.error}>
    {record && !record.canCorrect && <p className="mb-4 text-sm text-text-muted">Bản ghi đang được khóa theo trạng thái chu kỳ hoặc lô thu hoạch. Không thể sửa hoặc xóa ở trạng thái này.</p>}
    <form onSubmit={event => { event.preventDefault(); void save(); }}>
      <fieldset disabled={!editable || editor.disabled || laneDirty} className="grid min-w-0 items-start gap-4 sm:grid-cols-2">
        {fromNursery ? <SeedingNurseryQuantitySummary code={data.nurseryCode} name={data.seedLot?.itemName ?? record?.seedLot.itemName} remaining={remaining} /> : <div className="min-w-0 sm:col-span-2"><p className="mb-2 text-xs text-text-muted">Không qua ươm</p><Select label="Lô giống *" required value={lot} onChange={event => edited(setLot)(event.target.value)}>
          <option value="">Chọn lô giống</option>
          {record && !lots.data?.lots.some(v => v.id === record.seedLot.id) && <option value={record.seedLot.id}>{record.seedLot.code}</option>}
          {lots.data?.lots.map(v => <option key={v.id} value={v.id}>{v.code} · {v.itemName ?? "Giống"} · {v.supplierName}{v.onHand != null ? ` · còn ${n(v.onHand)} ${v.unit}` : ` · ${v.unit}`}</option>)}
        </Select></div>}
        <div className="min-w-0"><Field label="Ngày thả giống *" type="date" required min={dateWindow.min} max={dateWindow.max} value={date} onChange={event => edited(setDate)(event.target.value)} /></div>
        {fromNursery && <div className="min-w-0"><UnitField key="nursery-seeding-quantity" label="Số mảnh lấy hôm nay *" unit="mảnh" decimals={3} min={0.001} max={capacityNursery ?? undefined} required value={quantity} onChange={edited(setQuantity)} error={quantityError}
          hint={record ? "Khi sửa, số mảnh cũ được hoàn kho trước khi trừ số mới (ước tính)." : "Số mảnh lấy từ kho ươm (ước tính)."} /></div>}
        {!fromNursery && <div className="min-w-0"><UnitField key="seeding-quantity" label="Số lượng giống *" unit={seedUnit} decimals={3} min={0.001} max={noNegative && capacity !== null ? capacity : undefined} required value={quantity} onChange={edited(setQuantity)}
          hint={onHand !== null ? `Còn ${n(onHand)} ${seedUnit} trong lô${over ? (noNegative ? ". Không được vượt tồn kho" : ". Số nhập đang lớn hơn tồn kho") : ""}` : undefined} /></div>}
        <div className="min-w-0 space-y-4 sm:col-span-2">
        {!fromNursery && plan.planned !== null && <PlanBar label="Giống đã thả" actual={plan.total} plan={plan.planned} unit={plan.seedUnit ?? seedUnit} hideOverNote note={`Giống đã thả ${n(plan.total)} / kế hoạch ${n(plan.planned)} ${plan.seedUnit ?? seedUnit} (${n(plan.percent!)}%) nếu lưu lần thả này.`} />}
        <SeedingLanePicker lanes={data.lanes} notSeededLanes={data.notSeededLanes} choices={choices} values={lanes} editing={!!record} onChange={edited(setLanes)}
          onDirty={setLaneDirty} onPending={setLanePending} scope={{ raftId, zoneId, cycleId, cycleRowVersion: data.cycleRowVersion, readOnly: !editable || editor.mutation.pending, onChanged: () => {} }} />
        <RecordLanePercentFields lanes={lanes} values={shownPercents} onChange={value => { edited(setPercents)(value); setPercentError(undefined); }} kind="seeding" defaultValue={record ? undefined : 100} remaining={remainingByLane} error={percentError || farmingFieldError(editor.mutation.failure?.problem, "LanePercent")} />
        <PhotoPicker files={photos} onChange={value => { edited(setPhotos)(value); setPhotoError(undefined); }} existing={kept} onRemoveExisting={id => setKept(kept.filter(photo => (photo.id ?? photo.key ?? photo.url) !== id))} required={!record || !!record.photos?.length} onBusyChange={setPhotoBusy} error={photoError || farmingFieldError(editor.mutation.failure?.problem, "Photos")} />
        {record && <Note label="Lý do điều chỉnh *" required value={reason} onChange={event => setReason(event.target.value)} />}
        </div>
      </fieldset>
      {question && editable && <OverPlanConfirm reason={overReason} onReason={setOverReason} pending={editor.mutation.pending} dismissLabel="Sửa lại số liệu" confirmLabel="Xác nhận vượt kế hoạch" onDismiss={() => { setAsked(false); editor.mutation.reviewed(); }} onConfirm={() => void confirmOver()}
        message={`Tổng giống thả sẽ là ${n(plan.total)} ${plan.seedUnit ?? seedUnit}${plan.planned !== null ? `, ${n(plan.percent!)}% kế hoạch ${n(plan.planned)}` : ", vượt kế hoạch của chu kỳ"}.`} />}
      <RecordFormFooter>
        <Button className="w-auto" key="discard-seeding" type="button" variant="secondary" disabled={editor.pending} onClick={() => void editor.close()}>Bỏ qua</Button>
        {editable && <Button className="w-auto" key="save-seeding" type="submit" disabled={editor.disabled || laneDirty || lots.loading || !!lots.error || question || nurseryExhausted || !fromNursery && plan.hard}>Lưu</Button>}
      </RecordFormFooter>
    </form>
    {lots.error && <Button type="button" variant="secondary" onClick={lots.reload}>Tải lại lô giống</Button>}
    {!data.seedingCompletedOn && record?.canCorrect && allowed("Delete") && <Button type="button" className="mt-3" variant="secondary" disabled={editor.disabled || laneDirty || !reason.trim()} onClick={async () => {
      if (await editor.submit(`Xóa lần thả giống ${record.seedLot.code}? ${fromNursery ? "Số mảnh sẽ được hoàn lại kho ươm" : "Lượng giống được trả về kho"} và lý do được lưu trong nhật ký.`, () => seedRepo.write("remove", { reason, rowVersion: record.rowVersion }, z.object({ done: z.literal(true) }), record.id, zoneId))) { notify({ tone: "success", title: `Đã xóa lần thả giống ${record.seedLot.code}.` }); onSaved(); }
    }}>Xóa lần thả</Button>}
  </EditorFrame>;
}
