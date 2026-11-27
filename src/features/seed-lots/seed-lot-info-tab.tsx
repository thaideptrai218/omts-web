"use client";
import Link from "next/link";
import { itemHref, receiptHref } from "@/features/input-items/stock-kind";
import { productHref } from "@/features/products/product-helpers";
import { fmt, viDateTime } from "@/features/purchase-documents/document-parts";
import { supplierHref } from "@/features/purchase-documents/receipt-detail";
import styles from "@/features/purchase-documents/purchases.module.css";
import type { SeedLotDetail } from "./contracts";
import { SeedLotFooter } from "./seed-lot-actions";
import { SeedLotSummary } from "./seed-lot-progress";

/** The figures of the lot in the order the lot lives: received, returned, in the nursery, lost in the nursery, seeded, issued otherwise, what is left. */
export const quantityRows = (lot: SeedLotDetail) => [
  { key: "received", label: "Nhập", value: lot.receivedQty }, { key: "returned", label: "Đã trả nhà cung cấp", value: lot.returnedQty },
  { key: "nursing", label: "Đang ươm", value: lot.nursingQty }, { key: "loss", label: "Hao hụt khi ươm", value: lot.nurseryLossQty },
  { key: "seeded", label: "Đã thả", value: lot.seededQty }, { key: "issued", label: "Xuất khác", value: lot.issuedOtherQty },
  { key: "remaining", label: "Còn lại", value: lot.remainingQty },
] as const;

/**
 * Tab "Thông tin", laid out like the invoice row: the lot and its usage chips (quantities, no derived state), the facts in three columns with links to the receipt, the supplier, the seed and the product,
 * the quantity breakdown, then the sums. The footer holds the actions that fit a lot with something left.
 */
export function SeedLotInfoTab({ lot }: { lot: SeedLotDetail }) {
  const share = (value: number) => lot.receivedQty > 0 ? `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(value / lot.receivedQty * 100)}%` : "—";
  return <>
    <header className={styles.head}><div><h3>{lot.seedLotCode}</h3></div></header>
    <SeedLotSummary lot={lot} />
    <div className={styles.headFacts}>
      <div><span>Phiếu nhập:</span><Link className={styles.link} href={receiptHref(lot.receiptCode, "Seed")}>{lot.receiptCode}</Link></div>
      <div><span>Ngày nhập:</span><strong>{viDateTime(lot.receivedAt)}</strong></div>
      <div><span>Nhà cung cấp:</span><Link className={styles.link} href={supplierHref({ supplier: lot.supplier })}>{lot.supplier.name}</Link></div>
      <div><span>Giống:</span>{lot.item.code ? <Link className={styles.link} href={itemHref(lot.item.code, "Seed")}>{lot.item.name}</Link> : <strong>{lot.item.name}</strong>}</div>
      <div><span>Loại hàu:</span>{lot.product?.code ? <Link className={styles.link} href={productHref(lot.product.code)}>{lot.product.name}</Link> : <strong>{lot.product?.name ?? "—"}</strong>}</div>
      <div><span>Dùng gần nhất:</span><strong>{lot.lastUsedAt ? viDateTime(lot.lastUsedAt) : "Chưa dùng"}</strong></div>
    </div>
    <div className={styles.innerScroll}><table className={styles.inner} aria-label="Số lượng của lô giống"><thead><tr><th>Chỉ tiêu</th><th className={styles.num}>Số lượng ({lot.unitName})</th><th className={styles.num}>Tỉ lệ so với số nhập</th></tr></thead>
      <tbody>{quantityRows(lot).map((row) => <tr key={row.key}><td>{row.label}</td><td className={styles.num}>{fmt(row.value)}</td><td className={styles.num}>{share(row.value)}</td></tr>)}</tbody></table></div>
    <div className={styles.foot}>
      <p className={styles.noteBox}>Số liệu thu hoạch và đã bán tính từ các chu kỳ nuôi của lô{lot.figuresEstimated ? "; ước tính vì chu kỳ dùng nhiều lô hoặc lô thu hoạch chưa cân" : ""}.</p>
      <div className={styles.sums}>
        <div><span>Nhập</span><span>{fmt(lot.receivedQty)} {lot.unitName}</span></div>
        <div><span>Đã thả</span><span>{fmt(lot.seededQty)} {lot.unitName}</span></div>
        <div className={styles.strong}><span>Còn lại</span><span>{fmt(lot.remainingQty)} {lot.unitName}</span></div>
      </div>
    </div>
    <SeedLotFooter lot={lot} show={["nurse", "return"]} />
  </>;
}
