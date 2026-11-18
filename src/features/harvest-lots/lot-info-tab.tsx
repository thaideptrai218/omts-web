"use client";
import Link from "next/link";
import type { z } from "zod";
import type { harvestDetail } from "@/features/cultivation-api/records-contracts";
import { invoiceHref } from "@/features/customers/customer-links";
import { cycleJourneyLink, nurseryLink } from "@/features/farming-management/entity-links";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import { PlanRefLink } from "@/features/harvest-plans/plan-ref-link";
import { lotHref, productHref } from "@/features/products/product-helpers";
import { fmt, viDate, viDateTime } from "@/features/purchase-documents/document-parts";
import styles from "@/features/purchase-documents/purchases.module.css";
import { orderHref } from "@/features/sales-orders/order-labels";
import { LOT } from "./contracts";
import { LotStatus, closeReasonLabel } from "./lot-labels";

type Lot = z.infer<typeof harvestDetail>;
const dash = (value: string | null | undefined) => value || "—";

/** One row of the line table: the product line (or, for a lot without lines, the product of its ledger) with what was sold of it and what is left. */
type Row = { key: string; productCode: string; productName: string; cages: number | null; estimatedKg: number | null; weighedKg: number | null | undefined; soldKg: number | null; remainingKg: number | null };

/** The rows by product line, each joined to the ledger balance of its product; a lot whose lines are not given falls back to the ledger rows. */
export function lotRows(lot: Lot): Row[] {
  const stocks = new Map(lot.productStocks.map((stock) => [stock.productId, stock]));
  // A lot waiting for its weighing has zeros in the ledger: it shows the estimate as what is there to sell. Net sold is the gross sale minus what came back.
  const awaiting = lot.statusId === LOT.awaitingWeighing;
  if (lot.productLines.length) {
    return lot.productLines.map((line, index) => {
      const stock = stocks.get(line.productId);
      return { key: `${line.productId}-${index}`, productCode: line.productCode, productName: line.productName, cages: line.cageCount, estimatedKg: line.kg, weighedKg: line.weighedKg,
        soldKg: awaiting ? 0 : stock ? stock.soldKg - stock.returnedKg : null, remainingKg: awaiting ? line.kg : stock?.remainingKg ?? null };
    });
  }
  return lot.productStocks.map((stock) => ({ key: stock.productId, productCode: stock.productCode, productName: stock.productName, cages: null, estimatedKg: stock.harvestedKg, weighedKg: null, soldKg: stock.soldKg - stock.returnedKg, remainingKg: stock.remainingKg }));
}

/**
 * Tab "Thông tin", laid out like the invoice row: the lot and its status, the facts in three columns with links to the documents around the lot, the product lines with what was sold of each,
 * then the sums of the lot. The buttons are in the footer of the tab (lot-actions).
 */
export function LotInfoTab({ lot }: { lot: Lot }) {
  const references = lot.references, figures = lot.figures, awaiting = lot.statusId === LOT.awaitingWeighing, closed = lot.statusId === LOT.closed;
  const journey = cycleJourneyLink({ zoneId: lot.zoneId, raftId: lot.raftId, cycleId: lot.cycleId }), nursery = references.nurseryBatch ? nurseryLink(references.nurseryBatch.code, lot.zoneId) : undefined;
  const seedLots = references.seedLots.filter((seed, index, all) => all.findIndex((other) => other.receiptCode === seed.receiptCode && other.seedLotCode === seed.seedLotCode) === index);
  const rows = lotRows(lot);
  return <>
    <header className={styles.head}>
      <div><h3>{lot.lotCode}</h3><LotStatus statusId={lot.statusId} status={lot.status} />{awaiting && <small>Chưa cân: lô chỉ được bán sau khi cân.</small>}
        {closed && references.closedByInvoice && <small>Đóng bởi hóa đơn <Link className={styles.link} href={invoiceHref(references.closedByInvoice.code)}>{references.closedByInvoice.code}</Link></small>}</div>
    </header>
    <div className={styles.headFacts}>
      <div><span>Thời gian thu:</span><strong>{viDateTime(lot.harvestedAt)}</strong></div>
      <div><span>Thời gian cân:</span><strong>{lot.weighedAt ? `${viDateTime(lot.weighedAt)}${lot.weighedByName ? ` · ${lot.weighedByName}` : ""}` : "Chưa cân"}</strong></div>
      <div><span>Người ghi:</span><strong>{dash(lot.recordedByName)}</strong></div>
      <div><span>Vùng:</span><Link className={styles.link} href={farmingReferenceHref("zone", { recordId: lot.zoneId, search: lot.zoneCode })}>{lot.zoneCode}</Link></div>
      <div><span>Bè:</span><Link className={styles.link} href={farmingReferenceHref("raft", { zoneId: lot.zoneId, recordId: lot.raftId, search: lot.raftCode })}>{lot.raftCode}</Link></div>
      <div><span>Chu kỳ:</span>{journey ? <Link className={styles.link} href={journey}>Hành trình chu kỳ</Link> : <strong>—</strong>}</div>
      <div><span>Lô giống:</span>{seedLots.length ? <span className={styles.codeList}>{seedLots.map((seed) => <Link key={`${seed.receiptId}-${seed.seedLotCode}-${seed.lineNumber}`} className={styles.link} href={farmingReferenceHref("purchaseReceipt", { code: seed.receiptCode })}
        title={[`Phiếu nhập ${seed.receiptCode}`, seed.itemName].filter(Boolean).join(" · ")}>{seed.seedLotCode || seed.receiptCode}</Link>)}</span> : <strong>—</strong>}</div>
      <div><span>Mẻ ươm:</span>{references.nurseryBatch ? nursery ? <Link className={styles.link} href={nursery}>{references.nurseryBatch.code}</Link> : <strong>{references.nurseryBatch.code}</strong> : <strong>—</strong>}</div>
      <div><span>KHT:</span>{lot.harvestPlan ? <PlanRefLink className={styles.link} code={lot.harvestPlan.code} /> : <strong>—</strong>}</div>
      <div><span>Đơn đặt hàng:</span>{references.salesOrders.length ? <span className={styles.codeList}>{references.salesOrders.map((order) => <Link key={order.id} className={styles.link} href={orderHref(order.code)}>{order.code}</Link>)}</span> : <strong>—</strong>}</div>
      {closed && <div><span>Đóng:</span><strong>{[lot.closeDate ? viDate(lot.closeDate) : null, lot.closeReason ? closeReasonLabel[lot.closeReason] ?? lot.closeReason : null, lot.leftoverKg ? `còn ${fmt(lot.leftoverKg)} kg` : null].filter(Boolean).join(" · ") || "—"}</strong></div>}
      {lot.reopenedOn && <div><span>Mở lại ngày:</span><strong>{viDate(lot.reopenedOn)}</strong></div>}
      <div><span>Truy xuất:</span><Link className={styles.link} href={lotHref(lot.lotCode)}>Truy xuất lô</Link></div>
    </div>
    <div className={styles.innerScroll}><table className={styles.inner} aria-label="Dòng sản phẩm của lô"><thead><tr><th>Sản phẩm</th><th className={styles.num}>Lồng</th><th className={styles.num}>Kg cân</th><th className={styles.num}>Đã bán</th><th className={styles.num}>Còn lại</th></tr></thead>
      <tbody>{rows.map((row) => <tr key={row.key}>
        <td><Link className={styles.link} href={productHref(row.productCode)}>{row.productName}</Link><span className={styles.sub}>{row.productCode}</span></td>
        <td className={styles.num}>{fmt(row.cages)}</td><td className={styles.num}>{row.weighedKg == null ? awaiting ? "Chờ cân" : "—" : fmt(row.weighedKg)}</td>
        <td className={styles.num}>{awaiting && row.weighedKg == null ? "—" : fmt(row.soldKg)}</td><td className={styles.num}>{awaiting && row.weighedKg == null ? "—" : fmt(row.remainingKg)}</td></tr>)}
      {!rows.length && <tr><td colSpan={5} className={styles.empty}>Lô chưa có dòng sản phẩm.</td></tr>}</tbody></table></div>
    <div className={styles.foot}>
      <p className={styles.noteBox}>{figures.notFinal ? "Số liệu chưa chốt vì lô còn đang bán." : "Số liệu đã chốt: lô không còn bán."}</p>
      <div className={styles.sums}>
        <div><span>Cân thực tế</span><span>{lot.weighedKg == null ? "Chưa cân" : `${fmt(lot.weighedKg)} kg`}</span></div>
        <div><span>Đã bán</span><span>{fmt(figures.soldKg)} kg</span></div>
        <div><span>Trả lại</span><span>{fmt(figures.returnedKg)} kg</span></div>
        <div><span>Hao hụt</span><span>{fmt(figures.lostKg)} kg</span></div>
        <div className={styles.strong}><span>Còn lại</span><span>{fmt(figures.remainingKg)} kg</span></div>
        {!figures.notFinal && <div><span>Chênh lệch</span><span>{fmt(figures.differenceKg)} kg</span></div>}
      </div>
    </div>
  </>;
}
