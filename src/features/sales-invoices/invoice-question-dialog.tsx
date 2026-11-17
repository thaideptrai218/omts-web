"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { money } from "@/features/operations/ui";
import { answerPatch, type InvoiceConfirmation } from "./confirmation-problem";

export type Reply = "yes" | "no" | "cancel";
/** A question of the API waiting for the user: `reply` settles the promise of the save loop that asked it. */
export type Question = { confirmation: InvoiceConfirmation; reply(answer: Reply): void };

/** The question being asked and `ask`, which shows it and waits for the user's reply. */
export function useQuestion() {
  const [question, setQuestion] = useState<Question>();
  const ask = (confirmation: InvoiceConfirmation) => new Promise<Reply>((resolve) => setQuestion({ confirmation, reply: (answer) => { setQuestion(undefined); resolve(answer); } }));
  return { question, ask };
}

/** Câu hỏi xác nhận của backend, diễn đạt bằng tiếng Việt từ tên trường và các con số (không dùng chuỗi từ backend). */
function describe({ confirmation: c }: Question) {
  switch (answerPatch(c.field)?.kind) {
    case "line": return { title: "Đơn giá khác giá đã định", text: `Dòng ${c.lineNumber ?? "này"} có đơn giá khác giá của đơn đặt hàng (hoặc bảng giá với dòng thêm ngoài đơn). Chủ hợp tác xã đã đồng ý mức giá này chưa?`, yes: "Chủ HTX đã đồng ý", no: "Chưa đồng ý" };
    case "discount": return { title: "Giảm giá cần Chủ HTX đồng ý", text: "Khoản giảm giá này cần sự đồng ý của Chủ hợp tác xã. Chủ HTX đã đồng ý chưa?", yes: "Chủ HTX đã đồng ý", no: "Chưa đồng ý" };
    case "payLater": return { title: "Ghi nợ phần còn lại", text: `Còn ${money(c.laterAmount)} chưa thanh toán sẽ ghi vào công nợ của khách (nợ hiện tại ${money(c.debtAmount)}). Chủ hợp tác xã đã đồng ý cho nợ chưa?`, yes: "Chủ HTX đã đồng ý", no: "Chưa đồng ý" };
    case "subtract": return { title: "Khách đưa dư tiền", text: `Khách đưa dư ${money(c.excessAmount)} và đang còn nợ ${money(c.debtAmount)}. Trừ ${money(c.subtractAmount)} vào công nợ và trả lại khách ${money(c.changeAmount)}?`, yes: "Trừ vào công nợ", no: "Trả lại toàn bộ tiền dư" };
    case "owedBack": return { title: "Hợp tác xã sẽ nợ lại khách", text: `Sau khi sửa, hóa đơn thấp hơn số khách đã trả: hợp tác xã sẽ nợ khách ${money(c.owedBackAmount ?? 0)}. Kế toán sẽ trả lại số tiền này hoặc trừ vào các hóa đơn sau. Vẫn lưu hóa đơn?`, yes: "Vẫn lưu hóa đơn", no: "Chưa lưu" };
    default: return { title: "Cần xác nhận", text: "Cần xác nhận để tiếp tục.", yes: "Đồng ý", no: "Không" };
  }
}

export function InvoiceQuestionDialog({ question }: { question: Question }) {
  const view = describe(question);
  return (
    <Dialog open title={view.title} dismissible={false} onOpenChange={() => question.reply("cancel")}>
      <p className="text-sm leading-6 text-text">{view.text}</p>
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button className="w-auto" variant="secondary" onClick={() => question.reply("cancel")}>Quay lại chỉnh sửa</Button>
        <Button className="w-auto" variant="secondary" onClick={() => question.reply("no")}>{view.no}</Button>
        <Button className="w-auto" onClick={() => question.reply("yes")}>{view.yes}</Button>
      </div>
    </Dialog>
  );
}
