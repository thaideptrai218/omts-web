"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorNotice, money } from "@/features/operations/ui";
import { formatWaited, type PollState } from "./pending-sale-poll";
import { QrCodeImage } from "./qr-code-image";
import type { ChangeKind } from "./use-pending-sale";
import { usableVietQr } from "./vietqr-contracts";
import s from "./invoice-screen.module.css";

type Props = {
  poll: PollState; busy?: "change" | "stop" | "refresh"; error?: string;
  onChange(kind: ChangeKind): void; onStopRequest(): void; onRecheck(): void;
};

/** Đồng hồ "đã chờ mm:ss": đặt ngoài vùng aria-live để trình đọc màn hình không đọc lại mỗi giây. Timer được dọn khi gỡ. */
function WaitedClock({ createdAt }: { createdAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  return <span className={s.muted}>Đã chờ {formatWaited(createdAt, now)}</span>;
}

function statusText({ poll, busy }: Pick<Props, "poll" | "busy">): string {
  if (busy === "change") return "Đang đổi phương thức thanh toán…";
  if (busy === "stop") return "Đang dừng giao dịch…";
  if (poll.phase === "stalled") return "Chưa kiểm tra được trạng thái chuyển khoản. Giao dịch vẫn được giữ trên hệ thống; hãy kiểm tra lại kết nối.";
  if (poll.failures > 0) return `Mất kết nối tạm thời, đang thử lại (lần ${poll.failures})… Giao dịch vẫn được giữ trên hệ thống.`;
  return "Đang chờ ngân hàng báo đã nhận tiền… Hóa đơn được lưu ngay khi tiền về.";
}

/** Giao dịch còn chờ: mã QR, thông tin chuyển khoản, trạng thái trực tiếp và các thao tác đổi phương thức / hủy giao dịch. */
export function VietQrWaitingPanel({ poll, busy, error, onChange, onStopRequest, onRecheck }: Props) {
  const sale = poll.sale, qr = usableVietQr(sale), [changing, setChanging] = useState(false);
  const locked = !!busy;
  return (
    <div>
      <div className={s.qrGrid}>
        <div className={s.qrBox}>
          {qr ? <QrCodeImage value={qr.payload} className={s.qrImage} label={`Mã VietQR thanh toán ${money(sale.toPayAmount)} cho hóa đơn ${sale.code}`} />
            : <p className={s.qrMissing} role="alert">{sale.vietQr ? "Mã QR nhận được không khớp số tiền hoặc nội dung hóa đơn nên không được hiển thị." : "Hiện chưa tạo được mã VietQR cho hóa đơn này."}</p>}
        </div>
        <div>
          <dl className={s.qrFacts}>
            <div><dt>Số tiền cần trả</dt><dd className={s.qrAmount} tabIndex={-1} data-dialog-initial-focus>{money(sale.toPayAmount)}</dd></div>
            {sale.vietQr && <>
              <div><dt>Ngân hàng</dt><dd>{sale.vietQr.bankName}</dd></div>
              <div><dt>Số tài khoản</dt><dd className={s.code}>{sale.vietQr.accountNumber}</dd></div>
              <div><dt>Chủ tài khoản</dt><dd>{sale.vietQr.accountHolderName}</dd></div>
              <div><dt>Nội dung chuyển khoản</dt><dd className={s.code}>{sale.vietQr.content}</dd></div>
            </>}
            {sale.cashAmount > 0 && <div><dt>Đã thu tiền mặt</dt><dd>{money(sale.cashAmount)}</dd></div>}
          </dl>
          <div className={s.statusBox} role="status" aria-live="polite">
            {statusText({ poll, busy })}
            {sale.receivedAmount > 0 && <p className={s.warn}>Đã nhận {money(sale.receivedAmount)} nhưng chưa đủ số tiền cần trả nên hóa đơn chưa được lưu. Khoản này được ghi nhận riêng để Kế toán đối chiếu.</p>}
          </div>
          <div className={s.statusMeta}>
            <WaitedClock createdAt={sale.createdAt} />
            {poll.phase === "stalled" && <Button className="w-auto" variant="secondary" isPending={busy === "refresh"} onClick={onRecheck}>Kiểm tra lại</Button>}
          </div>
        </div>
      </div>
      <ErrorNotice error={error} />
      {changing && (
        <div className={s.changeChoices} role="group" aria-label="Chọn phương thức thanh toán thay thế">
          <Button variant="secondary" disabled={locked} isPending={busy === "change"} pendingLabel="Đang đổi…" onClick={() => onChange("cash")}>Nhận đủ tiền mặt: thu thêm {money(sale.toPayAmount)}</Button>
          <Button variant="secondary" disabled={locked || sale.walkInCustomer} onClick={() => onChange("payLater")}>Ghi nợ phần còn lại: {money(sale.toPayAmount)}</Button>
          {sale.walkInCustomer && <p className={s.hint}>Khách lẻ không thể ghi nợ: hãy chọn nhận tiền mặt hoặc hủy giao dịch.</p>}
        </div>
      )}
      <div className={s.dialogActions}>
        <Button className="w-auto" variant="danger" disabled={locked} onClick={onStopRequest}>Hủy giao dịch</Button>
        <Button className="w-auto" variant="secondary" disabled={locked} aria-expanded={changing} onClick={() => setChanging((v) => !v)}>Đổi phương thức thanh toán</Button>
      </div>
    </div>
  );
}
