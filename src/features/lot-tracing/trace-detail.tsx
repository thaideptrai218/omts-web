"use client";
import { Button } from "@/components/ui/button";
import { ErrorNotice, Skeleton } from "@/features/operations/ui";
import { PublishDialog } from "./publish-dialog";
import { TraceBackwardPanel } from "./trace-backward-panel";
import { TraceForwardPanel } from "./trace-forward-panel";
import { TraceLotHeader } from "./trace-lot-header";
import { useTraceDetail } from "./use-trace-detail";
import { useWithdrawal } from "./use-withdrawal";
import { WithdrawDialog } from "./withdraw-dialog";
import { WithdrawalNoticesPanel } from "./withdrawal-notices-panel";
import { WithdrawZone } from "./withdraw-zone";
import s from "./lot-tracing.module.css";

/** Kết quả truy xuất của một lô: đầu lô với thao tác, truy xuất ngược và xuôi cạnh nhau trên màn rộng. */
export function TraceDetail({ lotId, onCorrect }: { lotId: string; onCorrect(raftId: string, cycleId: string): void }) {
  const d = useTraceDetail(lotId), trace = d.trace.data, w = useWithdrawal(lotId, d.trace.reload);
  if (d.trace.loading) return <Skeleton />;
  if (d.trace.error || !trace) return <div><ErrorNotice error={d.trace.error} /><Button className="w-auto" variant="secondary" onClick={d.trace.reload}>Tải lại</Button></div>;
  return (
    <div className={s.stack}>
      {d.notice && <p role="status" className={s.success}>{d.notice}</p>}
      {!d.check && <ErrorNotice error={d.publishing.error ?? d.exporting.error} />}
      <TraceLotHeader trace={trace} exporting={d.exporting.pending} publishing={d.publishing.pending && !d.check} onExport={() => void d.exportFile()} onPublish={() => void d.openPublish()} onCorrect={() => onCorrect(trace.raftId, trace.cycleId)} />
      <div className={s.columns}>
        <TraceBackwardPanel trace={trace} />
        <TraceForwardPanel trace={trace} />
      </div>
      {trace.originState === "Published" && trace.canCorrect && <WithdrawZone lotCode={trace.lotCode} pending={w.opening} error={w.openError} onOpen={() => void w.open()} />}
      {trace.withdrawnAt && (trace.canPublish || trace.canCorrect) && <WithdrawalNoticesPanel lotId={lotId} refreshKey={trace.withdrawnAt} />}
      {w.preview && <WithdrawDialog preview={w.preview} result={w.result} pending={w.submitting.pending} uncertain={w.submitting.uncertain} error={w.submitting.error} onConfirm={(reason) => void w.confirm(reason)} onClose={w.close} />}
      {d.check && <PublishDialog check={d.check} pending={d.publishing.pending} error={d.publishing.error} onConfirm={() => void d.confirmPublish()} onClose={d.closePublish} />}
    </div>
  );
}
