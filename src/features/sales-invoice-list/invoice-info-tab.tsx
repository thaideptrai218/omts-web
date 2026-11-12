"use client";
import Link from "next/link";
import { useState } from "react";
import { customerHref } from "@/features/customers/customer-links";
import { fmt, viDateTime } from "@/features/purchase-documents/document-parts";
import styles from "@/features/purchase-documents/purchases.module.css";
import { orderHref } from "@/features/sales-orders/order-labels";
import type { InvoiceDetail } from "./invoice-list-contracts";
import { paymentTerm, priceSource } from "./invoice-labels";
import { INVOICE, InvoiceStatus } from "./invoice-status";

/** Chỉ cho mở liên kết http(s): đường dẫn QR đến từ backend nhưng vẫn kiểm tra trước khi đặt vào href. */
export function safeUrl(value: string | null): string | undefined {
  try { const url = new URL(value ?? ""); return url.protocol === "https:" || url.protocol === "http:" ? url.href : undefined; } catch { return undefined; }
}

/**
 * Tab "Thông tin", laid out like the purchase receipt row: the invoice and its status, the facts in three columns, the lines (searchable by name and lot),
 * then the note on the left and the money on the right. The invoice has no product code on its lines, so the search boxes are the name and the lot.
 */
export function InvoiceInfoTab({ invoice }: { invoice: InvoiceDetail }) {
  const [nameTerm, setNameTerm] = useState(""), [lotTerm, setLotTerm] = useState("");
  const qr = safeUrl(invoice.qrUrl), debt = invoice.debtEffect, customer = invoice.customer;
  const shown = invoice.lines.filter((line) => line.productName.toLowerCase().includes(nameTerm.trim().toLowerCase()) && line.lotCode.toLowerCase().includes(lotTerm.trim().toLowerCase()));
  return <>
    <header className={styles.head}><div><h3>{invoice.code}</h3><InvoiceStatus statusId={invoice.statusId} /></div></header>
    <div className={styles.headFacts}>
      <div><span>Thời gian:</span><strong>{viDateTime(invoice.invoicedAt)}</strong></div>
      <div><span>Khách hàng:</span>{customer?.code ? <span><Link className={styles.link} href={customerHref(customer.code)}>{customer.code}</Link> · {customer.name}</span> : <strong>{customer?.name ?? "Khách lẻ"}</strong>}</div>
      <div><span>Số điện thoại:</span><strong>{customer?.phoneNumber || "—"}</strong></div>
      <div><span>Vùng:</span><strong>{invoice.zone.code}</strong></div>
      <div><span>Đơn đặt hàng:</span>{invoice.salesOrder ? <Link className={styles.link} href={orderHref(invoice.salesOrder.code)}>{invoice.salesOrder.code}</Link> : <strong>—</strong>}</div>
      <div><span>Hình thức thanh toán:</span><strong>{paymentTerm(invoice.paymentTerm)}</strong></div>
      <div><span>Người lập:</span><strong>{invoice.createdBy.name || "—"}</strong></div>
      {qr && <div><span>Truy xuất:</span><a className={styles.link} href={qr} target="_blank" rel="noopener noreferrer">Trang nguồn gốc (mã QR)</a></div>}
      {invoice.statusId === INVOICE.cancelled && <div><span>Hủy lúc:</span><strong>{invoice.cancelledAt ? viDateTime(invoice.cancelledAt) : "—"}</strong></div>}
      {invoice.cancelReason && <div><span>Lý do hủy:</span><span className={styles.danger}>{invoice.cancelReason}</span></div>}
    </div>
    <div className={styles.innerScroll}><table className={styles.inner} aria-label="Dòng hàng của hóa đơn"><thead><tr><th>Tên hàng</th><th>Lô thu hoạch</th><th>Đơn vị</th><th className={styles.num}>Số lượng</th><th className={styles.num}>kg</th><th className={styles.num}>Đơn giá</th><th>Nguồn giá</th><th className={styles.num}>Thành tiền</th></tr></thead>
      <tbody>
        <tr className={styles.lineSearch}><td><input type="search" aria-label="Tìm tên hàng" placeholder="Tìm tên hàng" value={nameTerm} onChange={(event) => setNameTerm(event.target.value)} /></td><td style={{ width: 180 }}><input type="search" aria-label="Tìm mã lô" placeholder="Tìm mã lô" value={lotTerm} onChange={(event) => setLotTerm(event.target.value)} /></td><td colSpan={6} /></tr>
        {shown.map((line) => <tr key={line.id}>
          <td>{line.productName}</td><td>{line.lotCode}</td><td>{line.unit?.name ?? "kg"}</td><td className={styles.num}>{fmt(line.quantity ?? line.kg)}</td><td className={styles.num}>{fmt(line.kg)}</td><td className={styles.num}>{fmt(line.unitPrice)}</td>
          <td>{priceSource(line.priceSource)}</td><td className={styles.num}><strong>{fmt(line.amount)}</strong></td></tr>)}
        {!shown.length && <tr><td colSpan={8} className={styles.empty}>Không có dòng hàng phù hợp.</td></tr>}
      </tbody></table></div>
    <div className={styles.foot}>
      <textarea className={styles.noteEdit} aria-label="Ghi chú" placeholder="Ghi chú..." readOnly value={invoice.note ?? ""} />
      <div className={styles.sums}>
        <div><span>Tổng khối lượng</span><span>{fmt(invoice.totalKg)} kg</span></div>
        <div><span>Tổng tiền hàng ({invoice.lines.length})</span><span>{fmt(invoice.subtotal)}</span></div>
        <div><span>Giảm giá</span><span>{fmt(invoice.discount)}</span></div>
        <div><span>Chi phí khác</span><span>{fmt(invoice.otherCharges)}</span></div>
        {invoice.priceCutTotal > 0 && <div><span>Giảm giá sau khiếu nại</span><span>{fmt(invoice.priceCutTotal)}</span></div>}
        <div className={styles.strong}><span>Khách cần trả</span><span>{fmt(invoice.total)}</span></div>
        {debt && invoice.statusId === INVOICE.completed && <><div><span>Đã thanh toán</span><span>{fmt(debt.covered)}</span></div><div><span>Còn phải thu</span><span>{fmt(debt.unpaid)}</span></div></>}
      </div>
    </div>
  </>;
}
