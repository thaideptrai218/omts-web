"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createOperationsRepository } from "@/features/operations/repository";
import { operationError } from "@/features/operations/ui";
import type { InvoiceConfirmation } from "./confirmation-problem";
import { salesInvoiceSaved } from "./contracts";
import { isTerminal, nextDelayMs, resumePoll, startPoll, stepPoll, type PollEvent, type PollState } from "./pending-sale-poll";
import { pendingSale, type PendingSale } from "./vietqr-contracts";

const sales = createOperationsRepository("sales-invoices");
const READ_TIMEOUT_MS = 15_000;
export type ChangeKind = "cash" | "payLater";
type Reply = "yes" | "no" | "cancel";
type Busy = "change" | "stop" | "refresh" | undefined;

/** Chờ `ms` mili giây hoặc đến khi bị hủy (xóa timer ngay khi hủy để không rò rỉ). */
function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const timer = setTimeout(done, ms);
    function done() { clearTimeout(timer); signal.removeEventListener("abort", done); resolve(); }
    signal.addEventListener("abort", done, { once: true });
  });
}

/**
 * Theo dõi một giao dịch VietQR đang chờ và thực hiện đổi phương thức / dừng bán.
 * - Vòng hỏi GET pending/{code} dừng khi: kết thúc (đã nhận tiền, đã đổi, đã dừng, mất quyền, không còn), mất kết nối nhiều lần,
 *   đang đổi/dừng, hoặc component bị gỡ (AbortController + xóa timer).
 * - Đổi/dừng không bao giờ tự gửi lại: kết quả không chắc chắn được đối chiếu bằng một lần ĐỌC trạng thái giao dịch.
 */
export function usePendingSale(initial: PendingSale, ask: (confirmation: InvoiceConfirmation) => Promise<Reply>) {
  const [poll, setPoll] = useState<PollState>(() => startPoll(initial));
  const [busy, setBusy] = useState<Busy>(), [error, setError] = useState<string>();
  const pollRef = useRef(poll), busyRef = useRef<Busy>(undefined), mounted = useRef(true);
  const code = initial.code;
  const apply = useCallback((event: PollEvent) => {
    const next = stepPoll(pollRef.current, event);
    pollRef.current = next;
    if (mounted.current) setPoll(next);
    return next;
  }, []);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const active = !isTerminal(poll.phase) && !busy;
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController(), startedAt = Date.now();
    void (async () => {
      while (!controller.signal.aborted) {
        await wait(nextDelayMs(pollRef.current, Date.now() - startedAt), controller.signal);
        if (controller.signal.aborted) return;
        const result = await sales.read("pending", { code }, pendingSale, AbortSignal.any([controller.signal, AbortSignal.timeout(READ_TIMEOUT_MS)]));
        if (controller.signal.aborted) return;
        const next = apply(result.status === "success" ? { type: "view", sale: result.data } : { type: "failure", httpStatus: result.httpStatus });
        if (isTerminal(next.phase)) return;
      }
    })();
    return () => controller.abort();
  }, [active, code, apply]);

  /** Một lần đọc trạng thái ngay (sau lỗi đổi/dừng, hoặc người dùng bấm kiểm tra lại). */
  const refresh = useCallback(async () => {
    const result = await sales.read("pending", { code }, pendingSale, AbortSignal.timeout(READ_TIMEOUT_MS));
    return apply(result.status === "success" ? { type: "view", sale: result.data } : { type: "failure", httpStatus: result.httpStatus });
  }, [code, apply]);

  const run = useCallback(async (kind: Exclude<Busy, undefined>, action: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = kind; setBusy(kind); setError(undefined);
    try { await action(); } catch { setError("Chưa xác nhận được kết quả. Hãy kiểm tra trạng thái giao dịch trước khi thao tác tiếp."); }
    finally { busyRef.current = undefined; if (mounted.current) setBusy(undefined); }
  }, []);

  /** Sau lỗi của đổi/dừng: đọc lại trạng thái thật; nếu giao dịch đã kết thúc thì màn hình tự chuyển theo kết quả đó. */
  const reconcile = useCallback(async (failure: Parameters<typeof operationError>[0]) => {
    const next = await refresh();
    setError(next.phase === "waiting" || next.phase === "stalled" ? operationError(failure) : undefined);
  }, [refresh]);

  const changePayment = (kind: ChangeKind) => run("change", async () => {
    const payment: { cashAmount: number; rest: "None" | "PayLater"; payLaterOwnerAgreed?: boolean } =
      kind === "cash" ? { cashAmount: initial.total, rest: "None" } : { cashAmount: initial.cashAmount, rest: "PayLater" };
    for (;;) {
      const result = await sales.write("change-payment", { payment }, salesInvoiceSaved, code);
      if (result.status === "success") { apply({ type: "view", sale: { ...pollRef.current.sale, status: "PaymentChanged", invoiceId: result.data.invoice.id, invoice: result.data, endedAt: result.data.invoice.invoicedAt } }); return; }
      if (result.invoiceConfirmation?.field !== "payment.payLaterOwnerAgreed" || payment.payLaterOwnerAgreed) return reconcile(result);
      if (await ask(result.invoiceConfirmation) !== "yes") { setError("Chưa chuyển sang ghi nợ vì chưa có sự đồng ý của Chủ hợp tác xã."); return; }
      payment.payLaterOwnerAgreed = true;
    }
  });

  const stop = () => run("stop", async () => {
    const result = await sales.write("stop", { confirmed: true }, pendingSale, code);
    if (result.status === "success") apply({ type: "view", sale: result.data }); else await reconcile(result);
  });

  const recheck = () => run("refresh", async () => { pollRef.current = resumePoll(pollRef.current); setPoll(pollRef.current); await refresh(); });

  return { poll, busy, error, changePayment, stop, recheck };
}
