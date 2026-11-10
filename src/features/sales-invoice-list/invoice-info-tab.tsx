"use client";
import Link from "next/link";
import { customerHref } from "@/features/customers/customer-links";
import q from "@/features/quality-claims/frame-kit.module.css";
import type { InvoiceDetail } from "./invoice-list-contracts";
import { dateTimeText, num, paymentTerm, priceSource, vnd } from "./invoice-labels";
import s from "./invoice-list.module.css";

/** Chỉ cho mở liên kết http(s): đường dẫn QR đến từ backend nhưng vẫn kiểm tra trước khi đặt vào href. */
export function safeUrl(value: string | null): string | undefined {
  try { const url = new URL(value ?? ""); return url.protocol === "https:" || url.protocol === "http:" ? url.href : undefined; } catch { return undefined; }
}

/** Tab "Thông tin": đầu hóa đơn, các dòng hàng, tổng hợp tiền, ảnh hưởng đến công nợ và liên kết QR truy xuất nếu có. */
export function InvoiceInfoTab({ invoice }: { invoice: InvoiceDetail }) {
  const qr = safeUrl(invoice.qrUrl), debt = invoice.debtEffect;
  return (
    <>
      <dl className={q.kv}>
        <div><dt>Thời gian</dt><dd>{dateTimeText(invoice.invoicedAt)}</dd></div>
        <div><dt>Khách hàng</dt><dd>{invoice.customer?.code ? <Link href={customerHref(invoice.customer.code)}>{invoice.customer.name}</Link> : invoice.customer?.name ?? "Khách lẻ"}</dd></div>
        <div><dt>Số điện thoại</dt><dd>{invoice.customer?.phoneNumber ?? "—"}</dd></div>
        <div><dt>Hình thức thanh toán</dt><dd>{paymentTerm(invoice.paymentTerm)}</dd></div>
        <div><dt>Người lập</dt><dd>{invoice.createdBy.name || "—"}</dd></div>
      </dl>
      <div className={q.tableWrap} style={{ position: "relative" }}>
        <table className={q.table} aria-label="Dòng hàng của hóa đơn">
          <thead><tr><th scope="col">Sản phẩm</th><th scope="col">Lô thu hoạch</th><th scope="col" className={q.num}>kg</th><th scope="col" className={q.num}>Đơn giá</th><th scope="col">Nguồn giá</th><th scope="col" className={q.num}>Thành tiền</th></tr></thead>
          <tbody>{invoice.lines.map((line) => (
            <tr key={line.id}>
              <td>{line.productName}</td><td>{line.lotCode}</td><td className={q.num}>{num(line.kg)}</td><td className={q.num}>{vnd(line.unitPrice)}</td>
              <td>{priceSource(line.priceSource)}</td><td className={q.num}>{vnd(line.amount)}</td>
            </tr>))}
          </tbody>
        </table>
      </div>
      <div className={s.sums} role="group" aria-label="Tổng hợp hóa đơn">
        <div><span>Tổng khối lượng</span><span>{num(invoice.totalKg)} kg</span></div>
        <div><span>Tiền hàng</span><span>{vnd(invoice.subtotal)}</span></div>
        <div><span>Giảm giá</span><span>{vnd(invoice.discount)}</span></div>
        <div><span>Thu khác</span><span>{vnd(invoice.otherCharges)}</span></div>
        <div><span>Giảm giá sau khiếu nại</span><span>{invoice.priceCutTotal > 0 ? vnd(invoice.priceCutTotal) : "—"}</span></div>
        <div className={s.total}><span>Tổng cộng</span><span>{vnd(invoice.total)}</span></div>
        {debt && invoice.statusId === 3501 && <><div><span>Đã thanh toán</span><span>{vnd(debt.covered)}</span></div><div><span>Còn phải thu</span><span>{vnd(debt.unpaid)}</span></div></>}
      </div>
      {invoice.statusId === 3502 && <p className={s.warning} role="note">Hóa đơn đã hủy{invoice.cancelledAt ? ` lúc ${dateTimeText(invoice.cancelledAt)}` : ""}{invoice.cancelReason ? `. Lý do: ${invoice.cancelReason}` : ""}.</p>}
      {qr && <p className={s.muted}><a className={s.linkButton} href={qr} target="_blank" rel="noopener noreferrer">Mở trang truy xuất nguồn gốc của hóa đơn (mã QR)</a></p>}
    </>
  );
}
