import Link from "next/link";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import { StatusPill } from "@/components/ui/management-page";
import type { CorrectionMark, LotTrace } from "./contracts";
import { describeGap, formatDateTime, formatDay, formatNumber } from "./trace-format";
import s from "./lot-tracing.module.css";

export function Marks({ marks }: { marks: CorrectionMark[] }) {
  return <>{marks.map((m) => <span key={`${m.correctedAt}-${m.reason}`} className={s.mark}>Đã sửa {formatDateTime(m.correctedAt)}{m.actorName ? ` bởi ${m.actorName}` : ""}{m.reason ? `: ${m.reason}` : ""}</span>)}</>;
}

/** Truy xuất ngược (TRACE-02 bước 2-3): bè, chu kỳ, từng làn của lô với mọi phiên thả giống, lô giống, phiếu nhập và nhà cung cấp. Chỗ thiếu được nêu rõ, không tự điền. */
export function TraceBackwardPanel({ trace }: { trace: LotTrace }) {
  return (
    <section className={s.card} aria-labelledby="backward-title">
      <div className={s.cardHead}><h2 id="backward-title">Truy xuất ngược</h2></div>
      <p className={s.sub}>Bè <Link href={farmingReferenceHref("raft", { zoneId: trace.zoneId, recordId: trace.raftId, search: trace.raftCode })}>{trace.raftCode}</Link> · Vùng nuôi <Link href={farmingReferenceHref("zone", { recordId: trace.zoneId, search: trace.zoneCode })}>{trace.zoneCode}</Link> · <Link href={farmingReferenceHref("cycle", { zoneId: trace.zoneId, raftId: trace.raftId, cycleId: trace.cycleId })}>Chu kỳ {formatDay(trace.cycleStartDate)} – {formatDay(trace.cycleCloseDate)}</Link></p>
      {trace.missing.length > 0 && (
        <div role="alert" className={s.warn}>
          <strong>Truy xuất ngược còn thiếu dữ liệu:</strong>
          <ul>{trace.missing.map((gap) => <li key={`${gap.kind}-${gap.laneNumber}-${gap.zoneCode}`}>{describeGap(gap)}</li>)}</ul>
          <span>Hệ thống không tự điền chỗ thiếu. Hãy bổ sung ở Thả giống hoặc Phiếu nhập, hoặc dùng Sửa dữ liệu truy xuất.</span>
        </div>
      )}
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead><tr><th scope="col">Làn của lô</th><th scope="col">Ngày thả giống</th><th scope="col">Lô giống</th><th scope="col">Phiếu nhập</th><th scope="col">Nhà cung cấp</th><th scope="col">Ghi chú</th></tr></thead>
          <tbody>
            {trace.lanes.flatMap((lane) => lane.seedings.length ? lane.seedings.map((row, index) => (
              <tr key={`${lane.laneNumber}-${row.seedingRecordId}`}>
                <th scope="row">Làn {lane.laneNumber}{index === 0 && lane.isFinished ? <div className={s.muted}>Đã thu xong</div> : null}</th>
                <td><Link href={farmingReferenceHref("seeding", { zoneId: trace.zoneId, raftId: trace.raftId, cycleId: trace.cycleId, recordId: row.seedingRecordId })}>{formatDay(row.seedingDate)}</Link></td>
                <td><Link href={farmingReferenceHref("seeding", { zoneId: trace.zoneId, raftId: trace.raftId, cycleId: trace.cycleId, recordId: row.seedingRecordId })}>{row.seedLot.itemName ?? "Lô giống"} · {row.seedLot.code}</Link><div className={s.muted}>{formatNumber(row.quantity)}</div></td>
                <td><Link href={farmingReferenceHref("purchaseReceipt", { code: row.seedLot.receiptCode })}>{row.seedLot.receiptCode}</Link><div className={s.muted}>{formatDay(row.seedLot.receivedDate)}</div></td>
                <td>{row.seedLot.supplierName}</td>
                <td>{!row.onCompletedReceipt && <StatusPill tone="danger">Phiếu nhập chưa hoàn thành</StatusPill>}<Marks marks={row.corrections} /></td>
              </tr>
            )) : [(
              <tr key={lane.laneNumber}><th scope="row">Làn {lane.laneNumber}</th><td colSpan={5} className={s.error}>Chưa có phiên thả giống trong chu kỳ này.</td></tr>
            )])}
          </tbody>
        </table>
      </div>
    </section>
  );
}
