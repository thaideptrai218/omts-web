"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ErrorNotice } from "@/features/operations/ui";

/**
 * Asked after an invoice is saved while the order still has goods to deliver: end the order now (it becomes Hoàn thành, what is left of its advance turns into
 * credit of the customer) or leave it Đang giao for the next delivery. `onFinish` answers an error text when the order could not be ended.
 */
export function FinishOrderDialog({ orderCode, onFinish, onSkip }: { orderCode: string; onFinish(): Promise<string | undefined>; onSkip(): void }) {
  const [pending, setPending] = useState(false), [error, setError] = useState<string>();
  async function agree() {
    setPending(true); setError(undefined);
    const failure = await onFinish();
    setPending(false);
    if (failure) setError(failure);
  }
  return <Dialog open title="Kết thúc đơn đặt hàng?" dismissible={false} onOpenChange={() => { if (!pending) onSkip(); }}>
    <p className="text-sm leading-6 text-text">Đơn đặt hàng {orderCode} vẫn còn hàng chưa giao. Kết thúc đơn để chuyển sang Hoàn thành (tiền ứng còn lại của đơn trở thành tín dụng của khách), hoặc bỏ qua để đơn giữ trạng thái Đang giao và giao tiếp lần sau.</p>
    <ErrorNotice error={error} />
    <div className="mt-6 flex flex-wrap justify-end gap-2">
      <Button className="w-auto" variant="secondary" disabled={pending} onClick={onSkip}>Bỏ qua</Button>
      <Button className="w-auto" isPending={pending} onClick={() => void agree()}>Đồng ý</Button>
    </div>
  </Dialog>;
}
