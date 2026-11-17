"use client";
import { useRef, useState } from "react";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { operationError } from "@/features/operations/ui";
import { answerPatch } from "@/features/sales-invoices/confirmation-problem";
import { useQuestion } from "@/features/sales-invoices/invoice-question-dialog";
import { noAnswers, withAnswer, type Answers } from "./invoice-editor-logic";

export type Submitted<T> = { status: "saved"; data: T } | { status: "stopped"; message: string };

/**
 * The send loop of an invoice: the API may answer a save with a question (409: the Owner agreed to a price or the discount, pay later, subtract the extra from the
 * debt, the cooperative will owe the customer); the user's answer is added to the request and the same save is sent again, until it is saved or the user stops.
 * The deduplication key and the answers belong to one state of the form: `signature` says which, and a changed form starts both afresh.
 */
export function useInvoiceSubmit() {
  const { question, ask } = useQuestion(), [saving, setSaving] = useState(false);
  const state = useRef({ signature: "", key: crypto.randomUUID(), answers: noAnswers as Answers }), busy = useRef(false);

  async function run<T>(signature: string, send: (answers: Answers, deduplicationKey: string) => Promise<WorkspaceResult<T>>, options: { vietQr?: boolean; verb: string }): Promise<Submitted<T> | undefined> {
    if (busy.current) return undefined;
    if (state.current.signature !== signature) state.current = { signature, key: crypto.randomUUID(), answers: noAnswers };
    busy.current = true; setSaving(true);
    try {
      for (;;) {
        const result = await send(state.current.answers, state.current.key);
        if (result.status === "success") return { status: "saved", data: result.data };
        // A VietQR sale whose creation is not certain is not sent again by itself: pressing again uses the same key, so the API answers the same sale.
        if (options.vietQr && result.uncertain) return { status: "stopped", message: "Chưa xác nhận được giao dịch VietQR đã được tạo hay chưa. Nếu đã tạo, giao dịch hiện ở mục “Giao dịch VietQR đang chờ”. Bấm lại để lấy đúng giao dịch đó, hệ thống không tạo trùng." };
        if (options.vietQr && result.httpStatus === 409 && !result.invoiceConfirmation) return { status: "stopped", message: "Chưa tạo được giao dịch VietQR: hợp tác xã có thể chưa thiết lập tài khoản ngân hàng nhận tiền, hoặc lô hàng đã thay đổi. Hãy kiểm tra rồi thử lại." };
        const patch = result.invoiceConfirmation && answerPatch(result.invoiceConfirmation.field);
        if (!result.invoiceConfirmation || !patch) return { status: "stopped", message: operationError(result) };
        const reply = await ask(result.invoiceConfirmation);
        if (reply === "cancel" || reply === "no" && patch.kind !== "subtract") return { status: "stopped", message: `Chưa ${options.verb} hóa đơn vì chưa có sự đồng ý cần thiết.` };
        state.current = { ...state.current, answers: withAnswer(state.current.answers, patch, reply === "yes") };
      }
    } finally { busy.current = false; setSaving(false); }
  }
  /** A sale that ended (stopped, or its invoice came in) takes a new key: the old one belongs to the sale that ended. */
  const renew = () => { state.current = { signature: "", key: crypto.randomUUID(), answers: noAnswers }; };
  return { run, question, ask, saving, renew };
}
