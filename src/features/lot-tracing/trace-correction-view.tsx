"use client";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/management-page";
import { createOperationsRepository } from "@/features/operations/repository";
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import { correctionCycles } from "./correction-contracts";
import { CycleRecordsPanel } from "./cycle-records-panel";
import { cycleStatusLabel, formatDay } from "./trace-format";
import s from "./lot-tracing.module.css";

const repo = createOperationsRepository("lot-tracing");

/** SCR-TRACE-02 Sửa dữ liệu truy xuất: chu kỳ của bè (mới nhất trước), chọn một chu kỳ để xem bản ghi sửa được. */
export function TraceCorrectionView({ raftId, cycleId, onBack }: { raftId: string; cycleId?: string; onBack(): void }) {
  const cycles = useRemote(useCallback((signal: AbortSignal) => repo.read("cycles", { id: raftId }, correctionCycles, signal), [raftId]));
  const [chosen, setChosen] = useState<string | undefined>(cycleId);
  return (
    <div className={s.stack}>
      <div><Button className="w-auto" variant="secondary" onClick={onBack}>← Quay lại truy xuất lô</Button></div>
      {cycles.loading && <Skeleton />}
      {cycles.error && <div><ErrorNotice error={cycles.error} /><Button className="w-auto" variant="secondary" onClick={cycles.reload}>Tải lại</Button></div>}
      {cycles.data && (
        <section className={s.card} aria-labelledby="cycles-title">
          <div className={s.cardHead}><h2 id="cycles-title">Chu kỳ của bè {cycles.data.raftCode}</h2><span className={s.muted}>{cycles.data.cycles.length} chu kỳ</span></div>
          {!cycles.data.cycles.length ? <p className={s.empty}>Bè này chưa có chu kỳ nuôi nào.</p> : (
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead><tr><th scope="col">Ngày bắt đầu</th><th scope="col">Ngày đóng</th><th scope="col">Trạng thái</th><th scope="col"><span className="sr-only">Mở</span></th></tr></thead>
                <tbody>
                  {cycles.data.cycles.map((c) => (
                    <tr key={c.id} className={chosen === c.id ? s.selectedRow : undefined}>
                      <td>{formatDay(c.startDate)}</td><td>{formatDay(c.closeDate)}</td>
                      <td><StatusPill tone={c.closeDate ? "neutral" : "success"}>{cycleStatusLabel(c.status)}</StatusPill></td>
                      <td className={s.right}><Button className="w-auto" variant={chosen === c.id ? "primary" : "secondary"} aria-pressed={chosen === c.id} onClick={() => setChosen(c.id)}>Xem bản ghi</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
      {chosen && <CycleRecordsPanel key={chosen} cycleId={chosen} raftId={raftId} />}
    </div>
  );
}
