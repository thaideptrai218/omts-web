import Link from "next/link";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import { StatusPill } from "@/components/ui/management-page";
import type { CorrectionMark, LotTrace } from "./contracts";
import { describeGap, formatDateTime, formatDay, formatNumber } from "./trace-format";
import s from "./lot-tracing.module.css";

export function Marks({ marks }: { marks: CorrectionMark[] }) {
  return <>{marks.map((m) => <span key={`${m.correctedAt}-${m.reason}`} className={s.mark}>Đã sửa {formatDateTime(m.correctedAt)}{m.actorName ? ` bởi ${m.actorName}` : ""}{m.reason ? `: ${m.reason}` : ""}</span>)}</>;
}

type Seeding = LotTrace["lanes"][number]["seedings"][number];

/** Một phiên thả giống có thể phủ nhiều làn của lô: gộp theo phiên để hiện một lần với danh sách làn, theo ngày thả rồi theo làn đầu tiên. */
function sessionsOf(trace: LotTrace) {
  const bySession = new Map<string, { row: Seeding; lanes: { laneNumber: number; isFinished: boolean }[] }>();
  for (const lane of trace.lanes) for (const row of lane.seedings) {
    const entry = bySession.get(row.seedingRecordId) ?? { row, lanes: [] };
    entry.lanes.push({ laneNumber: lane.laneNumber, isFinished: lane.isFinished });
    bySession.set(row.seedingRecordId, entry);
  }
  return [...bySession.values()].sort((a, b) => a.row.seedingDate.localeCompare(b.row.seedingDate) || a.lanes[0].laneNumber - b.lanes[0].laneNumber);
}

/** Truy xuất ngược (TRACE-02 bước 2-3): bè, chu kỳ, từng làn của lô với mọi phiên thả giống, lô giống, phiếu nhập và nhà cung cấp. Chỗ thiếu được nêu rõ, không tự điền. */
export function TraceBackwardPanel({ trace }: { trace: LotTrace }) {
  return (
    <section id="trace-backward" className={s.card} aria-labelledby="backward-title">
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
            {sessionsOf(trace).map(({ row, lanes }) => (
              <tr key={row.seedingRecordId}>
                <th scope="row">Làn {lanes.map((l) => l.laneNumber).join(", ")}{lanes.some((l) => l.isFinished) ? <div className={s.muted}>Đã thu xong: làn {lanes.filter((l) => l.isFinished).map((l) => l.laneNumber).join(", ")}</div> : null}</th>
                <td><Link href={farmingReferenceHref("seeding", { zoneId: trace.zoneId, raftId: trace.raftId, cycleId: trace.cycleId, recordId: row.seedingRecordId })}>{formatDay(row.seedingDate)}</Link></td>
                {/* Số lượng của phiên là của cả phiên (mọi làn của nó), chỉ ghi một lần. */}
                <td><Link href={farmingReferenceHref("seeding", { zoneId: trace.zoneId, raftId: trace.raftId, cycleId: trace.cycleId, recordId: row.seedingRecordId })}>{row.seedLot.itemName ?? "Lô giống"} · {row.seedLot.code}</Link><div className={s.muted}>{formatNumber(row.quantity)}{lanes.length > 1 ? ` (cả phiên, ${lanes.length} làn)` : ""}</div></td>
                <td><Link href={farmingReferenceHref("purchaseReceipt", { code: row.seedLot.receiptCode })}>{row.seedLot.receiptCode}</Link><div className={s.muted}>{formatDay(row.seedLot.receivedDate)}</div></td>
                <td>{row.seedLot.supplierName}</td>
                <td>{!row.onCompletedReceipt && <StatusPill tone="danger">Phiếu nhập chưa hoàn thành</StatusPill>}<Marks marks={row.corrections} /></td>
              </tr>
            ))}
            {trace.lanes.filter((lane) => !lane.seedings.length).map((lane) => (
              <tr key={`missing-${lane.laneNumber}`}><th scope="row">Làn {lane.laneNumber}</th><td colSpan={5} className={s.error}>Chưa có phiên thả giống trong chu kỳ này.</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
