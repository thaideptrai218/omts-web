"use client";
import { useRef, useState } from "react";
import type { InvoiceConfirmation } from "@/features/sales-invoices/confirmation-problem";
import { useMutation } from "@/features/operations/ui";
import { cancelBody, correctionBody, invoiceSent, type InvoiceDetail } from "./invoice-list-contracts";
import { changeErrorText } from "./invoice-labels";
import { invoiceRepository } from "./use-invoice-list";

type Flags = { confirmOwedBack: boolean; customerId?: string; cash: Record<string, boolean> };
export type ChangeAnswer = { confirmOwedBack: true } | { customerId: string } | { paymentId: string; givenBack: boolean };

/**
 * Gửi sửa (PUT .../correction) hoặc hủy (POST .../cancel) một hóa đơn; CẢ HAI thuộc nhánh backend chưa gộp feature/OMTS-224-correct-cancel.
 * Câu hỏi xác nhận 409 (trả lại tiền, hồ sơ người mua khách lẻ, tiền mặt đã trả lại chưa) được trả lời rồi gửi lại cùng yêu cầu kèm cờ tương ứng.
 * Không có khóa chống lập trùng: `rowVersion` của hóa đơn là chốt, một lượt ghi đã thành công làm phiên bản cũ hết hạn (MSG06) nên gửi lại không áp dụng hai lần.
 * Kết quả không chắc chắn (mất kết nối, 5xx) khóa nút gửi; người dùng phải tải lại hóa đơn để đối chiếu. Cờ trả lời được giữ trong một lượt và bị bỏ khi nội dung đổi.
 */
export function useInvoiceChange<F extends object>(kind: "correct" | "cancel", invoice: InvoiceDetail, onDone: (invoice: InvoiceDetail) => void) {
  const mutation = useMutation(), flags = useRef<Flags>({ confirmOwedBack: false, cash: {} }), last = useRef<{ key: string; fields: F } | undefined>(undefined);
  const [invalid, setInvalid] = useState(false), failure = mutation.failure;
  const question: InvoiceConfirmation | undefined = failure?.httpStatus === 409 ? failure.invoiceConfirmation : undefined;

  async function submit(fields: F) {
    const key = JSON.stringify(fields);
    if (last.current?.key !== key) flags.current = { confirmOwedBack: false, cash: {} };
    last.current = { key, fields };
    const f = flags.current, cash = Object.entries(f.cash).map(([paymentId, givenBack]) => ({ paymentId, givenBack }));
    const raw = { ...fields, rowVersion: invoice.rowVersion, ...(f.confirmOwedBack ? { confirmOwedBack: true } : {}), ...(f.customerId ? { customerId: f.customerId } : {}), ...(kind === "cancel" && cash.length ? { cashGivenBack: cash } : {}) };
    const body = (kind === "correct" ? correctionBody : cancelBody).safeParse(raw);
    setInvalid(!body.success);
    if (!body.success) return;
    const sent = await mutation.run(() => invoiceRepository.write(kind, body.data, invoiceSent, invoice.id));
    if (sent) onDone(sent.invoice);
  }
  /** Trả lời câu hỏi đang mở rồi gửi lại. */
  function answer(value: ChangeAnswer) {
    if ("paymentId" in value) flags.current.cash[value.paymentId] = value.givenBack;
    else if ("customerId" in value) flags.current.customerId = value.customerId;
    else flags.current.confirmOwedBack = true;
    if (last.current) void submit(last.current.fields);
  }
  return {
    submit, answer, question, pending: mutation.pending, blocked: mutation.blocked, dismissQuestion: mutation.reviewed,
    error: invalid ? "Thông tin chưa hợp lệ. Hãy kiểm tra lại các ô đã nhập." : question ? undefined : failure ? changeErrorText(failure.httpStatus, failure.code) ?? mutation.error : mutation.error,
  };
}
