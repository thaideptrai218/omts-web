"use client";
import { KctVatRow } from "@/features/purchase-documents/kct-vat-row";
import { useCallback, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/management-page";
import { InvoiceQrCard } from "@/features/invoice-qr/invoice-qr-card";
import { createOperationsRepository } from "@/features/operations/repository";
import { safeUrl } from "@/features/sales-invoice-list/invoice-info-tab";
import { ErrorNotice, money, operationError, Skeleton, useRemote } from "@/features/operations/ui";
import { publishCheck, salesInvoiceSent, type SalesInvoice } from "./contracts";
import s from "./invoice-screen.module.css";

const sales = createOperationsRepository("sales-invoices");
type Sent = z.infer<typeof salesInvoiceSent>;

/** Vì sao "Có, kèm mã QR" không tạo được mã: những lô chưa công bố được (theo kết quả công bố vừa chạy). */
function noQrReason(lots: Sent["lots"]): string {
  const blocked = lots.filter((lot) => lot.originState !== "Published").map((lot) => lot.lotCode);
  return blocked.length ? `lô ${blocked.join(", ")} chưa đủ dữ liệu để công bố nguồn gốc.` : "chưa có lô nào của hóa đơn đủ điều kiện công bố nguồn gốc.";
}

/** Sau khi lập xong (SALE-05 bước 9-11): hỏi có kèm mã QR nguồn gốc không, gửi hóa đơn cho khách và cho phép gửi lại. `onDone` đưa người dùng về nơi họ bắt đầu (danh sách đơn đặt hàng). */
export function InvoiceFinishPanel({ invoice, change, subtracted, onDone, doneLabel, skipLabel }: { invoice: SalesInvoice; change: number; subtracted: number; onDone(): void; doneLabel: string; skipLabel: string }) {
  const check = useRemote(useCallback((signal: AbortSignal) => sales.read("publish-check", { id: invoice.id }, publishCheck, signal), [invoice.id]));
  const [sent, setSent] = useState<Sent>(), [busy, setBusy] = useState(false), [error, setError] = useState<string>(), [wantedQr, setWantedQr] = useState(false);

  async function run(action: "finish" | "resend", body: unknown) {
    if (action === "finish") setWantedQr((body as { wantsQrCode?: boolean }).wantsQrCode === true);
    setBusy(true); setError(undefined);
    const result = await sales.write(action, body, salesInvoiceSent, invoice.id);
    setBusy(false);
    if (result.status === "success") setSent(result.data); else setError(operationError(result));
  }

  const qr = sent ? safeUrl(sent.qrUrl) : undefined;

  return (
    <section className={s.card} aria-labelledby="done-title">
      <div className={s.doneHead}>
        <span className={s.tick} aria-hidden="true">✓</span>
        <div><h2 id="done-title" className={s.h2}>Đã lập hóa đơn {invoice.code}</h2>
          <p className={s.muted}>Tổng {money(invoice.total)} · {invoice.customer?.name ?? "Khách lẻ"}</p></div>
      </div>
      <dl className={s.sums}>
        <KctVatRow layout="list" valueClassName={s.num} />
        {change > 0 && <div className={s.callout}><dt>Trả lại khách</dt><dd className={s.num}>{money(change)}</dd></div>}
        {subtracted > 0 && <div><dt>Đã trừ vào công nợ</dt><dd className={s.num}>{money(subtracted)}</dd></div>}
      </dl>

      {!sent ? (
        <>
          <h3 className={s.h3}>Kèm mã QR nguồn gốc cho khách?</h3>
          {check.loading ? <Skeleton /> : check.error ? <p role="alert" className={s.error}>{check.error}</p> : (
            <ul className={s.lotList}>
              {check.data?.lots.map((lot) => (
                <li key={lot.harvestLotId} className={s.lot}>
                  <div><strong className={s.code}>{lot.lotCode}</strong>{lot.message && <div className={s.muted}>Chưa đủ dữ liệu: nguồn gốc lô này chưa thể công bố.</div>}</div>
                  <StatusPill tone={lot.originState === "Published" ? "success" : lot.originState === "Withdrawn" ? "danger" : "neutral"}>
                    {lot.originState === "Published" ? "Đã công bố" : lot.originState === "Withdrawn" ? "Đã thu hồi" : lot.message ? "Chưa đủ dữ liệu" : "Sẵn sàng công bố"}</StatusPill>
                </li>
              ))}
            </ul>
          )}
          <ErrorNotice error={error} />
          <div className={s.actions}>
            <Button className="w-auto" isPending={busy} onClick={() => void run("finish", { wantsQrCode: true })}>Có, kèm mã QR</Button>
            <Button className="w-auto" variant="secondary" disabled={busy} onClick={() => void run("finish", { wantsQrCode: false })}>Không kèm mã QR</Button>
          </div>
        </>
      ) : (
        <>
          <p className={s.resultLine}><StatusPill tone={sent.deliveryStatus === "Sent" ? "success" : "neutral"}>{sent.deliveryStatus === "Sent" ? "Đã gửi cho khách" : "Chưa gửi được"}</StatusPill>
            {sent.qrUrl && <a className={s.link} href={sent.qrUrl} target="_blank" rel="noreferrer noopener">Mở trang nguồn gốc</a>}</p>
          {qr && <InvoiceQrCard url={qr} invoiceCode={sent.invoice.code} lines={sent.invoice.lines} />}
          {wantedQr && !sent.qrUrl && <p role="status" className={s.hint}>Chưa tạo được mã QR: {noQrReason(sent.lots)} Hóa đơn vẫn hợp lệ nhưng sẽ không có mã QR; hãy bổ sung dữ liệu truy xuất của lô trước khi lập hóa đơn sau.</p>}
          {sent.message && <p className={s.hint}>Hóa đơn chưa gửi được cho khách (khách lẻ hoặc chưa có số điện thoại).</p>}
          <ErrorNotice error={error} />
          <div className={s.actions}>
            {sent.deliveryStatus !== "Sent" && !!sent.invoice.customer && <Button className="w-auto" variant="secondary" isPending={busy} onClick={() => void run("resend", {})}>Gửi lại</Button>}
            <Button className="w-auto" onClick={onDone}>{doneLabel}</Button>
          </div>
        </>
      )}
      {!sent && <button type="button" className={s.linkBtn} onClick={onDone}>{skipLabel}</button>}
    </section>
  );
}
