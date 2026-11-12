"use client";
import { useState, type ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast-provider";
import { LaneOverview } from "@/features/farming-management/lane-overview";
import { compressLaneNumbers } from "@/features/farming-management/lane-ranges";
import { ErrorNotice, operationError, useMutation } from "@/features/operations/ui";
import { finishHarvestLanes, type FinishHarvestOutcome } from "./finish-harvest-repository";

type Props = Omit<ComponentProps<typeof LaneOverview>, "selected" | "onSelectionChange" | "selectionAction"> & {
  raftId: string; zoneId: string; rowVersion?: string; onChanged(): void;
};

/** The selection is frozen while confirming; one atomic command or a reconciled legacy partial result. */
export function FinishHarvestOverview({ raftId, zoneId, rowVersion, onChanged, ...overview }: Props) {
  const [selected, setSelected] = useState<number[]>([]), [confirming, setConfirming] = useState<number[]>();
  const [partial, setPartial] = useState<FinishHarvestOutcome>();
  const mutation = useMutation(), { notify } = useToast();
  const selectedEligible = selected.filter(number => !overview.eligibleLaneNumbers || overview.eligibleLaneNumbers.includes(number));
  function close() {
    if (mutation.busy()) return;
    const refresh = !!partial || mutation.blocked;
    setConfirming(undefined); setPartial(undefined); mutation.reviewed();
    if (refresh) { setSelected([]); onChanged(); }
  }
  async function finish() {
    if (!confirming?.length || partial || mutation.busy() || mutation.blocked) return;
    const outcome = await mutation.run(() => finishHarvestLanes(raftId, zoneId, confirming, rowVersion));
    if (!outcome) return;
    if (outcome.finished.length) notify({ tone: "success", title: `Đã hoàn tất thu hoạch ${outcome.finished.length} làn` });
    else if (!outcome.failure) notify({ tone: "info", title: `${outcome.alreadyFinished.length} làn đã hoàn tất thu hoạch từ trước.` });
    if (outcome.failure) { setPartial(outcome); return; }
    setSelected([]); setConfirming(undefined); onChanged();
  }
  const failure = partial?.failure ?? mutation.failure;
  return <>
    <LaneOverview {...overview} selected={selectedEligible} onSelectionChange={setSelected} selectionDisabled={overview.selectionDisabled || mutation.pending}
      selectionAction={<Button type="button" className="w-auto" variant="secondary" disabled={!selectedEligible.length || overview.selectionDisabled || mutation.pending} onClick={() => { mutation.reviewed(); setPartial(undefined); setConfirming([...selectedEligible]); }}>Hoàn tất thu hoạch</Button>} />
    {confirming && <Dialog open title="Hoàn tất thu hoạch các làn đã chọn?" dismissible={!mutation.pending} mobileLayout="compact" onOpenChange={open => { if (!open) close(); }}>
      <p className="text-sm font-semibold">Làn {compressLaneNumbers(confirming)}</p>
      <p className="mt-2 text-sm text-text-muted">Các làn chuyển sang Đã thu xong và không ghi nhận thêm chuyến thu. Muốn hoàn tác phải sửa lô kèm lý do.</p>
      <ErrorNotice error={partial?.failure ? operationError(partial.failure) : mutation.error} />
      {failure?.httpStatus === 409 && !partial && <p className="mt-2 text-sm">Chưa có làn nào được thay đổi. Hãy đối chiếu tình trạng làn trước khi thử lại.</p>}
      {!!failure?.problem?.lanes?.length && <ul className="mt-3 space-y-2 text-sm text-danger" aria-label="Các làn chưa thể hoàn tất">{failure.problem.lanes.map(lane => <li key={lane.laneNumber}><strong>Làn {lane.laneNumber}:</strong> {lane.message}</li>)}</ul>}
      {partial && <div className="mt-3 space-y-2 text-sm" role="status">
        {!!partial.finished.length && <p>Đã hoàn tất: làn {compressLaneNumbers(partial.finished)}.</p>}
        {!!partial.alreadyFinished.length && <p>Đã hoàn tất từ trước: làn {compressLaneNumbers(partial.alreadyFinished)}.</p>}
        <p>{partial.failure?.uncertain ? "Cần đối chiếu kết quả" : "Chưa hoàn tất"}: làn {compressLaneNumbers(partial.remaining)}. Hãy tải tình trạng mới trước khi tiếp tục.</p>
      </div>}
      {mutation.blocked && <p className="mt-3 text-sm" role="alert">Cần tải tình trạng mới để đối chiếu kết quả trước khi tiếp tục.</p>}
      <div className="mt-5 flex justify-end gap-3">
        <Button type="button" className="w-auto" variant="secondary" disabled={mutation.pending} onClick={close}>{partial || mutation.blocked ? "Đóng và tải lại" : "Bỏ qua"}</Button>
        {!partial && <Button type="button" className="w-auto" disabled={mutation.blocked} isPending={mutation.pending} onClick={() => void finish()}>Hoàn tất thu hoạch</Button>}
      </div>
    </Dialog>}
  </>;
}
