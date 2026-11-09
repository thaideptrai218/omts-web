"use client";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { money } from "@/features/operations/ui";
import type { InvoiceConfirmation } from "./confirmation-problem";
import type { PendingSale } from "./vietqr-contracts";
import { usePendingSale } from "./use-pending-sale";
import { VietQrWaitingPanel } from "./vietqr-waiting-panel";
import s from "./invoice-screen.module.css";

type Props = {
  sale: PendingSale;
  ask(confirmation: InvoiceConfirmation): Promise<"yes" | "no" | "cancel">;
  /** Hóa đơn đã lưu (tiền về, hoặc đã đổi phương thức): màn hình chuyển sang bước hoàn tất. */
  onInvoice(saved: NonNullable<PendingSale["invoice"]>): void;
  /** Giao dịch đã dừng hoặc không còn theo dõi được: quay lại bản nháp. */
  onLeave(): void;
};

function Outcome({ tone, text, action, label }: { tone: "ok" | "info"; text: string; action(): void; label: string }) {
  return (
    <div>
      <p className={tone === "ok" ? s.outcomeOk : s.outcomeInfo}>{text}</p>
      <div className={s.dialogActions}><Button className="w-auto" autoFocus onClick={action}>{label}</Button></div>
    </div>
  );
}

/**
 * SCR-SALE-04 hộp thoại VietQR. Đóng được bằng Esc, nút đóng hoặc nhấp nền (đã được duyệt): đang chờ thì giao dịch vẫn chờ ở nền và nằm trong
 * danh sách "Giao dịch VietQR đang chờ"; đã nhận tiền/đổi phương thức thì mở hóa đơn đã lưu để không mất dấu.
 */
export function VietQrDialog({ sale, ask, onInvoice, onLeave }: Props) {
  const { poll, busy, error, changePayment, stop, recheck } = usePendingSale(sale, ask);
  const [confirmStop, setConfirmStop] = useState(false);
  const current = poll.sale, invoice = current.invoice;
  const titles = { completed: "Đã nhận chuyển khoản", changed: "Đã đổi phương thức thanh toán", stopped: "Đã dừng giao dịch" } as const;
  const title = `${titles[poll.phase as keyof typeof titles] ?? "Đang chờ chuyển khoản"} — hóa đơn ${current.code}`;

  let body: ReactNode, announcement = "";
  if ((poll.phase === "completed" || poll.phase === "changed") && invoice) {
    announcement = poll.phase === "completed" ? `Ngân hàng đã báo nhận ${money(current.toPayAmount)}. Hóa đơn ${current.code} đã được lưu.` : `Hóa đơn ${current.code} đã được lưu theo phương thức mới.`;
    body = <Outcome tone="ok" action={() => onInvoice(invoice)} label="Xem hóa đơn" text={announcement} />;
  } else if (poll.phase === "stopped") {
    announcement = "Giao dịch đã dừng, chưa lưu hóa đơn nào. Hãy trả lại tiền mặt đã nhận (nếu có) và giữ nguyên hàng; bản nháp vẫn còn để chọn cách thanh toán khác.";
    body = <Outcome tone="info" action={onLeave} label="Quay lại hóa đơn" text={announcement} />;
  } else if (poll.phase === "gone" || poll.phase === "denied") {
    announcement = poll.phase === "gone" ? "Không còn tìm thấy giao dịch này trên hệ thống. Hãy đối chiếu danh sách hóa đơn trước khi lập lại." : "Bạn không còn quyền theo dõi giao dịch này. Hãy đăng nhập lại hoặc báo quản lý.";
    body = <Outcome tone="info" action={onLeave} label="Đóng" text={announcement} />;
  } else {
    body = <VietQrWaitingPanel poll={poll} busy={busy} error={error} onChange={(kind) => void changePayment(kind)} onStopRequest={() => setConfirmStop(true)} onRecheck={() => void recheck()} />;
  }

  const waiting = poll.phase !== "completed" && poll.phase !== "changed" && poll.phase !== "stopped" && poll.phase !== "gone" && poll.phase !== "denied";
  // Không đóng khi một thao tác đổi/hủy đang chạy hoặc đang hỏi xác nhận hủy, để không bỏ rơi yêu cầu giữa chừng.
  const closable = !busy && !confirmStop;
  const close = () => { if ((poll.phase === "completed" || poll.phase === "changed") && invoice) onInvoice(invoice); else onLeave(); };
  return (
    <>
      <Dialog open title={title} size="lg" dismissible={closable} onOpenChange={(open) => { if (!open && closable) close(); }}>
        {/* Vùng thông báo luôn có mặt để trình đọc màn hình đọc được thay đổi trạng thái (nội dung hiển thị đổi theo giai đoạn). */}
        <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
        {body}
        {waiting && <p className="mt-4 text-xs text-text-muted">Có thể đóng hộp thoại này: giao dịch vẫn được chờ ở nền và hiện trong danh sách “Giao dịch VietQR đang chờ” để mở lại.</p>}
      </Dialog>
      <ConfirmDialog open={confirmStop && poll.phase !== "stopped"} tone="danger" title={`Hủy giao dịch ${current.code}?`} confirmLabel="Hủy giao dịch" cancelLabel="Tiếp tục chờ"
        description={`Chưa nhận được chuyển khoản cho hóa đơn ${current.code}. Hệ thống không lưu hóa đơn, chỉ giữ mã ${current.code} trong nhật ký. Hãy trả lại tiền mặt đã nhận (nếu có) và giữ nguyên hàng. Nếu tiền vẫn về sau đó, Kế toán sẽ hoàn lại.`}
        isPending={busy === "stop"} error={error} onConfirm={() => void stop()} onOpenChange={(open) => { if (!open) setConfirmStop(false); }} />
    </>
  );
}
