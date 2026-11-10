import type { StaffClaim } from "./claim-contracts";
import { ClaimLinesTable } from "./claim-lines-table";
import { ClaimPhotoGrid } from "./claim-photo-grid";
import { claimStatus, dateText, dateTimeText, deliveryStatus, invoiceStatus, num, offerLabel, sendingChannel, vnd } from "./claim-labels";
import s from "./claims.module.css";
import f from "./frame-kit.module.css";

/** Tab "Khiếu nại": nội dung thương lái gửi, ảnh, khách hàng và phản hồi đã gửi (nếu có). */
export function ClaimInfoTab({ claim }: { claim: StaffClaim }) {
  return (
    <>
      <dl className={f.kv}>
        <div><dt>Mã khiếu nại</dt><dd>{claim.code}</dd></div>
        <div><dt>Trạng thái</dt><dd>{claimStatus(claim.statusId)}</dd></div>
        <div><dt>Thời gian gửi</dt><dd>{dateTimeText(claim.sentAt)}</dd></div>
        <div><dt>Khách hàng</dt><dd>{claim.customer.name}</dd></div>
        <div><dt>Số điện thoại</dt><dd>{claim.customer.phoneNumber ?? "—"}</dd></div>
      </dl>
      <h3 className={s.heading}>Nội dung khiếu nại</h3>
      <p className={s.text}>{claim.description}</p>
      <ClaimPhotoGrid area="quality-claims" claimId={claim.id} claimCode={claim.code} count={claim.photos.length} />
      {claim.response && (
        <div className={s.response}>
          <strong>Phản hồi: {claimStatus(claim.statusId)}</strong> <span className={s.muted}>lúc {dateTimeText(claim.response.respondedAt)}</span>
          {claim.offer && <p>Đề nghị: {offerLabel(claim.offer)}</p>}
          {claim.response.note && <p>{claim.response.note}</p>}
        </div>
      )}
    </>
  );
}

/** Tab "Hóa đơn": dòng hàng, lô thu hoạch, kg, tiền, trạng thái và các lần giảm giá sau khiếu nại. */
export function ClaimInvoiceTab({ claim }: { claim: StaffClaim }) {
  const invoice = claim.invoice;
  return (
    <>
      <dl className={f.kv}>
        <div><dt>Mã hóa đơn</dt><dd>{invoice.code}</dd></div>
        <div><dt>Ngày hóa đơn</dt><dd>{dateText(invoice.invoiceDate)}</dd></div>
        <div><dt>Vùng nuôi</dt><dd>{invoice.zoneName}</dd></div>
        <div><dt>Trạng thái hóa đơn</dt><dd>{invoiceStatus(invoice.statusId)}</dd></div>
      </dl>
      <ClaimLinesTable lines={invoice.lines} prices />
      <div className={s.sums} role="group" aria-label="Tổng hợp hóa đơn">
        <div><span>Tổng khối lượng</span><span>{num(invoice.lines.reduce((sum, line) => sum + line.kg, 0))} kg</span></div>
        <div><span>Tiền hàng</span><span>{vnd(invoice.subtotal)}</span></div>
        <div><span>Giảm giá</span><span>{vnd(invoice.discount)}</span></div>
        <div><span>Thu khác</span><span>{vnd(invoice.otherCharges)}</span></div>
        <div><span>Giảm giá sau khiếu nại</span><span>{invoice.priceCutTotal > 0 ? vnd(invoice.priceCutTotal) : "—"}</span></div>
        <div className={s.total}><span>Tổng tiền</span><span>{vnd(invoice.total)}</span></div>
      </div>
      {invoice.priceCuts.length > 0 && (
        <>
          <h3 className={s.heading}>Lần giảm giá sau khiếu nại</h3>
          <ul className="m-0 list-disc pl-5 text-sm">{invoice.priceCuts.map((cut, index) => <li key={index}>{dateText(cut.cutDate)}: {vnd(cut.amount)} · {cut.reason}</li>)}</ul>
        </>
      )}
    </>
  );
}

/** Tab "Tin đã gửi": các lần gửi phản hồi cho thương lái và tình trạng gửi (kết quả gửi tin không làm đổi phản hồi). */
export function ClaimSendingsTab({ claim }: { claim: StaffClaim }) {
  if (!claim.sendings.length) return <p className={s.muted}>{claim.response ? "Chưa có lượt gửi tin nào cho phản hồi này." : "Phản hồi chưa được gửi nên chưa có tin nhắn nào."}</p>;
  return (
    <div className={f.tableWrap} style={{ position: "relative" }}>
      <table className={f.table} aria-label="Tin đã gửi cho thương lái">
        <thead><tr><th scope="col">Kênh</th><th scope="col">Số điện thoại</th><th scope="col">Tình trạng</th><th scope="col">Lúc</th></tr></thead>
        <tbody>{claim.sendings.map((sending, index) => (
          <tr key={index}><td>{sendingChannel(sending.channel)}</td><td>{sending.phoneNumber ?? "—"}</td><td>{deliveryStatus(sending.deliveryStatusId)}</td><td>{sending.deliveryStatusAt ? dateTimeText(sending.deliveryStatusAt) : "—"}</td></tr>
        ))}</tbody>
      </table>
    </div>
  );
}
