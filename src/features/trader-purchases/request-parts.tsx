import type { TraderRequest } from "./contracts";
import { responseSummary, STATUS_PRESENTATION, statusKey } from "./presentation";
import s from "./trader-purchases.module.css";

/** Trạng thái = biểu tượng + chữ (không chỉ màu) để người dùng mù màu vẫn phân biệt được. */
export function StatusBadge({ request, className = "" }: { request: TraderRequest; className?: string }) {
  const { label, icon, tone } = STATUS_PRESENTATION[statusKey(request)];
  return <span className={`${s.pill} ${s[tone]} ${className}`}><span aria-hidden="true">{icon}</span>{label}</span>;
}

/** Phản hồi của Chủ HTX: số kg chấp nhận, ngày lấy, trả sau, ghi chú; hoặc lý do hủy/từ chối. */
export function ResponseBlock({ request }: { request: TraderRequest }) {
  const { headline, note } = responseSummary(request);
  return <div className={s.response}><strong>{headline}</strong>{note && <span className={s.note}>{note}</span>}</div>;
}
