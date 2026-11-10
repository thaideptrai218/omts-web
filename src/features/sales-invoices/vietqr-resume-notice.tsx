"use client";
import { Button } from "@/components/ui/button";
import { displayTime, money } from "@/features/operations/ui";
import type { PendingSale } from "./vietqr-contracts";
import s from "./invoice-screen.module.css";

/**
 * Giao dịch VietQR còn chờ chuyển khoản của các vùng người dùng được bán (GET pending): tìm lại giao dịch sau khi tải lại trang hoặc khi
 * chưa rõ lần tạo trước có thành công không, thay vì lập một giao dịch mới cho cùng hàng.
 */
export function VietQrResumeNotice({ sales, onResume }: { sales: readonly PendingSale[]; onResume(sale: PendingSale): void }) {
  const waiting = sales.filter((sale) => sale.status === "Awaiting");
  if (!waiting.length) return null;
  return (
    <section className={`${s.card} ${s.resumeCard}`} aria-labelledby="resume-title">
      <h2 id="resume-title" className={s.h2}>Giao dịch VietQR đang chờ</h2>
      <p className={s.muted}>Các hóa đơn dưới đây chưa nhận được chuyển khoản và chưa được lưu. Hãy tiếp tục theo dõi trước khi lập hóa đơn mới cho cùng hàng.</p>
      <ul className={s.resumeList}>
        {waiting.map((sale) => (
          <li key={sale.code} className={`${s.lot} ${s.resumeRow}`}>
            <div><strong className={s.code}>{sale.code}</strong> · {money(sale.toPayAmount)}
              <div className={s.muted}>{sale.customer?.name ?? "Khách lẻ"} · {sale.zone.name} · {displayTime(sale.createdAt)}</div></div>
            <Button className="w-auto" variant="secondary" onClick={() => onResume(sale)}>Tiếp tục theo dõi</Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
