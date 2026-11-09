import { StatusPill } from "@/components/ui/management-page";
import { STATUS_PRESENTATION, statusKey, formatDateTime } from "@/features/trader-purchases/presentation";
import type { PurchaseRequest } from "./new-module-contracts";
import { sendingSummary } from "./purchase-request-review-presentation";

/** Trạng thái = biểu tượng + chữ (không chỉ màu); "Đã hoàn thành" là cờ fulfilled của đơn đã chấp nhận. */
export function ReviewStatusPill({ request }: { request: Pick<PurchaseRequest, "statusId" | "fulfilled"> }) {
  const key = statusKey(request), { label, icon } = STATUS_PRESENTATION[key];
  return <StatusPill tone={key === "accepted" || key === "fulfilled" ? "success" : key === "declined" ? "danger" : "neutral"}><span aria-hidden="true">{icon} </span>{label}</StatusPill>;
}

/** Các lần gửi SMS/Zalo phản hồi cho thương lái, kèm trạng thái chuyển phát (BR-SALE-09). */
export function PurchaseRequestSendings({ sendings }: { sendings: PurchaseRequest["sendings"] }) {
  return <section className="mt-5 border-t border-border pt-4" aria-labelledby="request-sendings"><h3 id="request-sendings" className="font-semibold">Tin nhắn phản hồi đã gửi</h3>
    {sendings.length ? <ul className="mt-2 space-y-2 text-sm">{sendings.map((sending, index) => { const row = sendingSummary(sending); return <li key={`${sending.channel}:${index}`}>
      <strong>{row.channel}</strong> · <span className={row.failed ? "text-danger" : undefined}>{row.status}</span>{sending.deliveryStatusAt && <span className="text-text-muted"> · {formatDateTime(sending.deliveryStatusAt)}</span>}</li>; })}</ul>
      : <p className="mt-2 text-sm text-text-muted">Chưa gửi tin phản hồi nào cho thương lái.</p>}
  </section>;
}
