"use client";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { money } from "@/features/operations/ui";
import type { PaymentQuestion } from "./use-payment-recorder";

/** Hai câu hỏi xác nhận khi ghi nhận thanh toán, diễn đạt bằng tiếng Việt từ tên trường và các con số của backend. */
export function PaymentQuestionDialog({ question }: { question: PaymentQuestion }) {
  const c = question.confirmation, above = c.field === "confirmAboveDebt";
  const title = above ? "Số tiền vượt công nợ" : "Mã giao dịch đã được ghi nhận";
  const text = above
    ? `Khoản này (${money(c.amount)}) ${c.debtAmount && c.debtAmount > 0 ? `vượt công nợ hiện tại ${money(c.debtAmount)}` : "được nhận khi khách không còn nợ"}. Phần chênh ${money(c.owedBackAmount)} sẽ trở thành tiền cần trả lại khách. Vẫn ghi nhận?`
    : `Mã giao dịch ngân hàng này đã dùng ở ${c.paymentCode ?? "một phiếu khác"}${c.amount != null ? ` (${money(c.amount)}` : ""}${c.paymentDate ? `, ngày ${new Intl.DateTimeFormat("vi-VN").format(new Date(c.paymentDate))}` : ""}${c.amount != null ? ")" : ""}. Vẫn dùng lại mã này?`;
  return (
    <Dialog open title={title} dismissible={false} onOpenChange={() => question.reply(false)}>
      <p className="text-sm leading-6 text-text">{text}</p>
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button className="w-auto" variant="secondary" onClick={() => question.reply(false)}>Quay lại chỉnh sửa</Button>
        <Button className="w-auto" onClick={() => question.reply(true)}>{above ? "Vẫn ghi nhận" : "Vẫn dùng mã này"}</Button>
      </div>
    </Dialog>
  );
}
