"use client";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { createOperationsRepository } from "@/features/operations/repository";
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import { formatDateTime } from "./trace-format";
import { withdrawalNotices } from "./withdraw-contracts";
import { WithdrawalNoticeList } from "./withdrawal-notice-list";
import s from "./lot-tracing.module.css";

const repo = createOperationsRepository("lot-tracing");

/** Tải danh sách thông báo của lần thu hồi gần nhất. Chỉ chạy khi người dùng mở mục này, nên người không có quyền không thấy lỗi thừa. */
function NoticesBody({ lotId }: { lotId: string }) {
  const notices = useRemote(useCallback((signal: AbortSignal) => repo.read("withdrawal-notices", { id: lotId }, withdrawalNotices, signal), [lotId]));
  if (notices.loading) return <Skeleton />;
  if (notices.error || !notices.data) return <div><ErrorNotice error={notices.error} /><Button className="w-auto" variant="secondary" onClick={notices.reload}>Tải lại</Button></div>;
  const data = notices.data;
  return (
    <>
      {data.withdrawnAt && <p className={s.hint}>Lần thu hồi gần nhất: {formatDateTime(data.withdrawnAt)}.</p>}
      <WithdrawalNoticeList notices={data.notices} walkInInvoiceCodes={data.walkInInvoiceCodes} />
      <Button className="w-auto" variant="secondary" onClick={notices.reload}>Cập nhật trạng thái gửi</Button>
    </>
  );
}

/** Mục "Thông báo đã gửi" của lô từng bị thu hồi (TRACE-04 bước 7, đọc lại): không mất danh sách khách cần gọi khi mất phản hồi. */
export function WithdrawalNoticesPanel({ lotId, refreshKey }: { lotId: string; refreshKey: string }) {
  const [open, setOpen] = useState(false);
  return (
    <section className={s.card} aria-labelledby="withdrawal-notices-title">
      <div className={s.cardHead}>
        <h2 id="withdrawal-notices-title">Thông báo đã gửi</h2>
        <Button className="w-auto" variant="secondary" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "Ẩn" : "Xem thông báo thu hồi"}</Button>
      </div>
      {open && <NoticesBody key={`${lotId}-${refreshKey}`} lotId={lotId} />}
    </section>
  );
}
