"use client";
import { useMemo, useState } from "react";
import { z } from "zod";
import { useToast } from "@/components/ui/toast-provider";
import { Button } from "@/components/ui/button";
import { UnitField } from "@/components/form/number-fields";
import { farmingStepLink } from "@/features/farming-management/entity-links";
import { SeedingLanePicker } from "./seeding-lane-picker";
import { backdateProblem, backdateWindow } from "@/shared/format/backdate-window";
import { PlanBar } from "@/features/farming-management/plan-bar";
import { inputRepository } from "@/features/input-items/repository";
import { Field, Note, Select, businessToday, useRemote } from "@/features/operations/ui";
import { useOperationEditor } from "@/features/operations/use-operation-editor";
import { farmingErrorText } from "./farming-error-text";
import { OverPlanConfirm, isOverPlanQuestion } from "./over-plan-confirm";
import * as c from "./records-contracts";
import { EditorFrame, seedRepo } from "./records-shared";
import { useSeedingPlan } from "./use-seeding-plan";
import { laneIsUnavailable } from "./lane-availability";

const labels: Record<string, string> = { seedingDate: "Ngày thả giống phải đúng ngày/tháng/năm", seedLotId: "Chọn lô giống", laneNumbers: "Chọn ít nhất một làn", quantity: "Số lượng giống phải lớn hơn 0" };
const n = (value: number) => value.toLocaleString("vi-VN", { maximumFractionDigits: 3 });

/** Records a new seeding, or corrects/removes an existing one (a reason is required for both). */
export function SeedingForm({ zoneId, raftId, cycleId, cycleStartDate, data, record, allowed, onClose, onSaved }: {
  zoneId: string; raftId: string; cycleId: string;
  /** Seeding cannot be dated before the cycle starts; undefined when the caller does not know it. */
  cycleStartDate?: string;
  data: z.infer<typeof c.seedingList>; record: z.infer<typeof c.seedingRecord> | null; allowed(action: string): boolean; onClose(): void; onSaved(): void;
}) {
  const lots = useRemote(useMemo(() => (signal: AbortSignal) => seedRepo.read("seed-lots", { id: raftId, zoneId }, c.seedLots, signal), [raftId, zoneId]));
  // Whether the cooperative lets stock go negative (a failed read, e.g. for staff, means "unknown": the backend still decides with MSG-INPUT-01).
  const settings = useRemote(useMemo(() => (signal: AbortSignal) => inputRepository.settings(signal), []));
  const dateWindow = useMemo(() => backdateWindow(businessToday(), cycleStartDate), [cycleStartDate]);
  const [date, setDate] = useState(record?.seedingDate ?? businessToday()), [lot, setLot] = useState(record?.seedLot.id ?? "");
  const [quantity, setQuantity] = useState(String(record?.quantity ?? "")), [lanes, setLanes] = useState(record?.laneNumbers ?? []);
  const [reason, setReason] = useState(""), [overReason, setOverReason] = useState(""), [asked, setAsked] = useState(false), [error, setError] = useState<string>();
  const [laneDirty, setLaneDirty] = useState(false), [lanePending, setLanePending] = useState(false);
  const dirty = date !== (record?.seedingDate ?? businessToday()) || lot !== (record?.seedLot.id ?? "") || quantity !== String(record?.quantity ?? "") || JSON.stringify(lanes) !== JSON.stringify(record?.laneNumbers ?? []) || !!reason;
  // The unit always comes from the Vật tư & Giống catalogue (the lot's unit), never a fixed word.
  const selectedLot = lots.data?.lots.find(v => v.id === lot);
  const seedUnit = selectedLot?.unit ?? record?.seedLot.unit ?? "mảnh";
  const { notify } = useToast();
  const editor = useOperationEditor(onClose, dirty || laneDirty, lanePending);
  const plan = useSeedingPlan(cycleId, quantity, record?.quantity ?? 0);
  const question = asked || isOverPlanQuestion(editor.mutation.failure);
  const onHand = selectedLot?.onHand ?? null, capacity = onHand === null ? null : onHand + (record && record.seedLot.id === lot ? record.quantity : 0);
  const noNegative = settings.data?.allowNegativeQuantity === false, over = capacity !== null && Number(quantity) > capacity;
  // Stock check (409 MSG-INPUT-01): on hand and balance after, in the lot's own unit.
  const stockError = editor.mutation.failure ? farmingErrorText(editor.mutation.failure, seedUnit) : undefined;
  const editable = record ? record.canCorrect && allowed("Edit") : data.canRecord && allowed("Create");
  const blockedLanes = data.lanes.filter(laneIsUnavailable).map(lane => lane.laneNumber);
  const choices = Array.from(new Set([...data.lanes.filter(v => v.canSeed && !laneIsUnavailable(v)).map(v => v.laneNumber), ...(record?.laneNumbers ?? [])])).sort((a, b) => a - b);
  const edited = <T,>(set: (value: T) => void) => (value: T) => { setAsked(false); if (editor.mutation.failure) editor.mutation.reviewed(); set(value); };

  const values = (confirmed: boolean) => c.seedValues.safeParse({ seedingDate: date, seedLotId: lot, quantity: Number(quantity), laneNumbers: lanes, ...(confirmed ? { confirmOverPlan: true, overPlanReason: overReason } : {}) });
  const send = (parsed: z.infer<typeof c.seedValues>) => seedRepo.write(record ? "correct" : "record", { ...parsed, ...(record ? { reason, rowVersion: record.rowVersion } : {}) }, z.object({ record: c.seedingRecord }), record?.id ?? cycleId, zoneId);
  const done = () => { notify({ tone: "success", title: `Đã lưu thả giống ${record?.seedLot.code ?? selectedLot?.code ?? ""}.`, action: { label: "Bước tiếp theo →", href: farmingStepLink("harvest", { zoneId, raftId, cycleId }) } }); onSaved(); };
  /** Date, fields, reason, stock and the 150% ceiling: the problem text, or undefined when the form may be sent. */
  function problem(parsed: ReturnType<typeof values>) {
    const dateProblem = date !== record?.seedingDate ? backdateProblem(date, dateWindow, "Ngày thả giống", !!cycleStartDate) : undefined;
    if (dateProblem) return dateProblem;
    if (!parsed.success) return `${[...new Set(parsed.error.issues.map(issue => labels[String(issue.path[0])] ?? "Kiểm tra thông tin thả giống"))].join(". ")}.`;
    if (lanes.some(lane => blockedLanes.includes(lane))) return "Không thể thả giống trên làn đang hỏng, đã mất giống hoặc ngừng hoạt động.";
    if (record && !reason.trim()) return "Nhập lý do điều chỉnh hoặc xóa bản ghi.";
    if (noNegative && over) return `Số lượng vượt tồn kho: lô còn ${n(capacity!)} ${seedUnit} và hợp tác xã không cho xuất âm kho. Hãy giảm số lượng hoặc nhập thêm giống.`;
    if (plan.hard) return `Tổng giống thả sẽ là ${plan.percent}% kế hoạch, vượt 150% nên không thể xác nhận. Hãy sửa lại số liệu hoặc điều chỉnh kế hoạch chu kỳ.`;
    return undefined;
  }
  async function save() {
    if (lanePending || laneDirty) { setError("Lưu hoặc bỏ thay đổi của làn trước khi lưu lần thả giống."); return; }
    const parsed = values(false), blocked = problem(parsed);
    if (blocked || !parsed.success) { setError(blocked); return; }
    setError(undefined);
    if (plan.soft) { setAsked(true); return; }
    const saved = await editor.submit(record ? "Lưu điều chỉnh thả giống?" : "Ghi nhận lần thả giống này?", () => send(parsed.data));
    if (saved) done();
  }
  async function confirmOver() {
    if (lanePending || laneDirty) return;
    const parsed = values(true), blocked = problem(parsed);
    if (blocked || !parsed.success) { setError(blocked ?? "Nhập lý do vượt kế hoạch (tối đa 1.000 ký tự)."); return; }
    setError(undefined);
    const saved = await editor.mutation.run(() => send(parsed.data));
    if (saved) { setAsked(false); done(); }
  }
  return <EditorFrame inline={!!record} title={record ? "Bản ghi thả giống" : "Ghi nhận thả giống"} editor={editor} error={error || stockError || lots.error}>
    {record && !record.canCorrect && <p className="mb-4 text-sm text-text-muted">Bản ghi đang được khóa theo trạng thái chu kỳ hoặc lô thu hoạch. Không thể sửa hoặc xóa ở trạng thái này.</p>}
    <form onSubmit={event => { event.preventDefault(); void save(); }}>
      <fieldset disabled={!editable || editor.disabled || laneDirty} className="space-y-4">
        <Field label="Ngày thả giống *" type="date" required min={dateWindow.min} max={dateWindow.max} value={date} onChange={event => edited(setDate)(event.target.value)} />
        <Select label="Lô giống *" required value={lot} onChange={event => edited(setLot)(event.target.value)}>
          <option value="">Chọn lô giống</option>
          {record && !lots.data?.lots.some(v => v.id === record.seedLot.id) && <option value={record.seedLot.id}>{record.seedLot.code}</option>}
          {lots.data?.lots.map(v => <option key={v.id} value={v.id}>{v.code} · {v.itemName ?? "Giống"} · {v.supplierName}{v.onHand != null ? ` · còn ${n(v.onHand)} ${v.unit}` : ` · ${v.unit}`}</option>)}
        </Select>
        <UnitField key="seeding-quantity" label="Số lượng giống *" unit={seedUnit} decimals={3} min={0.001} max={noNegative && capacity !== null ? capacity : undefined} required value={quantity} onChange={edited(setQuantity)}
          hint={onHand !== null ? `Còn ${n(onHand)} ${seedUnit} trong lô${over ? (noNegative ? ". Không được vượt tồn kho" : ". Số nhập đang lớn hơn tồn kho") : ""}` : undefined} />
        {plan.planned !== null && <PlanBar label="Giống đã thả" actual={plan.total} plan={plan.planned} unit={plan.seedUnit ?? seedUnit} hideOverNote note={`Giống đã thả ${n(plan.total)} / kế hoạch ${n(plan.planned)} ${plan.seedUnit ?? seedUnit} (${n(plan.percent!)}%) nếu lưu lần thả này.`} />}
        <SeedingLanePicker lanes={data.lanes} notSeededLanes={data.notSeededLanes} choices={choices} values={lanes} editing={!!record} onChange={edited(setLanes)}
          onDirty={setLaneDirty} onPending={setLanePending} scope={{ raftId, zoneId, cycleId, cycleRowVersion: data.cycleRowVersion, readOnly: !editable || editor.mutation.pending, onChanged: () => {} }} />
        {record && <Note label="Lý do điều chỉnh *" required value={reason} onChange={event => setReason(event.target.value)} />}
      </fieldset>
      {question && editable && <OverPlanConfirm reason={overReason} onReason={setOverReason} pending={editor.mutation.pending} dismissLabel="Sửa lại số liệu" confirmLabel="Xác nhận vượt kế hoạch" onDismiss={() => { setAsked(false); editor.mutation.reviewed(); }} onConfirm={() => void confirmOver()}
        message={`Tổng giống thả sẽ là ${n(plan.total)} ${plan.seedUnit ?? seedUnit}${plan.planned !== null ? `, ${n(plan.percent!)}% kế hoạch ${n(plan.planned)}` : ", vượt kế hoạch của chu kỳ"}.`} />}
      <div className="mt-4 flex justify-end gap-2">
        <Button className="w-auto" key="discard-seeding" type="button" variant="secondary" disabled={editor.pending} onClick={() => void editor.close()}>Bỏ qua</Button>
        {editable && <Button className="w-auto" key="save-seeding" type="submit" disabled={editor.disabled || laneDirty || lots.loading || !!lots.error || question || plan.hard}>Lưu</Button>}
      </div>
    </form>
    {lots.error && <Button type="button" variant="secondary" onClick={lots.reload}>Tải lại lô giống</Button>}
    {record?.canCorrect && allowed("Delete") && <Button type="button" className="mt-3" variant="secondary" disabled={editor.disabled || laneDirty || !reason.trim()} onClick={async () => {
      if (await editor.submit(`Xóa lần thả giống ${record.seedLot.code}? Lượng giống được trả về kho và lý do được lưu trong nhật ký.`, () => seedRepo.write("remove", { reason, rowVersion: record.rowVersion }, z.object({ done: z.literal(true) }), record.id, zoneId))) { notify({ tone: "success", title: `Đã xóa lần thả giống ${record.seedLot.code}.` }); onSaved(); }
    }}>Xóa lần thả</Button>}
  </EditorFrame>;
}
