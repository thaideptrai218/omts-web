import { Button } from "@/components/ui/button";
import type { TraderRequest } from "./contracts";
import { formatDate, formatDateTime, formatKg } from "./presentation";
import { ResponseBlock, StatusBadge } from "./request-parts";
import s from "./trader-purchases.module.css";

/** Một đơn trong danh sách: sản phẩm, kg yêu cầu, ngày lấy, phản hồi của HTX; "Hủy yêu cầu" chỉ khi backend cho phép (CanCancel). */
export function RequestCard({ request, busy, onOpen, onCancel }: { request: TraderRequest; busy: boolean; onOpen(): void; onCancel(): void }) {
  return (
    <li className={s.card}>
      <StatusBadge request={request} className={s.badge} />
      <dl className={s.cardMain}>
        <div className={s.field}><dt>Sản phẩm</dt><dd>{request.productName}</dd></div>
        <div className={s.field}><dt>Số kg yêu cầu</dt><dd className={s.num}>{formatKg(request.requestedKg)}</dd></div>
        <div className={s.field}><dt>Ngày lấy hàng</dt><dd className={s.num}>{formatDate(request.pickupDate)}</dd></div>
        <div className={`${s.field} ${s.wide}`}><dt>Phản hồi của hợp tác xã</dt><dd><ResponseBlock request={request} /></dd></div>
      </dl>
      <div className={s.cardActions}>
        <span className={s.hint} style={{ marginRight: "auto", alignSelf: "center" }}>Gửi lúc {formatDateTime(request.sentAt)}</span>
        <Button className="w-auto" variant="secondary" disabled={busy} onClick={onOpen} aria-label={`Xem chi tiết đơn ${request.productName} ngày ${formatDate(request.pickupDate)}`}>Xem chi tiết</Button>
        {request.canCancel && <Button className="w-auto" variant="danger" disabled={busy} onClick={onCancel} aria-label={`Hủy yêu cầu ${request.productName} ngày ${formatDate(request.pickupDate)}`}>Hủy yêu cầu</Button>}
      </div>
    </li>
  );
}
