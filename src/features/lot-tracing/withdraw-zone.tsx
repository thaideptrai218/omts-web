"use client";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "@/features/operations/ui";
import s from "./lot-tracing.module.css";

/** Khu thu hồi nguồn gốc của lô đã công bố, đặt riêng và có viền cảnh báo vì thao tác này nhắn tin cho khách hàng và không tự hoàn tác. */
export function WithdrawZone({ lotCode, pending, error, onOpen }: { lotCode: string; pending: boolean; error?: string; onOpen(): void }) {
  return (
    <section className={s.dangerZone} aria-labelledby="withdraw-zone-title">
      <div>
        <h2 id="withdraw-zone-title">Thu hồi nguồn gốc</h2>
        <p>Dừng hiển thị thông tin nguồn gốc của lô {lotCode} trên trang nguồn gốc và nhắn tin cho các khách hàng đã mua lô này. Chỉ Chủ hợp tác xã thực hiện được; công bố lại sau đó vẫn được.</p>
        <ErrorNotice error={error} />
      </div>
      <Button className="w-auto" variant="danger" isPending={pending} pendingLabel="Đang kiểm tra..." onClick={onOpen}>Thu hồi nguồn gốc</Button>
    </section>
  );
}
