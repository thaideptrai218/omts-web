"use client";
import q from "@/features/quality-claims/frame-kit.module.css";
import type { InvoiceDetail } from "./invoice-list-contracts";
import { dateText, dateTimeText, deliveryStatus, paymentKind, paymentMethod, paymentStatus, sendingChannel, vnd } from "./invoice-labels";
import s from "./invoice-list.module.css";

const wrap = { position: "relative" } as const;

/** Tab "Thanh toán": các khoản khách đã trả cho hóa đơn (và khoản trả lại), cùng số còn phải thu. */
export function InvoicePaymentsTab({ invoice }: { invoice: InvoiceDetail }) {
  const debt = invoice.debtEffect;
  if (!invoice.payments.length) return <p className={q.hint}>Hóa đơn này chưa có khoản thanh toán nào.</p>;
  return (
    <>
      <div className={q.tableWrap} style={wrap}>
        <table className={q.table} aria-label="Thanh toán của hóa đơn">
          <thead><tr><th scope="col">Mã</th><th scope="col">Hình thức</th><th scope="col">Loại</th><th scope="col">Ngày</th><th scope="col">Người thu</th><th scope="col">Trạng thái</th><th scope="col" className={q.num}>Số tiền</th></tr></thead>
          <tbody>{invoice.payments.map((p) => (
            <tr key={p.id}>
              <td>{p.code}</td><td>{paymentMethod(p.method)}</td><td>{paymentKind(p.kind)}</td><td>{dateText(p.paymentDate)}</td>
              <td>{p.collectedBy?.name || "—"}</td><td><span className={s.chip} data-tone={p.statusId === 3602 ? "good" : p.statusId === 3603 ? "bad" : "warn"}>{paymentStatus(p.statusId)}</span></td>
              <td className={q.num}>{p.kind === "PaidBack" ? `−${vnd(p.amount)}` : vnd(p.amount)}</td>
            </tr>))}
          </tbody>
        </table>
      </div>
      {debt && invoice.statusId === 3501 && <div className={s.sums}><div><span>Đã thanh toán</span><span>{vnd(debt.covered)}</span></div><div className={s.total}><span>Còn phải thu</span><span>{vnd(debt.unpaid)}</span></div></div>}
    </>
  );
}

/** Tab "Gửi hóa đơn": lịch sử các lần gửi tin cho khách (cũ nhất trước); nút Gửi lại nằm ở thanh thao tác của hóa đơn. */
export function InvoiceSendingTab({ invoice }: { invoice: InvoiceDetail }) {
  if (!invoice.sendings.length) return <p className={q.hint}>Hóa đơn chưa được gửi lần nào{invoice.customer ? "." : " (khách lẻ không có số điện thoại để nhận tin)."}</p>;
  return (
    <div className={q.tableWrap} style={wrap}>
      <table className={q.table} aria-label="Lịch sử gửi hóa đơn">
        <thead><tr><th scope="col">Kênh</th><th scope="col">Số điện thoại</th><th scope="col">Trạng thái</th><th scope="col">Thời gian</th></tr></thead>
        <tbody>{invoice.sendings.map((item, index) => (
          <tr key={`${item.channel}-${item.deliveryStatusAt ?? index}`}>
            <td>{sendingChannel(item.channel)}</td><td>{item.phoneNumber ?? "—"}</td>
            <td><span className={s.chip} data-tone={item.deliveryStatusId === 1602 ? "good" : item.deliveryStatusId === 1601 ? "warn" : "none"}>{deliveryStatus(item.deliveryStatusId)}</span></td>
            <td>{item.deliveryStatusAt ? dateTimeText(item.deliveryStatusAt) : "—"}</td>
          </tr>))}
        </tbody>
      </table>
    </div>
  );
}
