"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ErrorNotice, Note } from "@/features/operations/ui";
import { InvoiceChangeQuestionDialog } from "./invoice-change-question-dialog";
import type { InvoiceDetail } from "./invoice-list-contracts";
import { vnd } from "./invoice-labels";
import { useInvoiceChange } from "./use-invoice-change";
import s from "./invoice-list.module.css";

type Props = { invoice: InvoiceDetail; onClose(): void; onDone(invoice: InvoiceDetail): void; onReload(): void };

/**
 * Hộp thoại hủy hóa đơn (SALE-08, chỉ Chủ HTX). PHỤ THUỘC nhánh backend chưa gộp feature/OMTS-224-correct-cancel.
 * Hóa đơn chuyển sang Đã hủy và không còn tính vào doanh thu, công nợ, sản lượng đã bán; các lô do hóa đơn này đã đóng được mở lại; khách nhận tin báo hủy.
 * Khoản thanh toán chỉ bị hủy theo khi tiền mặt đang chờ xác nhận được trả lời là đã trả lại khách; các khoản khác được giữ.
 */
export function InvoiceCancelDialog({ invoice, onClose, onDone, onReload }: Props) {
  const [reason, setReason] = useState(""), [problem, setProblem] = useState<string>();
  const change = useInvoiceChange<{ reason: string }>("cancel", invoice, onDone), busy = change.pending;
  const paid = invoice.debtEffect?.covered ?? 0;

  function submit() {
    const text = reason.trim();
    if (!text) { setProblem("Nhập lý do hủy hóa đơn."); return; }
    if (text.length > 500) { setProblem("Lý do tối đa 500 ký tự."); return; }
    setProblem(undefined);
    void change.submit({ reason: text });
  }
  return (
    <>
      <Dialog open title={`Hủy hóa đơn ${invoice.code}`} dismissible={!busy} onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
        <p className="text-sm leading-6 text-text">Hóa đơn {invoice.code} ({vnd(invoice.total)}) sẽ chuyển sang Đã hủy và không còn tính vào doanh thu, công nợ và sản lượng đã bán. Các lô hóa đơn này đã đóng sẽ được mở lại để bán tiếp, và khách sẽ nhận tin báo hủy.</p>
        {paid > 0 && <p className={s.warning}>Hóa đơn đã thu {vnd(paid)}. Các khoản đã thu được giữ lại và hợp tác xã sẽ nợ lại khách số tiền đó, trừ tiền mặt đang chờ xác nhận mà bạn xác nhận là đã trả lại khách.</p>}
        <div className={s.field}><Note label="Lý do hủy (bắt buộc)" maxLength={500} value={reason} disabled={busy} onChange={(e) => { setReason(e.target.value); setProblem(undefined); }} /></div>
        <ErrorNotice error={problem ?? change.error} />
        {change.blocked && <p role="alert" className={s.warning}>Chưa xác nhận được kết quả. <button type="button" className={s.linkButton} onClick={onReload}>Tải lại hóa đơn để đối chiếu</button></p>}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button type="button" className="w-auto" variant="secondary" disabled={busy} onClick={onClose}>Quay lại</Button>
          <Button type="button" className="w-auto" variant="danger" isPending={busy} disabled={change.blocked} onClick={submit}>Hủy hóa đơn</Button>
        </div>
      </Dialog>
      {change.question && <InvoiceChangeQuestionDialog question={change.question} action="cancellation" onAnswer={change.answer} onBack={change.dismissQuestion} />}
    </>
  );
}
