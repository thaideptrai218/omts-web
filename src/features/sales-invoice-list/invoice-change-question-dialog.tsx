"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { CustomerSearch, type PickedCustomer } from "@/features/customer-lookup/customer-search";
import type { InvoiceConfirmation } from "@/features/sales-invoices/confirmation-problem";
import { dateText, vnd } from "./invoice-labels";
import type { ChangeAnswer } from "./use-invoice-change";

type Props = { question: InvoiceConfirmation; action: "correction" | "cancellation"; onAnswer(answer: ChangeAnswer): void; onBack(): void };

/**
 * Câu hỏi xác nhận 409 khi sửa / hủy hóa đơn (nhánh backend chưa gộp OMTS-224), diễn đạt bằng tiếng Việt từ tên trường và các con số:
 * hợp tác xã sẽ nợ lại khách (MSG-SALE-17), hóa đơn khách lẻ cần hồ sơ người mua (MSG-SALE-19), tiền mặt đang chờ xác nhận đã trả lại khách chưa (MSG-SALE-23).
 */
export function InvoiceChangeQuestionDialog({ question: c, action, onAnswer, onBack }: Props) {
  const [buyer, setBuyer] = useState<PickedCustomer | null>(null);
  const verb = action === "correction" ? "sửa" : "hủy";
  const back = <Button className="w-auto" variant="secondary" onClick={onBack}>Quay lại</Button>;
  let title = "Cần xác nhận", text = "Cần xác nhận để tiếp tục.", buttons = <>{back}</>;
  if (c.field === "confirmOwedBack") {
    title = "Hợp tác xã sẽ nợ lại khách";
    text = `Sau khi ${verb} hóa đơn, hợp tác xã sẽ nợ khách ${vnd(c.owedBackAmount ?? 0)}. Kế toán sẽ trả lại số tiền này hoặc trừ vào các hóa đơn sau. Vẫn tiếp tục ${verb} hóa đơn?`;
    buttons = <>{back}<Button className="w-auto" onClick={() => onAnswer({ confirmOwedBack: true })}>{`Vẫn ${verb} hóa đơn`}</Button></>;
  } else if (c.field === "customerId") {
    title = "Chọn hồ sơ người mua";
    text = `Hóa đơn bán cho khách lẻ nên chưa có hồ sơ khách, trong khi hợp tác xã sẽ nợ người mua ${vnd(c.owedBackAmount ?? 0)}. Hãy chọn hồ sơ khách để kế toán trả lại tiền.`;
    buttons = <>{back}<Button className="w-auto" disabled={!buyer} onClick={() => buyer && onAnswer({ customerId: buyer.id })}>Dùng hồ sơ này</Button></>;
  } else if (c.field === "cashGivenBack" && c.paymentId) {
    const paymentId = c.paymentId;
    title = "Khoản tiền mặt đang chờ xác nhận";
    text = `Khoản tiền mặt ${vnd(c.amount ?? 0)}${c.paymentDate ? ` thu ngày ${dateText(c.paymentDate)}` : ""} đang chờ xác nhận. Quản lý vùng đã trả lại số tiền này cho khách chưa? Chọn "Đã trả lại" để hủy khoản này cùng hóa đơn, hoặc "Chưa trả lại" để giữ khoản này.`;
    buttons = <>{back}<Button className="w-auto" variant="secondary" onClick={() => onAnswer({ paymentId, givenBack: false })}>Chưa trả lại</Button><Button className="w-auto" onClick={() => onAnswer({ paymentId, givenBack: true })}>Đã trả lại</Button></>;
  }
  return (
    <Dialog open title={title} dismissible={false} onOpenChange={onBack}>
      <p className="text-sm leading-6 text-text">{text}</p>
      {c.field === "customerId" && <div className="mt-3"><CustomerSearch value={buyer} onSelect={setBuyer} /></div>}
      <div className="mt-6 flex flex-wrap justify-end gap-2">{buttons}</div>
    </Dialog>
  );
}
