"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast-provider";
import { ErrorNotice, OperationHeading, useRemote } from "@/features/operations/ui";
import { createOperationsRepository } from "@/features/operations/repository";
import { ORDERS_PATH } from "@/features/sales-orders/order-labels";
import { z } from "zod";
import type { salesInvoiceSaved } from "./contracts";
import { InvoiceFinishPanel } from "./invoice-finish-panel";
import { InvoiceQuestionDialog, useQuestion } from "./invoice-question-dialog";
import { VietQrDialog } from "./vietqr-dialog";
import { VietQrResumeNotice } from "./vietqr-resume-notice";
import { pendingSale, type PendingSale } from "./vietqr-contracts";

const sales = createOperationsRepository("sales-invoices");
const HINT = "Hóa đơn bán được lập từ đơn đặt hàng: chọn đơn rồi bấm Xử lý đặt hàng.";

/**
 * The old "Lập hóa đơn bán" address. An invoice is now made from an order, so this sends the user to the orders; it stays only while a VietQR sale
 * is waiting for its transfer, so that the sale can still be followed to its invoice.
 */
export function SalesInvoiceScreen() {
  const router = useRouter(), { notify } = useToast(), { question, ask } = useQuestion();
  const pendingList = useRemote(useCallback((signal: AbortSignal) => sales.read("pending", {}, z.array(pendingSale), signal), []));
  const [following, setFollowing] = useState<PendingSale>(), [saved, setSaved] = useState<z.infer<typeof salesInvoiceSaved>>();
  const waiting = (pendingList.data ?? []).some((sale) => sale.status === "Awaiting");
  const goToOrders = !pendingList.loading && !pendingList.error && !waiting && !following && !saved;
  useEffect(() => {
    if (!goToOrders) return;
    notify({ tone: "info", title: HINT });
    router.replace(ORDERS_PATH);
  }, [goToOrders, notify, router]);

  return (
    <section>
      <OperationHeading title="Lập hóa đơn bán" description={HINT} icon="receipt" />
      <ErrorNotice error={pendingList.error} />
      <p className="my-3 text-sm"><Link className="text-primary underline" href={ORDERS_PATH}>Mở danh sách đơn đặt hàng</Link></p>
      {saved ? <div className="mx-auto mt-5 w-full max-w-[44rem]"><InvoiceFinishPanel invoice={saved.invoice} change={saved.change} subtracted={saved.subtractedFromDebt} onDone={() => router.push(ORDERS_PATH)} doneLabel="Về danh sách đơn đặt hàng" skipLabel="Để sau" /></div>
        : !following && <VietQrResumeNotice sales={pendingList.data ?? []} onResume={setFollowing} />}
      {following && <VietQrDialog key={following.code} sale={following} ask={ask} onInvoice={(invoice) => { setFollowing(undefined); setSaved(invoice); pendingList.reload(); }} onLeave={() => { setFollowing(undefined); pendingList.reload(); }} />}
      {question && <InvoiceQuestionDialog question={question} />}
    </section>
  );
}
