"use client";
import { useCallback, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { createOperationsRepository } from "@/features/operations/repository";
import { operationError, useRemote } from "@/features/operations/ui";
import { product, type Product } from "@/features/sales-api/contracts";
import { answerPatch, type InvoiceConfirmation } from "./confirmation-problem";
import { lotsForSale, type salesInvoiceSaved, type LotForSale } from "./contracts";
import { buildRequest, emptyDraft, firstProblem, noAnswers, totals, type Answers, type Draft, type PaymentMode } from "./invoice-draft";
import { createResult, isPendingSale, pendingSale, type PendingSale } from "./vietqr-contracts";

const sales = createOperationsRepository("sales-invoices"), catalogue = createOperationsRepository("sales-products");
export type Reply = "yes" | "no" | "cancel";
export type Question = { confirmation: InvoiceConfirmation; reply(answer: Reply): void };

/**
 * Trạng thái của màn Lập hóa đơn bán: bản nháp, tổng tiền, và vòng lặp gửi có câu hỏi xác nhận của backend (409).
 * Khóa chống lập trùng (deduplicationKey) giữ nguyên trong cả lần lập, nên gửi lại sau lỗi mạng không tạo hóa đơn thứ hai.
 */
export function useInvoiceEditor() {
  const lots = useRemote(useCallback((signal: AbortSignal) => sales.read("lots", {}, lotsForSale, signal), []));
  const products = useRemote(useCallback((signal: AbortSignal) => catalogue.read("list", {}, z.array(product), signal), []));
  const [draft, setDraftState] = useState<Draft>(emptyDraft);
  const pendingList = useRemote(useCallback((signal: AbortSignal) => sales.read("pending", {}, z.array(pendingSale), signal), []));
  const [saving, setSaving] = useState<PaymentMode>(), [error, setError] = useState<string>(), [question, setQuestion] = useState<Question>();
  const [saved, setSaved] = useState<z.infer<typeof salesInvoiceSaved>>(), [pending, setPending] = useState<PendingSale>();
  const key = useRef(crypto.randomUUID()), answers = useRef<Answers>(noAnswers), busy = useRef(false);

  const active = useMemo<Product[]>(() => (products.data ?? []).filter((p) => p.statusId === 101 && p.unitPrice != null), [products.data]);
  const listPrice = useCallback((productId: string) => (products.data ?? []).find((p) => p.id === productId)?.unitPrice, [products.data]);
  const sums = useMemo(() => totals(draft, listPrice), [draft, listPrice]);
  const problem = firstProblem(draft, sums);
  const canVietQr = !firstProblem(draft, sums, "vietQr");

  /** Mọi thay đổi bản nháp làm các câu trả lời cũ hết hiệu lực và cấp khóa mới cho lần lập tiếp theo. */
  const setDraft = useCallback((update: (current: Draft) => Draft) => {
    setDraftState(update); answers.current = noAnswers; key.current = crypto.randomUUID(); setError(undefined);
  }, []);
  // The products a line of this lot may name: those the lot was split into, else every product in use. A single choice is taken at once.
  const only = (lot: LotForSale) => { const own = lot.products?.length ? active.filter((p) => lot.products?.some((item) => item.productId === p.id)) : active; return own.length === 1 ? own[0] : undefined; };
  const addLot = (lot: LotForSale) => setDraft((d) => d.lines.some((l) => l.lot.id === lot.id) ? d
    : { ...d, lines: [...d.lines, { key: crypto.randomUUID(), lot, productId: only(lot)?.id ?? "", kg: "", unitPrice: "" }] });

  const ask = (confirmation: InvoiceConfirmation) => new Promise<Reply>((resolve) => setQuestion({ confirmation, reply: (a) => { setQuestion(undefined); resolve(a); } }));

  /**
   * Lập hóa đơn (tiền mặt/ghi nợ) hoặc bắt đầu bán chờ VietQR. Khi một giao dịch VietQR đang chờ cho bản nháp này thì không lập thêm.
   * Kết quả không chắc chắn của VietQR không tự gửi lại: bấm lại dùng cùng khóa chống trùng nên backend trả đúng giao dịch cũ.
   */
  async function submit(mode: PaymentMode = "standard") {
    if (busy.current || pending || (mode === "vietQr" ? !canVietQr : problem)) return;
    busy.current = true; setSaving(mode); setError(undefined);
    try {
      for (;;) {
        const result = await sales.write("create", buildRequest(draft, answers.current, key.current, listPrice, mode), createResult);
        if (result.status === "success") { if (isPendingSale(result.data)) setPending(result.data); else setSaved(result.data); return; }
        if (mode === "vietQr" && result.uncertain) { setError("Chưa xác nhận được giao dịch VietQR đã được tạo hay chưa. Nếu đã tạo, giao dịch hiện ở mục “Giao dịch VietQR đang chờ”. Bấm lại để lấy đúng giao dịch đó, hệ thống không tạo trùng."); pendingList.reload(); return; }
        if (mode === "vietQr" && result.httpStatus === 409 && !result.invoiceConfirmation) { setError("Chưa tạo được giao dịch VietQR: hợp tác xã có thể chưa thiết lập tài khoản ngân hàng nhận tiền, hoặc lô hàng đã thay đổi. Hãy kiểm tra rồi thử lại."); return; }
        const patch = result.invoiceConfirmation && answerPatch(result.invoiceConfirmation.field);
        if (!result.invoiceConfirmation || !patch) { setError(operationError(result)); return; }
        const reply = await ask(result.invoiceConfirmation);
        if (reply === "cancel" || reply === "no" && patch.kind !== "subtract") { setError("Chưa lập hóa đơn vì chưa có sự đồng ý cần thiết."); return; }
        const yes = reply === "yes", now = answers.current;
        answers.current = patch.kind === "line" ? { ...now, priceLines: new Set([...now.priceLines, patch.index]) }
          : patch.kind === "discount" ? { ...now, discount: true } : patch.kind === "payLater" ? { ...now, payLater: true } : { ...now, subtract: yes };
      }
    } finally { busy.current = false; setSaving(undefined); }
  }
  /** Tiền đã về hoặc đã đổi phương thức: hóa đơn đã lưu. */
  const finishPending = (invoice: z.infer<typeof salesInvoiceSaved>) => { setPending(undefined); setSaved(invoice); pendingList.reload(); };
  /** Giao dịch đã dừng hoặc không còn theo dõi: khóa chống trùng mới, vì khóa cũ gắn với giao dịch đã kết thúc. */
  const leavePending = () => { setPending(undefined); key.current = crypto.randomUUID(); pendingList.reload(); };
  function reset() { setSaved(undefined); setPending(undefined); pendingList.reload(); setDraftState(emptyDraft); answers.current = noAnswers; key.current = crypto.randomUUID(); setError(undefined); lots.reload(); }

  return { lots, products, active, listPrice, draft, setDraft, addLot, sums, problem, canVietQr, submit, saving: !!saving, savingMode: saving, error, question, ask, saved, reset,
    pending, pendingList, resume: setPending, finishPending, leavePending };
}
