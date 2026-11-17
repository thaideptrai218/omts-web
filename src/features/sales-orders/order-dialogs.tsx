"use client";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { InvoiceConfirmation } from "@/features/sales-invoices/confirmation-problem";

/** A question of the API (409) in the web's own words: the Owner agreed to a price that is not the list price, or to the discount. */
export type OrderQuestion = { confirmation: InvoiceConfirmation; reply(answer: "yes" | "cancel"): void };

function describe(confirmation: InvoiceConfirmation) {
  if (confirmation.field === "confirmDuplicateBankReference") return { title: "Mã giao dịch đã được ghi", text: "Mã giao dịch ngân hàng này đã được ghi trước đó. Hãy đối chiếu rồi xác nhận nếu vẫn ghi tiền ứng này.", yes: "Vẫn ghi" };
  if (confirmation.field === "discountDecidedByOwner") return { title: "Giảm giá cần Chủ HTX đồng ý", text: "Khoản giảm giá của đơn đặt hàng này cần sự đồng ý của Chủ hợp tác xã. Chủ HTX đã đồng ý chưa?", yes: "Chủ HTX đã đồng ý" };
  const line = /^lines\[(\d{1,3})\]\.priceDecidedByOwner$/.exec(confirmation.field);
  if (line) return { title: "Đơn giá khác bảng giá", text: `Dòng ${confirmation.lineNumber ?? Number(line[1]) + 1} có đơn giá khác giá niêm yết. Chủ hợp tác xã đã đồng ý mức giá này chưa?`, yes: "Chủ HTX đã đồng ý" };
  return { title: "Cần xác nhận", text: "Cần xác nhận để tiếp tục.", yes: "Đồng ý" };
}

export function OrderQuestionDialog({ question }: { question: OrderQuestion }) {
  const view = describe(question.confirmation);
  return <Dialog open title={view.title} dismissible={false} onOpenChange={() => question.reply("cancel")}>
    <p className="text-sm leading-6 text-text">{view.text}</p>
    <div className="mt-6 flex flex-wrap justify-end gap-2">
      <Button className="w-auto" variant="secondary" onClick={() => question.reply("cancel")}>Quay lại chỉnh sửa</Button>
      <Button className="w-auto" onClick={() => question.reply("yes")}>{view.yes}</Button>
    </div>
  </Dialog>;
}


