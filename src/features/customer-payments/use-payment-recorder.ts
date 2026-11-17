"use client";
import { formatVndWithSymbol } from "@/shared/format/vnd";
import { useCallback, useMemo, useRef, useState } from "react";
import { createOperationsRepository } from "@/features/operations/repository";
import { businessToday, operationError, useRemote } from "@/features/operations/ui";
import type { PickedCustomer } from "@/features/customer-lookup/customer-search";
import type { InvoiceConfirmation } from "@/features/sales-invoices/confirmation-problem";
import { toMoney } from "@/features/sales-invoices/invoice-draft";
import { paymentForm, paymentSaved, recordPayment } from "./contracts";

const repository = createOperationsRepository("customer-payments");
export type Kind = "Payment" | "PaidBack";
export type Form = { kind: Kind; customer: PickedCustomer | null; date: string; amount: string; method: "Cash" | "OtherTransfer"; collector: string; bankReference: string; note: string };
export type PaymentQuestion = { confirmation: InvoiceConfirmation; reply(yes: boolean): void };
const blank = (kind: Kind, customer: PickedCustomer | null): Form => ({ kind, customer, date: businessToday(), amount: "", method: "Cash", collector: "", bankReference: "", note: "" });

/** Lỗi nhập liệu đầu tiên (tiếng Việt) hoặc undefined nếu có thể gửi. */
export function formProblem(f: Form, owedBack: number | undefined): string | undefined {
  if (!f.customer) return "Chọn khách hàng.";
  const amount = toMoney(f.amount);
  if (!(amount > 0)) return "Nhập số tiền nguyên lớn hơn 0.";
  if (f.method === "OtherTransfer" && !f.bankReference.trim()) return "Nhập mã giao dịch ngân hàng.";
  if (f.method === "Cash" && f.kind === "Payment" && !f.collector) return "Chọn người nhận tiền mặt.";
  if (f.kind === "PaidBack" && owedBack !== undefined && amount > owedBack) return "Số tiền trả lại không được vượt quá số tiền cần trả lại khách.";
  return undefined;
}

/**
 * Trạng thái ghi nhận thanh toán / trả lại tiền: biểu mẫu, đọc công nợ của khách, và vòng lặp gửi có câu hỏi xác nhận 409
 * (vượt công nợ, trùng mã giao dịch). Khóa chống lập trùng giữ nguyên trong một lần ghi, đổi khi người dùng sửa biểu mẫu.
 */
export function usePaymentRecorder(onRecorded: () => void) {
  const [form, setFormState] = useState<Form>(() => blank("Payment", null));
  const [saving, setSaving] = useState(false), [error, setError] = useState<string>(), [notice, setNotice] = useState<string>(), [question, setQuestion] = useState<PaymentQuestion>();
  const key = useRef(crypto.randomUUID()), flags = useRef({ above: false, duplicate: false }), busy = useRef(false);
  const customerId = form.customer?.id;
  const info = useRemote(useCallback((signal: AbortSignal) => customerId ? repository.read("form", { customerId }, paymentForm, signal) : Promise.resolve({ status: "success" as const, data: undefined }), [customerId]));
  const problem = useMemo(() => formProblem(form, info.data?.owedBack), [form, info.data]);

  const setForm = useCallback((patch: Partial<Form>) => {
    setFormState((f) => ({ ...f, ...patch })); flags.current = { above: false, duplicate: false }; key.current = crypto.randomUUID(); setError(undefined); setNotice(undefined);
  }, []);
  const ask = (confirmation: InvoiceConfirmation) => new Promise<boolean>((resolve) => setQuestion({ confirmation, reply: (yes) => { setQuestion(undefined); resolve(yes); } }));

  async function submit() {
    if (busy.current || problem || !form.customer) return;
    busy.current = true; setSaving(true); setError(undefined); setNotice(undefined);
    try {
      for (;;) {
        const body = recordPayment.safeParse({
          customerId: form.customer.id, paymentDate: form.date, amount: toMoney(form.amount), method: form.method,
          bankReference: form.method === "OtherTransfer" ? form.bankReference.trim() : null, collectedByAccountId: form.method === "Cash" && form.kind === "Payment" ? form.collector : null,
          note: form.note.trim() || null, confirmAboveDebt: flags.current.above, confirmDuplicateBankReference: flags.current.duplicate, deduplicationKey: key.current,
        });
        if (!body.success) { setError("Thông tin thanh toán chưa hợp lệ. Hãy kiểm tra lại các ô đã nhập."); return; }
        const result = await repository.write(form.kind === "Payment" ? "record" : "pay-back", body.data, paymentSaved);
        if (result.status === "success") {
          setNotice(`Đã ghi nhận ${result.data.payment.code}${result.data.debtAfter != null ? ` · công nợ còn lại ${formatVndWithSymbol(result.data.debtAfter)}` : ""}.`);
          setFormState(blank(form.kind, form.customer)); flags.current = { above: false, duplicate: false }; key.current = crypto.randomUUID(); info.reload(); onRecorded(); return;
        }
        const field = result.invoiceConfirmation?.field;
        if (!result.invoiceConfirmation || field !== "confirmAboveDebt" && field !== "confirmDuplicateBankReference") { setError(operationError(result)); return; }
        if (!await ask(result.invoiceConfirmation)) { setError("Chưa ghi nhận vì chưa được xác nhận."); return; }
        flags.current = field === "confirmAboveDebt" ? { ...flags.current, above: true } : { ...flags.current, duplicate: true };
      }
    } finally { busy.current = false; setSaving(false); }
  }
  return { form, setForm, info, problem, submit, saving, error, notice, question, switchKind: (kind: Kind) => setForm({ kind, amount: "" }) };
}
