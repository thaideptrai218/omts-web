"use client";
import { compressLaneNumbers } from "@/features/farming-management/lane-ranges";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { PlanBar } from "@/features/farming-management/plan-bar";
import { ErrorNotice, Note, Skeleton, useMutation, useRemote } from "@/features/operations/ui";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { CycleNurserySummary } from "./cycle-nursery-summary";
import { closeCycle, readClosePreview } from "./repository";

const kg = (value: number) => value.toLocaleString("vi-VN", { maximumFractionDigits: 2 });

/**
 * "Kết thúc chu kỳ" in the Tổng kết step: the figures the close would keep, whether it is early, the Owner-approval rule for a Zone Manager,
 * the required assessment, then one confirmation. The Owner closes directly; the backend alone decides (409 MSG-CYCLE-07 is answered here too).
 */
export function CycleClosePanel({ cycleId, raftCode, onDismiss, onClosed }: { cycleId: string; raftCode: string; onDismiss(): void; onClosed(): void }) {
  const preview = useRemote(useMemo(() => (signal: AbortSignal) => readClosePreview(cycleId, signal), [cycleId]));
  const [assessment, setAssessment] = useState(""), [approved, setApproved] = useState(false), [error, setError] = useState<string>();
  const mutation = useMutation(), confirmation = useActionDialog(), { notify } = useToast();
  const data = preview.data, f = data?.summary;
  // The preview says whether the caller needs the Owner's approval; a 409 MSG-CYCLE-07 on the write says it too.
  const needsApproval = !!data?.needsOwnerApproval || mutation.failure?.problem?.confirmFlag === "ownerApproved";

  async function close() {
    if (!data || mutation.busy() || mutation.blocked) return;
    if (!assessment.trim()) { setError("Nhập đánh giá chu kỳ trước khi kết thúc."); return; }
    if (assessment.trim().length > 2000) { setError("Đánh giá tối đa 2.000 ký tự."); return; }
    if (needsApproval && !approved) { setError("Kết thúc sớm cần Chủ hợp tác xã đồng ý. Hãy xác nhận khi Chủ đã đồng ý."); return; }
    setError(undefined);
    if (!(await confirmation.confirm(`Kết thúc chu kỳ của bè ${raftCode}? Chu kỳ đóng ngay hôm nay và không thể mở lại.`))) return;
    const closed = await mutation.run(() => closeCycle(cycleId, { assessment: assessment.trim(), rowVersion: data.cycleRowVersion, ...(needsApproval ? { ownerApproved: true } : {}) }));
    if (!closed) return;
    notify({ tone: "success", title: `Đã kết thúc chu kỳ của bè ${raftCode}.` });
    onClosed();
  }
  if (preview.loading) return <Skeleton />;
  if (!data || !f) return <div role="alert" className="grid gap-2"><ErrorNotice error={preview.error ?? "Không tải được bản xem trước kết thúc chu kỳ."} /><div><Button key="close-preview-retry" type="button" className="w-auto" variant="secondary" onClick={preview.reload}>Tải lại</Button></div></div>;
  return <form noValidate aria-label="Kết thúc chu kỳ" className="mt-3 grid gap-3 rounded-control border border-border bg-surface-subtle p-3" onSubmit={event => { event.preventDefault(); void close(); }}>
    {confirmation.dialog}
    <h4 className="text-sm font-semibold">Kết thúc chu kỳ từ {formatVietnameseDate(f.startDate)}</h4>
    <PlanBar label="Giống đã thả" actual={f.seedHung} plan={f.expectedSeedQuantity} unit={f.seedUnit ?? ""} />
    <PlanBar label="Sản lượng thu hoạch" actual={f.kgHarvested} plan={f.targetYieldKg} unit="kg" estimate note={`${f.harvestLotCount} chuyến · ${(f.harvestedCages ?? 0).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} lồng · ${f.daysOfFarming} ngày nuôi`} />
    <CycleNurserySummary nursery={f.nursery} />
    {data.isEarly && <p role="status" className="rounded-control border border-warning/30 bg-warning-soft p-2 text-sm">
      Kết thúc sớm{f.notHarvestedLanes.length ? `: còn làn ${compressLaneNumbers(f.notHarvestedLanes)} chưa thu xong và sẽ kết thúc không có sản lượng` : f.earlyReason === "NoSeedingSession" ? ": chu kỳ chưa có lần thả giống nào" : ""}.
      {" "}{needsApproval ? "Cần Chủ hợp tác xã đồng ý." : "Chủ hợp tác xã chỉ cần xác nhận."}</p>}
    {!!f.lostLanes?.length && <p className="text-sm text-text-muted">Làn {compressLaneNumbers(f.lostLanes.map(item => item.laneNumber))} đã ngừng hoạt động khi đang có giống: ghi nhận mất giống không số lượng và được tính là đã kết thúc.</p>}
    {needsApproval && <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="omts-check mt-0.5" checked={approved} disabled={mutation.pending} onChange={event => setApproved(event.target.checked)} />Chủ hợp tác xã đã trực tiếp đồng ý kết thúc sớm chu kỳ này</label>}
    <Note label="Đánh giá chu kỳ *" required maxLength={2000} value={assessment} disabled={mutation.pending} onChange={event => setAssessment(event.target.value)} />
    <p className="text-xs text-text-muted">Sản lượng là kg ước tính theo số lồng đã ghi nhận (chưa phải cân tại cảng). {f.kgHarvested > 0 && f.targetYieldKg ? `Đạt ${kg(Math.round((f.kgHarvested / f.targetYieldKg) * 1000) / 10)}% mục tiêu.` : ""}</p>
    <ErrorNotice error={error || mutation.error} />
    {mutation.blocked && <div role="alert" className="grid gap-2 text-sm"><p>Chu kỳ đã thay đổi hoặc chưa rõ kết quả. Tải lại bản xem trước để đối chiếu; nội dung đánh giá vẫn được giữ.</p>
      <div><Button key="close-reload" type="button" className="w-auto" variant="secondary" disabled={preview.loading} onClick={() => { preview.reload(); mutation.reviewed(); }}>Tải lại bản xem trước</Button></div></div>}
    <div className="flex flex-wrap justify-end gap-2">
      <Button key="close-dismiss" type="button" className="w-auto" variant="secondary" disabled={mutation.pending} onClick={onDismiss}>Bỏ qua</Button>
      <Button key="close-submit" type="submit" className="w-auto" isPending={mutation.pending} disabled={mutation.blocked}>Kết thúc chu kỳ</Button>
    </div>
  </form>;
}
