"use client";
import { fmt, viDate, viDateTime } from "@/features/purchase-documents/document-parts";
import styles from "@/features/purchase-documents/purchases.module.css";
import type { InvoiceDetail } from "./invoice-list-contracts";
import { correctionKind, paymentKind, paymentMethod, sendingChannel } from "./invoice-labels";
import { DeliveryStatus, INVOICE, PaymentStatus } from "./invoice-status";

/** Tab "Lịch sử thanh toán": các khoản khách đã trả cho hóa đơn (và khoản trả lại), cùng số còn phải thu. */
export function InvoicePaymentsTab({ invoice }: { invoice: InvoiceDetail }) {
  const debt = invoice.debtEffect;
  if (!invoice.payments.length) return <p className={styles.empty}>Hóa đơn này chưa có khoản thanh toán nào.</p>;
  return <>
    <div className={styles.innerScroll}><table className={styles.inner} aria-label="Thanh toán của hóa đơn"><thead><tr><th>Mã phiếu</th><th>Ngày</th><th>Người thu</th><th>Phương thức</th><th>Loại</th><th>Trạng thái</th><th className={styles.num}>Số tiền</th></tr></thead>
      <tbody>{invoice.payments.map((payment) => <tr key={payment.id}><td>{payment.code}</td><td>{viDate(payment.paymentDate)}</td><td>{payment.collectedBy?.name || "—"}</td><td>{paymentMethod(payment.method)}</td><td>{paymentKind(payment.kind)}</td>
        <td><PaymentStatus statusId={payment.statusId} /></td><td className={styles.num}>{payment.kind === "PaidBack" ? `−${fmt(payment.amount)}` : fmt(payment.amount)}</td></tr>)}</tbody></table></div>
    {debt && invoice.statusId === INVOICE.completed && <div className={styles.foot}><div />
      <div className={styles.sums}><div><span>Đã thanh toán</span><span>{fmt(debt.covered)}</span></div><div className={styles.strong}><span>Còn phải thu</span><span>{fmt(debt.unpaid)}</span></div></div></div>}
  </>;
}

/** Tab "Gửi hóa đơn": lịch sử các lần gửi tin cho khách (cũ nhất trước); nút Gửi lại nằm ở chân chi tiết hóa đơn. */
export function InvoiceSendingTab({ invoice }: { invoice: InvoiceDetail }) {
  if (!invoice.sendings.length) return <p className={styles.empty}>Hóa đơn chưa được gửi lần nào{invoice.customer ? "." : " (khách lẻ không có số điện thoại để nhận tin)."}</p>;
  return <div className={styles.innerScroll}><table className={styles.inner} aria-label="Lịch sử gửi hóa đơn"><thead><tr><th>Kênh</th><th>Số điện thoại</th><th>Trạng thái</th><th>Thời gian</th></tr></thead>
    <tbody>{invoice.sendings.map((item, index) => <tr key={`${item.channel}-${item.deliveryStatusAt ?? index}`}>
      <td>{sendingChannel(item.channel)}</td><td>{item.phoneNumber ?? "—"}</td>
      <td><DeliveryStatus statusId={item.deliveryStatusId} /></td>
      <td>{item.deliveryStatusAt ? viDateTime(item.deliveryStatusAt) : "—"}</td></tr>)}</tbody></table></div>;
}

/** Tab "Lịch sử chỉnh sửa": mỗi lần sửa (ngày, loại, lý do, tổng trước → sau) và các khoản giảm giá sau khiếu nại. Nút ghi giảm giá nằm ở chân chi tiết. */
export function InvoiceHistoryTab({ invoice }: { invoice: InvoiceDetail }) {
  return <>
    {!invoice.corrections?.length ? <p className={styles.empty}>Hóa đơn này chưa được chỉnh sửa lần nào.</p>
      : <div className={styles.innerScroll}><table className={styles.inner} aria-label="Lịch sử chỉnh sửa hóa đơn"><thead><tr><th>Ngày</th><th>Loại sửa</th><th>Lý do</th><th className={styles.num}>Tổng trước → sau</th></tr></thead>
        <tbody>{invoice.corrections.map((item, index) => <tr key={`${item.date}-${index}`}><td>{viDate(item.date)}</td><td>{correctionKind(item.kind)}</td><td>{item.reason ?? "—"}</td><td className={styles.num}>{fmt(item.totalBefore)} → {fmt(item.totalAfter)}</td></tr>)}</tbody></table></div>}
    {invoice.priceCuts.length > 0 && <p className={styles.hint}>Giảm giá sau khiếu nại: {invoice.priceCuts.map((cut) => `${fmt(cut.amount)} ngày ${viDate(cut.cutDate)}`).join("; ")}.</p>}
  </>;
}
