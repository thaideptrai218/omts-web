"use client";
import Link from "next/link";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import { lotsHref, lotStatusText } from "@/features/harvest-lots/lot-labels";
import { returnHref } from "@/features/input-items/stock-kind";
import { nurseryStatus } from "@/features/nursery-api/contracts";
import { fmt, viDate, viDateTime } from "@/features/purchase-documents/document-parts";
import styles from "@/features/purchase-documents/purchases.module.css";
import { returnStatusLabel } from "@/features/purchase-documents/types";
import type { SeedLotDetail } from "./contracts";
import { cycleFromBatchHref, SeedLotFooter, useCanStartCycle } from "./seed-lot-actions";
import { HistoryOrderToggle, sortHistory, useHistoryOrder } from "@/features/history/history-order";
import { seedLotTimeline } from "./seed-lot-timeline";

/** A nursery batch that is finished (Chờ thả): its pieces wait in the pool to be hung. */
const NURSERY_DONE = 4002;

const when = (value: string | null | undefined) => value ? value.length > 10 ? viDateTime(value) : viDate(value) : "—";
const issueHref = (kind: string, code: string) => `${kind === "Disposal" ? "/inputs/disposals" : "/inputs/uses"}?code=${encodeURIComponent(code)}`;

/** Tab "Ươm": the nursery batches made from the lot, with the pieces that went in and the survivors. The footer starts a new batch with the lot chosen. */
export function SeedLotNurseryTab({ lot }: { lot: SeedLotDetail }) {
  const mayStart = useCanStartCycle();
  return <>
    {!lot.nurseryBatches.length ? <p className={styles.empty}>Lô chưa được ươm.</p>
      : <div className={styles.innerScroll}><table className={styles.inner} aria-label="Đợt ươm của lô giống"><thead><tr><th>Đợt ươm</th><th>Ngày bắt đầu</th><th>Trạng thái</th><th className={styles.num}>Số lượng vào ươm</th><th className={styles.num}>Sống sót</th><th /></tr></thead>
        <tbody>{lot.nurseryBatches.map((batch) => <tr key={batch.id}>
          <td><Link className={styles.link} href={farmingReferenceHref("nursery", { code: batch.code })}>{batch.code}</Link></td><td>{when(batch.startDate)}</td><td>{nurseryStatus(batch.statusId)}</td>
          <td className={styles.num}>{fmt(batch.quantityIn)}</td><td className={styles.num}>{fmt(batch.survivors)}</td>
          {/* A finished batch is hung on a raft by starting a cycle from it. */}
          <td>{batch.statusId === NURSERY_DONE && mayStart && <Link className={styles.link} href={cycleFromBatchHref(batch.id)}>Thả giống</Link>}</td></tr>)}</tbody></table></div>}
    <SeedLotFooter lot={lot} show={["nurse"]} />
  </>;
}

/** Tab "Treo": the seedings of the lot, the cycles they started and the harvest lots those cycles gave. Seed is hung from a finished nursery batch (tab "Ươm"), never straight from the lot. */
export function SeedLotSeedingTab({ lot }: { lot: SeedLotDetail }) {
  const empty = !lot.seedings.length && !lot.cycles.length && !lot.harvestLots.length;
  return <>
    {empty && <p className={styles.empty}>Lô chưa được thả giống. Giống phải ươm trước: thả giống từ đợt ươm đang Chờ thả ở tab Ươm.</p>}
    {lot.seedings.length > 0 && <div className={styles.innerScroll}><table className={styles.inner} aria-label="Lần thả giống của lô"><thead><tr><th>Ngày thả</th><th>Bè</th><th>Vùng</th><th className={styles.num}>Số lượng ({lot.unitName})</th></tr></thead>
      <tbody>{lot.seedings.map((seeding) => <tr key={seeding.id}><td>{when(seeding.seededAt)}</td>
        <td>{seeding.raftCode ? <Link className={styles.link} href={farmingReferenceHref("seeding", { search: seeding.raftCode })}>{seeding.raftCode}</Link> : "—"}</td>
        <td>{seeding.zoneCode ? <Link className={styles.link} href={farmingReferenceHref("zone", { search: seeding.zoneCode })}>{seeding.zoneCode}</Link> : "—"}</td>
        <td className={styles.num}>{fmt(seeding.quantity)}</td></tr>)}</tbody></table></div>}
    {lot.cycles.length > 0 && <div className={styles.innerScroll}><table className={styles.inner} aria-label="Chu kỳ nuôi từ lô giống"><thead><tr><th>Bè</th><th>Vùng</th><th>Sản phẩm</th></tr></thead>
      <tbody>{lot.cycles.map((cycle) => <tr key={cycle.id}>
        <td>{cycle.raftCode ? <Link className={styles.link} href={farmingReferenceHref("cycle", { search: cycle.raftCode })}>{cycle.raftCode}</Link> : "—"}</td>
        <td>{cycle.zoneCode ?? "—"}</td><td>{cycle.productCode ?? "—"}</td></tr>)}</tbody></table></div>}
    {lot.harvestLots.length > 0 && <div className={styles.innerScroll}><table className={styles.inner} aria-label="Lô thu hoạch từ lô giống"><thead><tr><th>Lô thu hoạch</th><th>Trạng thái</th><th className={styles.num}>Kg ước tính</th><th className={styles.num}>Kg cân</th></tr></thead>
      <tbody>{lot.harvestLots.map((harvest) => <tr key={harvest.id}><td><Link className={styles.link} href={lotsHref(harvest.lotCode)}>{harvest.lotCode}</Link></td><td>{lotStatusText(harvest.statusId)}</td>
        <td className={styles.num}>{fmt(harvest.estimatedKg)}</td><td className={styles.num}>{fmt(harvest.weighedKg)}</td></tr>)}</tbody></table></div>}
  </>;
}

/** Tab "Trả hàng": the returns to the supplier and the other issues (use, disposal) that took from the lot. The footer returns what is left. */
export function SeedLotReturnsTab({ lot }: { lot: SeedLotDetail }) {
  return <>
    {!lot.returns.length && !lot.issues.length && <p className={styles.empty}>Lô chưa có phiếu trả hay phiếu xuất nào.</p>}
    {lot.returns.length > 0 && <div className={styles.innerScroll}><table className={styles.inner} aria-label="Phiếu trả của lô giống"><thead><tr><th>Phiếu trả</th><th>Thời gian trả</th><th>Trạng thái</th><th className={styles.num}>Số lượng ({lot.unitName})</th></tr></thead>
      <tbody>{lot.returns.map((item) => <tr key={item.id}><td><Link className={styles.link} href={returnHref(item.code, "Seed")}>{item.code}</Link></td><td>{when(item.returnedAt)}</td>
        <td>{returnStatusLabel[item.statusId] ?? "—"}</td><td className={styles.num}>{fmt(item.quantity)}</td></tr>)}</tbody></table></div>}
    {lot.issues.length > 0 && <div className={styles.innerScroll}><table className={styles.inner} aria-label="Phiếu xuất của lô giống"><thead><tr><th>Phiếu xuất</th><th>Loại</th><th>Thời gian</th><th className={styles.num}>Số lượng ({lot.unitName})</th></tr></thead>
      <tbody>{lot.issues.map((item) => <tr key={item.id}><td><Link className={styles.link} href={issueHref(item.kind, item.code)}>{item.code}</Link></td><td>{item.kind === "Disposal" ? "Xuất hủy" : "Xuất dùng"}</td>
        <td>{when(item.issuedAt)}</td><td className={styles.num}>{fmt(item.quantity)}</td></tr>)}</tbody></table></div>}
    <SeedLotFooter lot={lot} show={["return"]} />
  </>;
}

/** Tab "Lịch sử": what happened to the lot, oldest first, made from the nursery batches, seedings, returns and issues of the lot. */
export function SeedLotHistoryTab({ lot }: { lot: SeedLotDetail }) {
  const [order, setOrder] = useHistoryOrder(), entries = sortHistory(seedLotTimeline(lot), entry => entry.at, order);
  return <><HistoryOrderToggle order={order} onChange={setOrder} /><ol aria-label="Lịch sử của lô giống" className="grid gap-2">{entries.map((entry) => <li key={entry.key} className="rounded-control border border-border bg-surface p-2 text-xs">
    <p><strong>{entry.title}</strong> · {when(entry.at)}</p>
    <p>{entry.href ? <Link className={styles.link} href={entry.href}>{entry.detail}</Link> : entry.detail}</p>
  </li>)}</ol></>;
}
