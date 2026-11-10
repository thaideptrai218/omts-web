"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import q from "@/features/quality-claims/frame-kit.module.css";
import { InvoiceCancelDialog } from "./invoice-cancel-dialog";
import { InvoiceCorrectionDialog } from "./invoice-correction-dialog";
import type { InvoiceAction, InvoiceDetail } from "./invoice-list-contracts";
import { correctionKind, dateText, vnd } from "./invoice-labels";
import s from "./invoice-list.module.css";

type Props = { invoice: InvoiceDetail; allowed: ReadonlySet<InvoiceAction>; onChanged(invoice: InvoiceDetail): void; onReload(): void };

/**
 * Tab "Chỉnh sửa": lịch sử sửa (thời gian, loại, lý do, tổng trước → sau) và, cho Chủ HTX khi backend cho phép, nút Sửa / Hủy hóa đơn.
 * `corrections` chỉ có khi backend đã gộp nhánh feature/OMTS-224-correct-cancel; chưa có thì không hiện nút Sửa / Hủy (endpoint chưa tồn tại).
 */
export function InvoiceEditTab({ invoice, allowed, onChanged, onReload }: Props) {
  const [dialog, setDialog] = useState<"correct" | "cancel">();
  const supported = invoice.corrections !== undefined;
  const close = () => setDialog(undefined);
  const done = (next: InvoiceDetail) => { close(); onChanged(next); };
  return (
    <>
      {!invoice.corrections?.length ? <p className={q.hint}>Hóa đơn này chưa được chỉnh sửa lần nào.</p> : (
        <div className={q.tableWrap} style={{ position: "relative" }}>
          <table className={q.table} aria-label="Lịch sử chỉnh sửa hóa đơn">
            <thead><tr><th scope="col">Ngày</th><th scope="col">Loại sửa</th><th scope="col">Lý do</th><th scope="col" className={q.num}>Tổng trước → sau</th></tr></thead>
            <tbody>{invoice.corrections.map((c, index) => (
              <tr key={`${c.date}-${index}`}><td>{dateText(c.date)}</td><td>{correctionKind(c.kind)}</td><td>{c.reason ?? "—"}</td><td className={q.num}>{vnd(c.totalBefore)} → {vnd(c.totalAfter)}</td></tr>))}
            </tbody>
          </table>
        </div>
      )}
      {invoice.priceCuts.length > 0 && <p className={s.muted}>Giảm giá sau khiếu nại: {invoice.priceCuts.map((cut) => `${vnd(cut.amount)} ngày ${dateText(cut.cutDate)}`).join("; ")}.</p>}
      {supported && (allowed.has("Correct") || allowed.has("Cancel")) && (
        <div className={q.footer} role="group" aria-label="Sửa hoặc hủy hóa đơn">
          {allowed.has("Correct") && <Button className="w-auto" variant="secondary" onClick={() => setDialog("correct")}>Sửa hóa đơn</Button>}
          {allowed.has("Cancel") && <Button className="w-auto" variant="danger" onClick={() => setDialog("cancel")}>Hủy hóa đơn</Button>}
        </div>
      )}
      {dialog === "correct" && <InvoiceCorrectionDialog invoice={invoice} onClose={close} onDone={done} onReload={() => { close(); onReload(); }} />}
      {dialog === "cancel" && <InvoiceCancelDialog invoice={invoice} onClose={close} onDone={done} onReload={() => { close(); onReload(); }} />}
    </>
  );
}
