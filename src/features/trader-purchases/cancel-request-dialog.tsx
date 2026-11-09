"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ErrorNotice, Note, useMutation } from "@/features/operations/ui";
import { cancelRequestSchema, MAX_TEXT_LENGTH, traderRequestSchema, type TraderRequest } from "./contracts";
import { formatDate, formatKg } from "./presentation";
import { purchaseRepository } from "./purchase-repository";
import s from "./trader-purchases.module.css";

/**
 * SALE-02: hủy yêu cầu mua với lý do tùy chọn. Hai bước: mở hộp thoại rồi bấm "Xác nhận hủy". Lần gửi không rõ kết quả
 * (mất mạng, 5xx) hoặc xung đột phiên bản (MSG06) khóa form và buộc tải lại danh sách; không bao giờ tự gửi lại.
 */
export function CancelRequestDialog({ request, onClose, onCancelled, onReload }: { request: TraderRequest; onClose(): void; onCancelled(saved: TraderRequest): void; onReload(): void }) {
  const [reason, setReason] = useState(""), [formError, setFormError] = useState<string>();
  const mutation = useMutation();

  async function confirm() {
    const payload = cancelRequestSchema.safeParse({ reason: reason.trim() || null, rowVersion: request.rowVersion });
    if (!payload.success) { setFormError(`Lý do hủy tối đa ${MAX_TEXT_LENGTH} ký tự.`); return; }
    setFormError(undefined);
    const saved = await mutation.run(() => purchaseRepository.write("cancel", payload.data, traderRequestSchema, request.id));
    if (saved) onCancelled(saved);
  }

  return (
    <Dialog open title="Hủy yêu cầu mua" mobileLayout="compact" dismissible={!mutation.pending} onOpenChange={(open) => { if (!open) onClose(); }}>
      <p>Bạn sắp hủy yêu cầu <strong>{request.productName}</strong>, {formatKg(request.requestedKg)}, lấy ngày {formatDate(request.pickupDate)}. Hợp tác xã sẽ nhận được thông báo.</p>
      <ErrorNotice error={formError ?? mutation.error} />
      {mutation.blocked ? (
        <>
          <p className={s.warning} role="status">Chưa chắc yêu cầu đã được hủy hay chưa, hoặc yêu cầu vừa được hợp tác xã xử lý. Hãy tải lại danh sách để xem trạng thái mới nhất; hệ thống không tự gửi lại.</p>
          <div className={s.footer}><Button className="w-auto" onClick={onReload}>Tải lại danh sách</Button></div>
        </>
      ) : (
        <form className={s.form} style={{ marginTop: "1rem" }} onSubmit={(event) => { event.preventDefault(); void confirm(); }}>
          <Note label="Lý do hủy (không bắt buộc)" maxLength={MAX_TEXT_LENGTH} value={reason} disabled={mutation.pending} onChange={(event) => setReason(event.target.value)} />
          <div className={s.footer}>
            <Button className="w-auto" variant="secondary" disabled={mutation.pending} onClick={onClose}>Giữ yêu cầu</Button>
            <Button className="w-auto" variant="danger" type="submit" isPending={mutation.pending} pendingLabel="Đang hủy...">Xác nhận hủy</Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
