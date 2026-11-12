"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ErrorNotice, Field, Note } from "@/features/operations/ui";
import { buildCorrection, initialCorrection, type CorrectionFields, type CorrectionForm } from "./invoice-correction-form";
import { InvoiceChangeQuestionDialog } from "./invoice-change-question-dialog";
import type { InvoiceDetail } from "./invoice-list-contracts";
import { vnd } from "./invoice-labels";
import { useInvoiceChange } from "./use-invoice-change";
import { managementStyles } from "@/components/ui/management-screen/management-table";
import styles from "@/features/purchase-documents/purchases.module.css";

type Props = { invoice: InvoiceDetail; onClose(): void; onDone(invoice: InvoiceDetail): void; onReload(): void };

/**
 * Hộp thoại giảm giá sau khiếu nại chất lượng (SALE-07.1, Chủ HTX hoặc người được cấp quyền sửa): một khoản trừ vào tổng cộng, các dòng hàng không đổi.
 * Sửa kg, đơn giá, giảm giá, thu khác của hóa đơn dùng màn sửa hóa đơn. Hóa đơn được gửi lại cho khách sau khi giảm giá; công nợ đổi một lần cùng lượt lưu.
 */
export function InvoiceCorrectionDialog({ invoice, onClose, onDone, onReload }: Props) {
  const [form, setForm] = useState<CorrectionForm>(initialCorrection), [problem, setProblem] = useState<string>();
  const change = useInvoiceChange<CorrectionFields>("correct", invoice, onDone), busy = change.pending;
  const patch = (next: Partial<CorrectionForm>) => { setForm((f) => ({ ...f, ...next })); setProblem(undefined); };

  function submit() {
    const built = buildCorrection(form, invoice);
    if ("problem" in built) { setProblem(built.problem); return; }
    void change.submit(built.fields);
  }
  return (
    <>
      <Dialog open title={`Giảm giá sau khiếu nại: hóa đơn ${invoice.code}`} dismissible={!busy} onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
        <div className="mt-3"><Field label="Khoản giảm giá (₫)" inputMode="numeric" value={form.cut} disabled={busy} onChange={(e) => patch({ cut: e.target.value })} />
          <p className={styles.hint}>Tổng cộng hiện tại {vnd(invoice.total)}. Các dòng hàng không thay đổi.</p></div>
        <div className="mt-3"><Note label="Lý do giảm giá (bắt buộc)" maxLength={500} value={form.reason} disabled={busy} onChange={(e) => patch({ reason: e.target.value })} /></div>
        <ErrorNotice error={problem ?? change.error} />
        {change.blocked && <p role="alert" className={styles.warning}>Chưa xác nhận được kết quả. <button type="button" className={managementStyles.linkButton} onClick={onReload}>Tải lại hóa đơn để đối chiếu</button></p>}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button type="button" className="w-auto" variant="secondary" disabled={busy} onClick={onClose}>Đóng</Button>
          <Button type="button" className="w-auto" isPending={busy} disabled={change.blocked} onClick={submit}>Lưu giảm giá</Button>
        </div>
      </Dialog>
      {change.question && <InvoiceChangeQuestionDialog question={change.question} action="correction" onAnswer={change.answer} onBack={change.dismissQuestion} />}
    </>
  );
}
