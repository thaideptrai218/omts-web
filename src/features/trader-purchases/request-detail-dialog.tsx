"use client";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ErrorNotice, useRemote } from "@/features/operations/ui";
import { traderRequestSchema, type TraderRequest } from "./contracts";
import { formatDate, formatDateTime, formatKg } from "./presentation";
import { purchaseRepository } from "./purchase-repository";
import { ResponseBlock, StatusBadge } from "./request-parts";
import s from "./trader-purchases.module.css";

/** Chi tiết một đơn (SALE-10.2): hiển thị ngay dữ liệu dòng đã có, rồi đọc lại GET /api/me/purchase-requests/{id} để lấy bản mới nhất. */
export function RequestDetailDialog({ request, onClose, onCancel }: { request: TraderRequest; onClose(): void; onCancel(current: TraderRequest): void }) {
  const loaded = useRemote(useMemo(() => (signal: AbortSignal) => purchaseRepository.read("mine-detail", { id: request.id }, traderRequestSchema, signal), [request.id]));
  const current = loaded.data ?? request, response = current.response;
  const rows: [string, string][] = [
    ["Sản phẩm", current.productName], ["Số kg yêu cầu", formatKg(current.requestedKg)], ["Ngày lấy hàng", formatDate(current.pickupDate)], ["Gửi lúc", formatDateTime(current.sentAt)],
  ];
  return (
    <Dialog open title="Chi tiết đơn mua" size="md" onOpenChange={(open) => { if (!open) onClose(); }}>
      {loaded.loading && <p role="status" className={s.hint}>Đang cập nhật trạng thái mới nhất...</p>}
      <ErrorNotice error={loaded.error && `Chưa cập nhật được đơn này: ${loaded.error}`} />
      <p><StatusBadge request={current} /></p>
      <dl className={`${s.detailGrid} ${s.num}`} style={{ marginTop: "1rem" }}>
        {rows.map(([label, value]) => <div key={label} className={s.field}><dt>{label}</dt><dd>{value}</dd></div>)}
        <div className={s.field}><dt>Ghi chú của bạn</dt><dd>{current.note || "—"}</dd></div>
        <div className={`${s.field} ${s.wide}`} style={{ gridColumn: "1 / -1" }}><dt>Phản hồi của hợp tác xã{response ? ` lúc ${formatDateTime(response.respondedAt)}` : ""}</dt><dd><ResponseBlock request={current} /></dd></div>
        {current.cancelledAt && <div className={s.field}><dt>Hủy lúc</dt><dd>{formatDateTime(current.cancelledAt)}</dd></div>}
      </dl>
      <div className={s.footer}>
        {current.canCancel && <Button className="w-auto" variant="danger" onClick={() => onCancel(current)}>Hủy yêu cầu</Button>}
        <Button className="w-auto" variant="secondary" onClick={onClose}>Đóng</Button>
      </div>
    </Dialog>
  );
}
