"use client";
import { useCallback, useEffect, useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { Facts, TabFooter } from "@/features/farming-management/detail-parts";
import { useStickyRemote } from "@/features/farming-management/use-sticky-remote";
import { businessToday, ErrorNotice, Skeleton, useMutation } from "@/features/operations/ui";
import styles from "@/features/farming-management/farming-management.module.css";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { RecordHistory } from "@/features/history/record-history";
import { isNurseryBatchLocked, planBody, seedLockedFailure, seedWithoutProductText, planDraftOf, validatePlan, type CycleRow, type PlanDraft, type PlanField } from "./cycle-model";
import { farmedSeedText } from "./cycle-farmed-seed";
import { CyclePlanFields } from "./cycle-plan-fields";
import { CyclePlanPhotos } from "./cycle-plan-photos";
import { cycleProgress } from "./contracts";
import { cycleNurseryText } from "./nursery-batch-options";
import { readCycles, writeCycle } from "./repository";

export type CycleAccess = { view: boolean; create: boolean; edit: boolean; remove: boolean; logs: boolean; logsCreate: boolean; logsEdit: boolean };
const day = (value: string | null) => value ? formatVietnameseDate(value) : null;
/** "Kế hoạch": the cycle plan (planned yield, start date, note, nursed batch), edited in place; cancelling a mistaken cycle asks for confirmation. */
export function CyclePlanTab({ row, zoneId, access, dirtyRef, onChanged }: { row: CycleRow; zoneId: string; access: CycleAccess; dirtyRef: RefObject<boolean>; onChanged(notice: string): void }) {
  const current = useStickyRemote(useCallback((signal: AbortSignal) => readCycles({ action: "progress", raftId: row.raftId, ...(row.cycle ? { cycleId: row.cycle.id } : { date: businessToday() }) }, cycleProgress, signal), [row.raftId, row.cycle]));
  const [editing, setEditing] = useState(false), [draft, setDraft] = useState<PlanDraft>(), [photoDirty, setPhotoDirty] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<PlanField, string>>>({}), [reloaded, setReloaded] = useState(false);
  const mutation = useMutation(), confirmation = useActionDialog();
  const cycle = row.cycle ? current.data?.cycle ?? null : null;
  const dirty = photoDirty || editing && !!cycle && !!draft && JSON.stringify(draft) !== JSON.stringify(planDraftOf(cycle));
  useEffect(() => { dirtyRef.current = dirty; return () => { dirtyRef.current = false; }; }, [dirty, dirtyRef]);
  const locked = current.loading || mutation.pending;
  // The nursed batch is fixed once any lane was seeded (409 CYCLE_SEED_LOCKED).
  const batchLocked = !!cycle && isNurseryBatchLocked(cycle, current.data?.lanes);

  async function save() {
    if (!cycle || !draft || mutation.busy() || mutation.blocked || current.loading) return;
    const found = validatePlan(draft, businessToday());
    setErrors(found);
    if (Object.keys(found).length) return;
    const result = await mutation.run(() => writeCycle("edit", cycle.id, planBody(draft, cycle, batchLocked)));
    if (!result) return;
    setEditing(false); current.reload(); onChanged("Đã cập nhật kế hoạch chu kỳ.");
  }
  async function cancelCycle() {
    if (!cycle || mutation.busy() || mutation.blocked || !(await confirmation.confirm("Hủy chu kỳ được mở nhầm? Chỉ hủy được khi chu kỳ chưa có bản ghi nghiệp vụ."))) return;
    const result = await mutation.run(() => writeCycle("cancel", cycle.id, { rowVersion: cycle.rowVersion }));
    if (result) onChanged("Đã hủy chu kỳ mở nhầm.");
  }
  if (!row.cycle) return <p className={styles.hint}>Bè chưa có chu kỳ nuôi.</p>;
  if (current.loading && !current.data) return <Skeleton />;
  if (current.error && !cycle) return <ListStateMessage error={current.error} onRetry={current.reload} retryLabel="Tải lại" />;
  if (!cycle) return <p className={styles.hint}>Không tải được kế hoạch chu kỳ.</p>;
  return <form noValidate onSubmit={event => { event.preventDefault(); void save(); }}>
    {confirmation.dialog}
    <fieldset disabled={locked || mutation.blocked} className="min-w-0 border-0 p-0">
      {editing && draft ? <CyclePlanFields cycle={cycle} zoneId={zoneId} draft={draft} errors={errors} batchLocked={batchLocked} onChange={(key, value) => { setErrors(previous => ({ ...previous, [key]: undefined })); setDraft(previous => previous && { ...previous, [key]: value }); }} />
        : <Facts items={[["Ngày bắt đầu", day(cycle.startDate)], ["Tình trạng", cycle.closeDate ? "Đã đóng" : "Đang nuôi"], ["Số ngày nuôi", cycle.daysOfFarming],
          ["Đợt ươm", cycle.nurseryBatchId ? <>{cycleNurseryText(cycle)}{batchLocked && <small className="block text-text-muted">Đã thả giống, không đổi được đợt ươm</small>}</> : "Không qua ươm"],
          ["Giống", farmedSeedText({ ...cycle, nurseryCode: null })],
          ["Sản lượng dự kiến", cycle.targetYieldKg === null ? "Chưa lập" : `${cycle.targetYieldKg.toLocaleString("vi-VN")} kg`], ["Ghi chú", cycle.note],
          ["Thả giống hoàn tất", day(cycle.seedingCompletedOn)], ["Ngày đóng", day(cycle.closeDate)], ["Đánh giá", cycle.assessment]]} />}
    </fieldset>
    <CyclePlanPhotos key={cycle.id} cycle={cycle} canEdit={access.edit && cycle.canEdit && !editing} onDirtyChange={setPhotoDirty} onSaved={() => { current.reload(); onChanged("Đã cập nhật ảnh kế hoạch nuôi."); }} />
    {cycle && <RecordHistory kind="cycle" id={cycle.id} zoneId="" />}
    <ErrorNotice error={seedLockedFailure(mutation.failure) ? "Đã thả giống, không đổi được đợt ươm (và loại hàu theo đợt). Hãy tải lại chu kỳ để đối chiếu." : seedWithoutProductText(mutation.failure) ?? (mutation.error || current.error)} />
    {mutation.blocked && <div role="alert" className={styles.alert}><p>Hãy tải lại chu kỳ và đối chiếu trước khi lưu lại. Nội dung đang nhập vẫn được giữ.</p><div>
      <Button key="reload" type="button" className="w-auto" variant="secondary" disabled={current.loading} onClick={() => { current.reload(); setReloaded(true); }}>Tải chu kỳ mới để đối chiếu</Button>
      {reloaded && !current.loading && !mutation.uncertain && <Button key="reviewed" type="button" className="w-auto" variant="secondary" onClick={() => { mutation.reviewed(); setReloaded(false); }}>Đã đối chiếu, tiếp tục</Button>}
    </div></div>}
    <TabFooter
      left={!editing && access.remove && cycle.canCancel ? <Button key="cancel-cycle" type="button" variant="ghost" className="w-auto" disabled={locked || mutation.blocked} onClick={() => void cancelCycle()}><InterfaceIcon name="trash" className="size-4" />Hủy chu kỳ mở nhầm</Button> : undefined}
      right={editing
        ? <><Button key="discard" type="button" className="w-auto" variant="secondary" disabled={mutation.pending} onClick={() => { setEditing(false); setErrors({}); mutation.reviewed(); }}>Bỏ qua</Button>
          <Button key="save" type="submit" className="w-auto" isPending={mutation.pending} disabled={current.loading || mutation.blocked}>Lưu</Button></>
        : access.edit && cycle.canEdit ? <Button key="edit" type="button" className="w-auto" disabled={locked} onClick={() => { setDraft(planDraftOf(cycle)); setErrors({}); setReloaded(false); mutation.reviewed(); setEditing(true); }}><InterfaceIcon name="pencil" className="size-4" />Chỉnh sửa</Button> : undefined} />
  </form>;
}
